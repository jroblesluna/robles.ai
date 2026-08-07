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
import { Linkedin, Save, CheckCircle2, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
