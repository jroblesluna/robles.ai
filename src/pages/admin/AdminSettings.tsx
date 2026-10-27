import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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

const DEFAULT_SETTINGS: Record<string, string> = {
  auto_publish: "true",
  auto_publish_time: "18:00",
  auto_publish_timezone: "America/Lima",
  image_provider: "dalle3",
  google_ads_customer_id: "5850899991",
};

const sectionValidators: Record<string, string> = {
  "Email Delivery": "/api/admin/settings/email/validate",
  "GA4 Data API": "/api/admin/settings/ga4/validate",
  "Google Ads API": "/api/admin/settings/google-ads/validate",
  "Meta Ads": "/api/admin/settings/meta-ads/validate",
  "OpenAI API Key": "/api/admin/settings/openai/validate",
  "Image Generation": "/api/admin/settings/image-provider/validate",
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const savedSettings = useRef<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [metaLoadFailed, setMetaLoadFailed] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [validatingSection, setValidatingSection] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, { valid: boolean; message: string }>>({});

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
        savedSettings.current = data;
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
    setValidationResults({});
  };

  const changedSectionKeys = (keys: string[]) =>
    keys.filter((key) => {
      const current = settings[key] ?? DEFAULT_SETTINGS[key] ?? "";
      const saved = savedSettings.current[key] ?? DEFAULT_SETTINGS[key] ?? "";
      const currentValue = isSecretSettingKey(key) && (isMaskedCredential(current) || (!current.trim() && isMaskedCredential(saved))) ? "__saved_secret__" : current;
      const savedValue = isSecretSettingKey(key) && isMaskedCredential(saved) ? "__saved_secret__" : saved;
      return currentValue !== savedValue;
    });

  const handleSaveSection = async (section: string, keys: string[]) => {
    const changedKeys = changedSectionKeys(keys);
    if (changedKeys.length === 0) return;
    setSavingSection(section);
    try {
      const updates = Object.fromEntries(
        changedKeys.flatMap((key) => {
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
      const data = await refreshed.json();
      savedSettings.current = data;
      setSettings(data);
      setValidationResults((previous) => {
        const next = { ...previous };
        delete next[section];
        return next;
      });

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

  const handleValidateSection = async (section: string, endpoint: string) => {
    setValidatingSection(section);
    setValidationResults((previous) => {
      const next = { ...previous };
      delete next[section];
      return next;
    });
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to validate ${section}`);
      const result = { valid: Boolean(data.valid), message: data.message || (data.valid ? "Credentials are working." : "Credentials could not be verified.") };
      setValidationResults((previous) => ({ ...previous, [section]: result }));
      toast({
        title: result.valid ? `${section} verified` : `${section} validation failed`,
        description: result.message,
        variant: result.valid ? "default" : "destructive",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to validate ${section}`;
      setValidationResults((previous) => ({ ...previous, [section]: { valid: false, message } }));
      toast({ title: "Validation error", description: message, variant: "destructive" });
    } finally {
      setValidatingSection(null);
    }
  };

  const sectionSaveButton = (section: string, keys: string[]) => (
    <div className="space-y-3 border-t pt-4">
      {validationResults[section] && (
        <p role="status" className={`flex items-center gap-2 text-sm ${validationResults[section].valid ? "text-green-700" : "text-red-700"}`}>
          {validationResults[section].valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {validationResults[section].message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {sectionValidators[section] && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleValidateSection(section, sectionValidators[section])}
            disabled={validatingSection !== null || savingSection !== null || loadFailed || changedSectionKeys(keys).length > 0}
          >
            {validatingSection === section ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {validatingSection === section ? "Validating..." : `Validate ${section}`}
          </Button>
        )}
      <Button
        onClick={() => handleSaveSection(section, keys)}
        disabled={savingSection !== null || validatingSection !== null || loadFailed || changedSectionKeys(keys).length === 0}
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
    setMetaValidationResults(null);
  };

  const handleSaveMetaCredentials = async () => {
    const updates = Object.fromEntries(
      Object.entries(metaCredentials)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => [key, value.trim()]),
    );
    if (Object.keys(updates).length === 0) return;
    setMetaSaving(true);
    try {
      const res = await fetch("/api/admin/settings/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to save Meta credentials");

      toast({
        title: "Meta credentials saved",
        description: "Your Meta credentials have been updated successfully.",
      });

      const refreshedSettings = await fetch("/api/admin/settings");
      if (refreshedSettings.ok) {
        const data = await refreshedSettings.json();
        savedSettings.current = data;
        setSettings(data);
      }

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
  const linkedinCredentialsChanged = changedSectionKeys(["linkedin_client_id", "linkedin_client_secret"]).length > 0;
  const canConnectLinkedIn = !loadFailed && !linkedinCredentialsChanged && Boolean(settings.linkedin_client_id && settings.linkedin_client_secret);
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
            <SecretCredentialInput
              id="email_app_password"
              value={settings.email_app_password || ""}
              savedValue={savedSettings.current.email_app_password || ""}
              emptyPlaceholder="Enter Gmail app password"
              onChange={(value) => updateSetting("email_app_password", value)}
            />
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
            <SecretCredentialInput
              id="linkedin_client_secret"
              value={settings.linkedin_client_secret || ""}
              savedValue={savedSettings.current.linkedin_client_secret || ""}
              emptyPlaceholder="Enter LinkedIn Client Secret"
              onChange={(value) => updateSetting("linkedin_client_secret", value)}
            />
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
              <Button onClick={handleConnectLinkedIn} disabled={!canConnectLinkedIn} variant="ghost" size="sm" className="text-green-700 hover:text-green-900 hover:bg-green-100">
                Reconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnectLinkedIn} disabled={!canConnectLinkedIn} variant="outline">
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
                  placeholder={metaStatus.meta_app_id ? credentialPreview(settings.meta_app_id) : "Enter Meta App ID"}
                  value={metaCredentials.meta_app_id}
                  onChange={(e) => updateMetaCredential("meta_app_id", e.target.value)}
                />
                {metaStatus.meta_app_id && !metaCredentials.meta_app_id && (
                  <SavedValueStatus label="Saved" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_app_secret">App Secret</Label>
                <SecretCredentialInput
                  id="meta_app_secret"
                  value={metaCredentials.meta_app_secret}
                  savedValue={savedSettings.current.meta_app_secret || ""}
                  emptyPlaceholder="Enter App Secret"
                  onChange={(value) => updateMetaCredential("meta_app_secret", value)}
                  className="font-mono text-xs"
                />
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
                  placeholder={metaStatus.instagram_business_account_id ? credentialPreview(settings.instagram_business_account_id) : "Enter Business Account ID"}
                  value={metaCredentials.instagram_business_account_id}
                  onChange={(e) => updateMetaCredential("instagram_business_account_id", e.target.value)}
                />
                {metaStatus.instagram_business_account_id && !metaCredentials.instagram_business_account_id && (
                  <SavedValueStatus label="Saved" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_access_token">Access Token</Label>
                <SecretCredentialInput
                  id="instagram_access_token"
                  value={metaCredentials.instagram_access_token}
                  savedValue={savedSettings.current.instagram_access_token || ""}
                  emptyPlaceholder="Enter Access Token"
                  onChange={(value) => updateMetaCredential("instagram_access_token", value)}
                  className="font-mono text-xs"
                />
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
                  placeholder={metaStatus.facebook_page_id ? credentialPreview(settings.facebook_page_id) : "Enter Page ID"}
                  value={metaCredentials.facebook_page_id}
                  onChange={(e) => updateMetaCredential("facebook_page_id", e.target.value)}
                />
                {metaStatus.facebook_page_id && !metaCredentials.facebook_page_id && (
                  <SavedValueStatus label="Saved" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_page_access_token">Page Access Token</Label>
                <SecretCredentialInput
                  id="facebook_page_access_token"
                  value={metaCredentials.facebook_page_access_token}
                  savedValue={savedSettings.current.facebook_page_access_token || ""}
                  emptyPlaceholder="Enter Page Access Token"
                  onChange={(value) => updateMetaCredential("facebook_page_access_token", value)}
                  className="font-mono text-xs"
                />
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
            <Button onClick={handleSaveMetaCredentials} disabled={metaSaving || metaValidating || loadFailed || metaLoadFailed || !Object.values(metaCredentials).some((value) => value.trim())} variant="default">
              {metaSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {metaSaving ? "Saving..." : "Save Credentials"}
            </Button>
            <Button onClick={handleValidateMetaCredentials} disabled={metaValidating || metaSaving || metaLoadFailed || !Object.values(metaStatus).some(Boolean) || Object.values(metaCredentials).some((value) => value.trim())} variant="outline">
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
          <div className="space-y-2"><Label htmlFor="google_ads_client_secret">OAuth client secret</Label><SecretCredentialInput id="google_ads_client_secret" value={settings.google_ads_client_secret || ""} savedValue={savedSettings.current.google_ads_client_secret || ""} emptyPlaceholder="Enter OAuth client secret" onChange={value => updateSetting("google_ads_client_secret", value)} /></div>
          <div className="space-y-2"><Label htmlFor="google_ads_refresh_token">OAuth refresh token</Label><SecretCredentialInput id="google_ads_refresh_token" value={settings.google_ads_refresh_token || ""} savedValue={savedSettings.current.google_ads_refresh_token || ""} emptyPlaceholder="Enter OAuth refresh token" onChange={value => updateSetting("google_ads_refresh_token", value)} /><p className="text-xs text-muted-foreground">Use a refresh token from an authorized OAuth flow for this client and Ads account. A temporary access token or service-account JSON is not a refresh token.</p></div>
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
            <SecretCredentialInput
              id="meta_ads_access_token"
              value={settings.meta_ads_access_token || ""}
              savedValue={savedSettings.current.meta_ads_access_token || ""}
              emptyPlaceholder="Enter Meta Ads access token"
              onChange={(value) => updateSetting("meta_ads_access_token", value)}
            />
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
            <SecretCredentialInput
              id="openai_api_key"
              value={settings.openai_api_key || ""}
              savedValue={savedSettings.current.openai_api_key || ""}
              emptyPlaceholder="Enter OpenAI API key"
              onChange={(value) => updateSetting("openai_api_key", value)}
            />
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
              <SecretCredentialInput
                id="stability_api_key"
                value={settings.stability_api_key || ""}
                savedValue={savedSettings.current.stability_api_key || ""}
                emptyPlaceholder="Enter Stability AI API key"
                onChange={(value) => updateSetting("stability_api_key", value)}
              />
            </div>
          )}

          {imageProvider === "replicate" && (
            <div className="space-y-2">
              <Label htmlFor="replicate_api_token">
                Replicate API Token
              </Label>
              <SecretCredentialInput
                id="replicate_api_token"
                value={settings.replicate_api_token || ""}
                savedValue={savedSettings.current.replicate_api_token || ""}
                emptyPlaceholder="Enter Replicate API token"
                onChange={(value) => updateSetting("replicate_api_token", value)}
              />
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

function isSecretSettingKey(key: string): boolean {
  return /(?:secret|token|api_key|password|credentials)/i.test(key);
}

function credentialPreview(value?: string) {
  if (!value) return "****";
  return /^(?:•{4}|\*{4})/.test(value) ? value : "****" + (value.length > 4 ? value.slice(-4) : "");
}

function SecretCredentialInput({
  id,
  value,
  savedValue,
  emptyPlaceholder,
  onChange,
  className,
}: {
  id: string;
  value: string;
  savedValue: string;
  emptyPlaceholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const hasSavedValue = Boolean(savedValue);
  return (
    <>
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        placeholder={hasSavedValue ? credentialPreview(savedValue) : emptyPlaceholder}
        value={isMaskedCredential(value) ? "" : value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className={className}
      />
      {hasSavedValue && (
        <SavedValueStatus label="Saved credential" />
      )}
    </>
  );
}

function SavedValueStatus({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </p>
  );
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
