import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Linkedin, Save, CheckCircle2, Loader2, XCircle, Camera, ShieldCheck } from "lucide-react";

// 30-minute publish slots: "00:00", "00:30", ..., "23:30"
const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

// Common IANA timezones offered for auto-publish scheduling.
const TIMEZONES: string[] = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "UTC",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [metaLoadFailed, setMetaLoadFailed] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Meta credentials state
  const [metaCredentials, setMetaCredentials] = useState({
    meta_app_id: "",
    meta_app_secret: "",
    instagram_business_account_id: "",
    instagram_access_token: "",
    facebook_page_id: "",
    facebook_page_access_token: "",
  });
  const [metaStatus, setMetaStatus] = useState<Record<string, boolean>>({});
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaValidating, setMetaValidating] = useState(false);
  const [metaValidationResults, setMetaValidationResults] = useState<{
    instagram?: { valid: boolean; error?: string };
    facebook?: { valid: boolean; error?: string };
  } | null>(null);

  // Check for linkedin=connected query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkedin") === "connected") {
      toast({
        title: "LinkedIn Connected",
        description: "Your LinkedIn account has been connected successfully.",
      });
      // Clean up the URL
      window.history.replaceState({}, "", "/admin/settings");
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(data);
      } catch {
        setLoadFailed(true);
        toast({
          title: "Error",
          description: "Failed to load settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Load Meta credential status on mount
  useEffect(() => {
    const loadMetaStatus = async () => {
      try {
        const res = await fetch("/api/admin/settings/meta");
        if (!res.ok) throw new Error("Failed to load Meta status");
        const data = await res.json();
        setMetaStatus(data);
      } catch {
        setMetaLoadFailed(true);
      }
    };

    loadMetaStatus();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSection = async (section: string, keys: string[]) => {
    setSavingSection(section);
    try {
      const updates = Object.fromEntries(
        keys.flatMap((key) => {
          const value = settings[key];
          return value === undefined || isMaskedCredential(value) ? [] : [[key, value]];
        }),
      );
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      const refreshed = await fetch("/api/admin/settings");
      if (!refreshed.ok) throw new Error("Failed to refresh settings");
      setSettings(await refreshed.json());

      toast({
        title: `${section} saved`,
        description: `${section} settings have been updated successfully.`,
      });
    } catch {
      toast({
        title: "Error",
        description: `Failed to save ${section.toLowerCase()} settings.`,
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const sectionSaveButton = (section: string, keys: string[]) => (
    <div className="flex justify-end border-t pt-4">
      <Button
        onClick={() => handleSaveSection(section, keys)}
        disabled={savingSection !== null || loadFailed}
        size="sm"
      >
        {savingSection === section ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {savingSection === section ? "Saving..." : `Save ${section}`}
      </Button>
    </div>
  );

  const handleConnectLinkedIn = async () => {
    try {
      const res = await fetch("/api/admin/linkedin/auth-url");
      if (!res.ok) throw new Error("Failed to get auth URL");
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      toast({
        title: "Error",
        description:
          "Failed to start LinkedIn connection. Make sure client_id and client_secret are saved.",
        variant: "destructive",
      });
    }
  };

  const updateMetaCredential = (key: string, value: string) => {
    setMetaCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveMetaCredentials = async () => {
    setMetaSaving(true);
    try {
      const res = await fetch("/api/admin/settings/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaCredentials),
      });

      if (!res.ok) throw new Error("Failed to save Meta credentials");

      toast({
        title: "Meta credentials saved",
        description: "Your Meta credentials have been updated successfully.",
      });

      const refreshedSettings = await fetch("/api/admin/settings");
      if (refreshedSettings.ok) setSettings(await refreshedSettings.json());

      // Refresh status
      const statusRes = await fetch("/api/admin/settings/meta");
      if (statusRes.ok) {
        const data = await statusRes.json();
        setMetaStatus(data);
      }

      // Clear the form fields (credentials are stored server-side)
      setMetaCredentials({
        meta_app_id: "",
        meta_app_secret: "",
        instagram_business_account_id: "",
        instagram_access_token: "",
        facebook_page_id: "",
        facebook_page_access_token: "",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save Meta credentials.",
        variant: "destructive",
      });
    } finally {
      setMetaSaving(false);
    }
  };

  const handleValidateMetaCredentials = async () => {
    setMetaValidating(true);
    setMetaValidationResults(null);
    try {
      const res = await fetch("/api/admin/settings/meta/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to validate credentials");

      const data = await res.json();
      setMetaValidationResults(data);

      if (data.instagram?.valid && data.facebook?.valid) {
        toast({
          title: "Credentials valid",
          description: "All Meta credentials are working correctly.",
        });
      } else {
        toast({
          title: "Validation issues found",
          description: "Some credentials failed validation. See details below.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to validate Meta credentials. Make sure credentials are saved first.",
        variant: "destructive",
      });
    } finally {
      setMetaValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const linkedinConnected = !!settings.linkedin_access_token;
  const imageProvider = settings.image_provider || "dalle3";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Configure integrations and preferences for El Dominical IA.
        </p>
      </div>

      {loadFailed && <p role="alert" className="rounded-md border border-red-200 p-4 text-sm text-red-700">Settings could not be loaded. Reload before editing; saving is disabled to protect existing values.</p>}
      <Card>
        <CardHeader>
          <CardTitle>Email delivery</CardTitle>
          <CardDescription>
            Configure the Gmail account used for contact forms, applications, quiz verification, course requests, chat transcripts and Dominical notifications. Production uses these saved settings, not .env.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email_user">Gmail account</Label>
            <Input
              id="email_user"
              type="email"
              autoComplete="email"
              placeholder="sender@example.com"
              value={settings.email_user || ""}
              onChange={(e) => updateSetting("email_user", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_app_password">Gmail app password</Label>
            <Input
              id="email_app_password"
              type="password"
              autoComplete="new-password"
              placeholder={settings.email_app_password ? "Saved — enter a new value to replace" : "Enter Gmail app password"}
              value={isMaskedCredential(settings.email_app_password) ? "" : settings.email_app_password || ""}
              onChange={(e) => updateSetting("email_app_password", e.target.value)}
            />
            {settings.email_app_password && <p className="break-words text-xs text-muted-foreground">Saved: {credentialPreview(settings.email_app_password)}. The full value is never returned to the browser.</p>}
            <p className="text-xs text-muted-foreground">Use a Google App Password (requires 2-Step Verification), not your normal Google account password.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_to">Contact and notification recipient</Label>
            <Input
              id="email_to"
              type="email"
              autoComplete="email"
              placeholder="team@example.com"
              value={settings.email_to || ""}
              onChange={(e) => updateSetting("email_to", e.target.value)}
            />
          </div>
          {sectionSaveButton("Email Delivery", ["email_user", "email_app_password", "email_to"])}
        </CardContent>
      </Card>
      {/* LinkedIn Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            LinkedIn Integration
          </CardTitle>
          <CardDescription>
            Connect your LinkedIn account to publish posts directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin_client_id">Client ID</Label>
            <Input
              id="linkedin_client_id"
              type="text"
              placeholder="Enter LinkedIn Client ID"
              value={settings.linkedin_client_id || ""}
              onChange={(e) =>
                updateSetting("linkedin_client_id", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_client_secret">Client Secret</Label>
            <Input
              id="linkedin_client_secret"
              type="password"
              autoComplete="new-password"
              placeholder={settings.linkedin_client_secret ? `${credentialPreview(settings.linkedin_client_secret)} — saved; paste to replace` : "Enter LinkedIn Client Secret"}
              value={isMaskedCredential(settings.linkedin_client_secret) ? "" : settings.linkedin_client_secret || ""}
              onChange={(e) =>
                updateSetting("linkedin_client_secret", e.target.value)
              }
            />
            {settings.linkedin_client_secret && <p className="break-words text-xs text-muted-foreground">Saved: {credentialPreview(settings.linkedin_client_secret)}. Enter a new value only to replace it.</p>}
          </div>

          {linkedinConnected ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  LinkedIn connected
                  {settings.linkedin_token_expires_at && (
                    <> &middot; Expires: {new Date(settings.linkedin_token_expires_at).toLocaleDateString()}</>
                  )}
                </span>
              </div>
              <Button onClick={handleConnectLinkedIn} variant="ghost" size="sm" className="text-green-700 hover:text-green-900 hover:bg-green-100">
                Reconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnectLinkedIn} variant="outline">
              <Linkedin className="mr-2 h-4 w-4" />
              Connect LinkedIn
            </Button>
          )}
          {sectionSaveButton("LinkedIn", ["linkedin_client_id", "linkedin_client_secret"])}
        </CardContent>
      </Card>

      {/* Meta (Instagram & Facebook) Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Meta (Instagram &amp; Facebook)
          </CardTitle>
          <CardDescription>
            Configure credentials for publishing to Instagram and Facebook via Meta Graph API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {metaLoadFailed && <p role="alert" className="text-sm text-red-700">Credential status could not be verified. Reload before replacing credentials.</p>}
          {/* Status indicators */}
          <div className="flex flex-wrap gap-3">
            {[
              { key: "meta_app_id", label: "App ID" },
              { key: "meta_app_secret", label: "App Secret" },
              { key: "instagram_business_account_id", label: "IG Account" },
              { key: "instagram_access_token", label: "IG Token" },
              { key: "facebook_page_id", label: "FB Page ID" },
              { key: "facebook_page_access_token", label: "FB Token" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  metaStatus[key]
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {metaStatus[key] ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {label}
              </div>
            ))}
          </div>

          {/* App Credentials */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">App Credentials</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta_app_id">Meta App ID</Label>
                <Input
                  id="meta_app_id"
                  type="text"
                  placeholder={metaStatus.meta_app_id ? `${credentialPreview(settings.meta_app_id)} — saved; paste to replace` : "Enter Meta App ID"}
                  value={metaCredentials.meta_app_id}
                  onChange={(e) => updateMetaCredential("meta_app_id", e.target.value)}
                />
                {metaStatus.meta_app_id && !metaCredentials.meta_app_id && (
                  <p className="text-xs text-green-600">✓ Saved. Leave blank to keep current value.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_app_secret">App Secret</Label>
                <Input
                  id="meta_app_secret"
                  type="password"
                  placeholder={metaStatus.meta_app_secret ? `${credentialPreview(settings.meta_app_secret)} — saved; paste to replace` : "Enter App Secret"}
                  value={metaCredentials.meta_app_secret}
                  onChange={(e) => updateMetaCredential("meta_app_secret", e.target.value)}
                  className="font-mono text-xs"
                />
                {metaStatus.meta_app_secret && !metaCredentials.meta_app_secret && (
                  <p className="text-xs text-green-600">✓ Saved. Leave blank to keep current value.</p>
                )}
              </div>
            </div>
          </div>

          {/* Instagram Credentials */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Instagram</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram_business_account_id">Business Account ID</Label>
                <Input
                  id="instagram_business_account_id"
                  type="text"
                  placeholder={metaStatus.instagram_business_account_id ? `${credentialPreview(settings.instagram_business_account_id)} — saved; paste to replace` : "Enter Business Account ID"}
                  value={metaCredentials.instagram_business_account_id}
                  onChange={(e) => updateMetaCredential("instagram_business_account_id", e.target.value)}
                />
                {metaStatus.instagram_business_account_id && !metaCredentials.instagram_business_account_id && (
                  <p className="text-xs text-green-600">✓ Saved. Leave blank to keep current value.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_access_token">Access Token</Label>
                <Input
                  id="instagram_access_token"
                  type="password"
                  placeholder={metaStatus.instagram_access_token ? `${credentialPreview(settings.instagram_access_token)} — saved; paste to replace` : "Enter Access Token"}
                  value={metaCredentials.instagram_access_token}
                  onChange={(e) => updateMetaCredential("instagram_access_token", e.target.value)}
                  className="font-mono text-xs"
                />
                {metaStatus.instagram_access_token && !metaCredentials.instagram_access_token && (
                  <p className="text-xs text-green-600">✓ Saved. Leave blank to keep current value.</p>
                )}
              </div>
            </div>
          </div>

          {/* Facebook Credentials */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Facebook</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook_page_id">Page ID</Label>
                <Input
                  id="facebook_page_id"
                  type="text"
                  placeholder={metaStatus.facebook_page_id ? `${credentialPreview(settings.facebook_page_id)} — saved; paste to replace` : "Enter Page ID"}
                  value={metaCredentials.facebook_page_id}
                  onChange={(e) => updateMetaCredential("facebook_page_id", e.target.value)}
                />
                {metaStatus.facebook_page_id && !metaCredentials.facebook_page_id && (
                  <p className="text-xs text-green-600">✓ Saved. Leave blank to keep current value.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_page_access_token">Page Access Token</Label>
                <Input
                  id="facebook_page_access_token"
                  type="password"
                  placeholder={metaStatus.facebook_page_access_token ? `${credentialPreview(settings.facebook_page_access_token)} — saved; paste to replace` : "Enter Page Access Token"}
                  value={metaCredentials.facebook_page_access_token}
                  onChange={(e) => updateMetaCredential("facebook_page_access_token", e.target.value)}
                  className="font-mono text-xs"
                />
                {metaStatus.facebook_page_access_token && !metaCredentials.facebook_page_access_token && (
                  <p className="text-xs text-green-600">✓ Saved. Leave blank to keep current value.</p>
                )}
              </div>
            </div>
          </div>

          {/* Validation Results */}
          {metaValidationResults && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm">
                {metaValidationResults.instagram?.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={metaValidationResults.instagram?.valid ? "text-green-700" : "text-red-700"}>
                  Instagram: {metaValidationResults.instagram?.valid ? "Connected" : metaValidationResults.instagram?.error || "Invalid credentials"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {metaValidationResults.facebook?.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={metaValidationResults.facebook?.valid ? "text-green-700" : "text-red-700"}>
                  Facebook: {metaValidationResults.facebook?.valid ? "Connected" : metaValidationResults.facebook?.error || "Invalid credentials"}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveMetaCredentials} disabled={metaSaving || loadFailed || metaLoadFailed} variant="default">
              {metaSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {metaSaving ? "Saving..." : "Save Credentials"}
            </Button>
            <Button onClick={handleValidateMetaCredentials} disabled={metaValidating} variant="outline">
              {metaValidating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {metaValidating ? "Validating..." : "Validate Credentials"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics & Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Tracking</CardTitle>
          <CardDescription>
            Configure website analytics. Leave empty to disable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga4_measurement_id">Google Analytics 4 Measurement ID</Label>
            <Input
              id="ga4_measurement_id"
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={settings.ga4_measurement_id || ""}
              onChange={(e) => updateSetting("ga4_measurement_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find it in Google Analytics → Admin → Data Streams → your stream
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_pixel_id">Meta Pixel ID</Label>
            <Input
              id="meta_pixel_id"
              type="text"
              placeholder="123456789012345"
              value={settings.meta_pixel_id || ""}
              onChange={(e) => updateSetting("meta_pixel_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find it in Meta Events Manager → your pixel → Settings
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gtm_container_id">Google Tag Manager Container ID</Label>
            <Input
              id="gtm_container_id"
              type="text"
              placeholder="GTM-XXXXXXX"
              value={settings.gtm_container_id || ""}
              onChange={(e) => updateSetting("gtm_container_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find it in tagmanager.google.com → your container → Container ID
            </p>
          </div>
          {sectionSaveButton("Analytics & Tracking", ["ga4_measurement_id", "meta_pixel_id", "gtm_container_id"])}
        </CardContent>
      </Card>


      {/* GA4 Data API (Dashboard) */}
      <Card>
        <CardHeader>
          <CardTitle>GA4 Data API (Dashboard)</CardTitle>
          <CardDescription>
            Configure the GA4 Data API for the analytics dashboard. This is separate from the Measurement ID above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga4_property_id">GA4 Property ID (numeric)</Label>
            <Input
              id="ga4_property_id"
              type="text"
              placeholder="123456789"
              value={settings.ga4_property_id || ""}
              onChange={(e) => updateSetting("ga4_property_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The numeric Property ID. Find it in Google Analytics &rarr; Admin &rarr; Property Settings.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Service Account JSON</Label>
            <Ga4ServiceAccountUpload />
          </div>
          {sectionSaveButton("GA4 Data API", ["ga4_property_id"])}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Google Ads API (Analytics)</CardTitle>
          <CardDescription>Direct campaign spend, clicks, status and attributed conversions. The dashboard uses read-only API requests. GA4 remains a separate source for website behavior and submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="google_ads_customer_id">Google Ads customer ID</Label><Input id="google_ads_customer_id" placeholder="5850899991" value={settings.google_ads_customer_id || "5850899991"} onChange={e => updateSetting("google_ads_customer_id", e.target.value)} /><p className="text-xs text-muted-foreground">Selects the account for direct reports and GA4 attribution filters. Use the 10-digit account ID.</p></div>
          <div className="space-y-2"><Label htmlFor="google_ads_client_id">OAuth client ID</Label><Input id="google_ads_client_id" value={settings.google_ads_client_id || ""} onChange={e => updateSetting("google_ads_client_id", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="google_ads_client_secret">OAuth client secret</Label><Input id="google_ads_client_secret" type="password" autoComplete="new-password" placeholder={settings.google_ads_client_secret ? `${credentialPreview(settings.google_ads_client_secret)} — saved; paste to replace` : ""} value={isMaskedCredential(settings.google_ads_client_secret) ? "" : settings.google_ads_client_secret || ""} onChange={e => updateSetting("google_ads_client_secret", e.target.value)} />{settings.google_ads_client_secret && <p className="text-xs text-muted-foreground">Saved: {credentialPreview(settings.google_ads_client_secret)}. Enter a new value only to replace it.</p>}</div>
          <div className="space-y-2"><Label htmlFor="google_ads_refresh_token">OAuth refresh token</Label><Input id="google_ads_refresh_token" type="password" autoComplete="new-password" placeholder={settings.google_ads_refresh_token ? `${credentialPreview(settings.google_ads_refresh_token)} — saved; paste to replace` : ""} value={isMaskedCredential(settings.google_ads_refresh_token) ? "" : settings.google_ads_refresh_token || ""} onChange={e => updateSetting("google_ads_refresh_token", e.target.value)} /><p className="text-xs text-muted-foreground">Use a refresh token from an authorized OAuth flow for this client and Ads account. A temporary access token or service-account JSON is not a refresh token. Saved secrets remain masked.</p>{settings.google_ads_refresh_token && <p className="text-xs text-muted-foreground">Saved: {credentialPreview(settings.google_ads_refresh_token)}. Enter a new value only to replace it.</p>}</div>
          <div className="space-y-2"><Label htmlFor="google_ads_login_customer_id">Manager account ID (optional)</Label><Input id="google_ads_login_customer_id" value={settings.google_ads_login_customer_id || ""} onChange={e => updateSetting("google_ads_login_customer_id", e.target.value)} /><p className="text-xs text-muted-foreground">Leave empty when the authorized user accesses the customer account directly.</p></div>
          <p className="text-sm text-muted-foreground">Save this section, then open Analytics → Ads and use Refresh to verify the connection. With no direct API credentials, reports use the GA4 import and clearly identify that source.</p>
          {sectionSaveButton("Google Ads API", ["google_ads_customer_id", "google_ads_client_id", "google_ads_client_secret", "google_ads_refresh_token", "google_ads_login_customer_id"])}
        </CardContent>
      </Card>

      {/* Calendar booking link — "Book a call" buttons on /get-started */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar booking</CardTitle>
          <CardDescription>
            Public scheduling link (Google Calendar appointment page, Calendly, Cal.com…). When set, /get-started shows
            &ldquo;Book a 30-minute call&rdquo; buttons and tracks clicks as <code>contact_click</code> (calendar).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking_url">Booking URL</Label>
            <Input
              id="booking_url"
              type="url"
              placeholder="https://calendar.app.google/…"
              value={settings.booking_url || ""}
              onChange={(e) => updateSetting("booking_url", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Must start with https://. Leave empty to use the default (PUBLIC_CONTACT.bookingUrl in shared/publicContent.ts).</p>
          </div>
          {sectionSaveButton("Calendar Booking", ["booking_url"])}
        </CardContent>
      </Card>

      {/* Meta Ads (Marketing API) — used by Analytics → Ads */}
      <Card>
        <CardHeader>
          <CardTitle>Meta Ads (Analytics)</CardTitle>
          <CardDescription>
            Read-only access to the Meta ad account so Analytics &rarr; Ads can show spend, clicks and leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta_ad_account_id">Ad Account ID</Label>
            <Input
              id="meta_ad_account_id"
              type="text"
              placeholder="act_1234567890"
              value={settings.meta_ad_account_id || ""}
              onChange={(e) => updateSetting("meta_ad_account_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find it in Meta Business Settings &rarr; Accounts &rarr; Ad accounts.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_ads_access_token">Access token (ads_read)</Label>
            <Input
              id="meta_ads_access_token"
              type="password"
              placeholder={settings.meta_ads_access_token ? `${credentialPreview(settings.meta_ads_access_token)} — saved; paste to replace` : "EAAB••••••••"}
              value={isMaskedCredential(settings.meta_ads_access_token) ? "" : settings.meta_ads_access_token || ""}
              onChange={(e) => updateSetting("meta_ads_access_token", e.target.value)}
            />
            {settings.meta_ads_access_token && <p className="break-words text-xs text-muted-foreground">Saved: {credentialPreview(settings.meta_ads_access_token)}. Enter a new value only to replace it.</p>}
            <p className="text-xs text-muted-foreground">
              Use a System User token with the <code>ads_read</code> permission and access to the ad account. The Page and
              Instagram tokens above cannot read ad accounts.
            </p>
          </div>
          {sectionSaveButton("Meta Ads", ["meta_ad_account_id", "meta_ads_access_token"])}
        </CardContent>
      </Card>

      {/* OpenAI API Key */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI API Key</CardTitle>
          <CardDescription>
            Used for news scoring and post generation with GPT-4o.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="openai_api_key">API Key</Label>
            <Input
              id="openai_api_key"
              type="password"
              placeholder="sk-••••••••"
              value={isMaskedCredential(settings.openai_api_key) ? "" : settings.openai_api_key || ""}
              onChange={(e) => updateSetting("openai_api_key", e.target.value)}
            />
            {settings.openai_api_key && <p className="break-words text-xs text-muted-foreground">Saved: {credentialPreview(settings.openai_api_key)}. Enter a new value only to replace it.</p>}
          </div>
          {sectionSaveButton("OpenAI API Key", ["openai_api_key"])}
        </CardContent>
      </Card>

      {/* Image Generation Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Image Generation Provider</CardTitle>
          <CardDescription>
            Choose which provider to use for generating Dominical cover images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image_provider">Provider</Label>
            <select
              id="image_provider"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={imageProvider}
              onChange={(e) => updateSetting("image_provider", e.target.value)}
            >
              <option value="dalle3">DALL-E 3 (OpenAI)</option>
              <option value="stability">Stability AI</option>
              <option value="replicate">Replicate FLUX</option>
            </select>
          </div>

          {imageProvider === "stability" && (
            <div className="space-y-2">
              <Label htmlFor="stability_api_key">Stability AI API Key</Label>
              <Input
                id="stability_api_key"
                type="password"
                placeholder={settings.stability_api_key ? `${credentialPreview(settings.stability_api_key)} — saved; paste to replace` : "sk-••••••••"}
                value={isMaskedCredential(settings.stability_api_key) ? "" : settings.stability_api_key || ""}
                onChange={(e) =>
                  updateSetting("stability_api_key", e.target.value)
                }
              />
            {settings.stability_api_key && <p className="break-words text-xs text-muted-foreground">Saved: {credentialPreview(settings.stability_api_key)}. Enter a new value only to replace it.</p>}
            </div>
          )}

          {imageProvider === "replicate" && (
            <div className="space-y-2">
              <Label htmlFor="replicate_api_token">
                Replicate API Token
              </Label>
              <Input
                id="replicate_api_token"
                type="password"
                placeholder={settings.replicate_api_token ? `${credentialPreview(settings.replicate_api_token)} — saved; paste to replace` : "r8_••••••••"}
                value={isMaskedCredential(settings.replicate_api_token) ? "" : settings.replicate_api_token || ""}
                onChange={(e) =>
                  updateSetting("replicate_api_token", e.target.value)
                }
              />
            {settings.replicate_api_token && <p className="break-words text-xs text-muted-foreground">Saved: {credentialPreview(settings.replicate_api_token)}. Enter a new value only to replace it.</p>}
            </div>
          )}
          {sectionSaveButton("Image Generation", ["image_provider", "stability_api_key", "replicate_api_token"])}
        </CardContent>
      </Card>

      {/* Dominical Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dominical Preferences</CardTitle>
          <CardDescription>
            Configure how El Dominical IA generates and publishes weekly posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification_email">Notification Email</Label>
            <Input
              id="notification_email"
              type="email"
              placeholder="antonio@robles.ai"
              value={settings.notification_email || ""}
              onChange={(e) =>
                updateSetting("notification_email", e.target.value)
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto_publish"
              checked={settings.auto_publish !== "false"}
              onCheckedChange={(checked) =>
                updateSetting("auto_publish", checked ? "true" : "false")
              }
            />
            <Label htmlFor="auto_publish" className="cursor-pointer">
              Auto-publish every Sunday
            </Label>
          </div>

          {settings.auto_publish !== "false" && (
            <div className="grid gap-4 sm:grid-cols-2 rounded-md border p-4">
              <div className="space-y-2">
                <Label htmlFor="auto_publish_time">Publish time</Label>
                <select
                  id="auto_publish_time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.auto_publish_time || "18:00"}
                  onChange={(e) =>
                    updateSetting("auto_publish_time", e.target.value)
                  }
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  The report is published on Sunday at this time (in the timezone below).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_publish_timezone">Timezone</Label>
                <select
                  id="auto_publish_timezone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.auto_publish_timezone || "America/Lima"}
                  onChange={(e) =>
                    updateSetting("auto_publish_timezone", e.target.value)
                  }
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dominical_top_n">
              Number of news to select (3-7)
            </Label>
            <Input
              id="dominical_top_n"
              type="number"
              min={3}
              max={7}
              placeholder="5"
              value={settings.dominical_top_n || ""}
              onChange={(e) =>
                updateSetting("dominical_top_n", e.target.value)
              }
            />
          </div>
          {sectionSaveButton("Dominical Preferences", ["notification_email", "auto_publish", "auto_publish_time", "auto_publish_timezone", "dominical_top_n"])}
        </CardContent>
      </Card>
    </div>
  );
}

function isMaskedCredential(value?: string): boolean {
  return Boolean(value && /^(?:•{4}|\*{4})/.test(value));
}

function credentialPreview(value?: string) {
  if (!value) return "****";
  return /^(?:•{4}|\*{4})/.test(value) ? value : "****" + (value.length > 4 ? value.slice(-4) : "");
}

function Ga4ServiceAccountUpload() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"unknown" | "configured" | "not_configured">("unknown");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/ga4-status")
      .then((r) => r.json())
      .then((data) => setStatus(data.hasCredentials ? "configured" : "not_configured"))
      .catch(() => setStatus("unknown"));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/admin/settings/ga4-service-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setStatus("configured");
      toast({ title: "Success", description: "Service account credentials saved." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={fileInput} aria-label="GA4 service account JSON" type="file" accept=".json" className="hidden" onChange={handleUpload} disabled={uploading} />
      <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : "Upload JSON"}</Button>
      {status === "configured" && (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> •••••••• · Configured
        </span>
      )}
      {status === "not_configured" && (
        <span className="flex items-center gap-1 text-sm text-amber-600">
          <XCircle className="h-4 w-4" /> Not configured
        </span>
      )}
    </div>
  );
}
