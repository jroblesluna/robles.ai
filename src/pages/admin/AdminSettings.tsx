import { useEffect, useState } from "react";
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

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        // Silently fail — status indicators just won't show
      }
    };

    loadMetaStatus();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure integrations and preferences for El Dominical IA.
        </p>
      </div>

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
              placeholder="Enter LinkedIn Client Secret"
              value={settings.linkedin_client_secret || ""}
              onChange={(e) =>
                updateSetting("linkedin_client_secret", e.target.value)
              }
            />
          </div>

          {linkedinConnected ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
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
                  placeholder={metaStatus.meta_app_id ? "••••••• (configured)" : "Enter Meta App ID"}
                  value={metaCredentials.meta_app_id}
                  onChange={(e) => updateMetaCredential("meta_app_id", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_app_secret">App Secret</Label>
                <Input
                  id="meta_app_secret"
                  type="password"
                  placeholder={metaStatus.meta_app_secret ? "••••••• (configured)" : "Enter App Secret"}
                  value={metaCredentials.meta_app_secret}
                  onChange={(e) => updateMetaCredential("meta_app_secret", e.target.value)}
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
                  placeholder={metaStatus.instagram_business_account_id ? "••••••• (configured)" : "Enter Business Account ID"}
                  value={metaCredentials.instagram_business_account_id}
                  onChange={(e) => updateMetaCredential("instagram_business_account_id", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_access_token">Access Token</Label>
                <Input
                  id="instagram_access_token"
                  type="password"
                  placeholder={metaStatus.instagram_access_token ? "••••••• (configured)" : "Enter Access Token"}
                  value={metaCredentials.instagram_access_token}
                  onChange={(e) => updateMetaCredential("instagram_access_token", e.target.value)}
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
                  placeholder={metaStatus.facebook_page_id ? "••••••• (configured)" : "Enter Page ID"}
                  value={metaCredentials.facebook_page_id}
                  onChange={(e) => updateMetaCredential("facebook_page_id", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_page_access_token">Page Access Token</Label>
                <Input
                  id="facebook_page_access_token"
                  type="password"
                  placeholder={metaStatus.facebook_page_access_token ? "••••••• (configured)" : "Enter Page Access Token"}
                  value={metaCredentials.facebook_page_access_token}
                  onChange={(e) => updateMetaCredential("facebook_page_access_token", e.target.value)}
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
          <div className="flex gap-3">
            <Button onClick={handleSaveMetaCredentials} disabled={metaSaving} variant="default">
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
              value={settings.openai_api_key || ""}
              onChange={(e) => updateSetting("openai_api_key", e.target.value)}
            />
          </div>
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
                placeholder="sk-••••••••"
                value={settings.stability_api_key || ""}
                onChange={(e) =>
                  updateSetting("stability_api_key", e.target.value)
                }
              />
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
                placeholder="r8_••••••••"
                value={settings.replicate_api_token || ""}
                onChange={(e) =>
                  updateSetting("replicate_api_token", e.target.value)
                }
              />
            </div>
          )}
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
              checked={settings.auto_publish === "true"}
              onCheckedChange={(checked) =>
                updateSetting("auto_publish", checked ? "true" : "false")
              }
            />
            <Label htmlFor="auto_publish" className="cursor-pointer">
              Auto-publish on Sundays at 12pm (Lima time)
            </Label>
          </div>

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
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
