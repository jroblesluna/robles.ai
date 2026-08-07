import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Linkedin,
  Camera,
  Facebook,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types

type PlatformName = "linkedin" | "instagram" | "facebook";
type PlatformStatus = "not_published" | "publishing" | "published" | "failed";

interface PlatformPublishStatusData {
  reportId: number;
  platform: PlatformName;
  status: PlatformStatus;
  platformPostId: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
}

interface MetaCredentialStatus {
  meta_app_id: boolean;
  meta_app_secret: boolean;
  instagram_business_account_id: boolean;
  instagram_access_token: boolean;
  facebook_page_id: boolean;
  facebook_page_access_token: boolean;
}

interface PlatformPublishStatusProps {
  reportId: number;
}

// Platform configuration

const platformConfig: Record<
  PlatformName,
  {
    label: string;
    icon: React.ElementType;
    iconColor: string;
    credentialKeys: (keyof MetaCredentialStatus)[];
  }
> = {
  linkedin: {
    label: "LinkedIn",
    icon: Linkedin,
    iconColor: "text-blue-600",
    credentialKeys: [], // LinkedIn credentials managed separately
  },
  instagram: {
    label: "Instagram",
    icon: Camera,
    iconColor: "text-pink-600",
    credentialKeys: [
      "meta_app_id",
      "instagram_business_account_id",
      "instagram_access_token",
    ],
  },
  facebook: {
    label: "Facebook",
    icon: Facebook,
    iconColor: "text-blue-500",
    credentialKeys: [
      "meta_app_id",
      "facebook_page_id",
      "facebook_page_access_token",
    ],
  },
};

// Helper to check if a platform has credentials configured

function hasPlatformCredentials(
  platform: PlatformName,
  credentials: MetaCredentialStatus | null | undefined
): boolean {
  // LinkedIn credentials are managed via their own settings (always assumed configured if there's a settings entry)
  if (platform === "linkedin") return true;
  if (!credentials) return false;

  const requiredKeys = platformConfig[platform].credentialKeys;
  return requiredKeys.every((key) => credentials[key] === true);
}

// Status badge rendering

function StatusBadge({ status }: { status: PlatformStatus }) {
  switch (status) {
    case "not_published":
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
          Not Published
        </Badge>
      );
    case "publishing":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Publishing...
        </Badge>
      );
    case "published":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Published
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
  }
}

// Main component

export default function PlatformPublishStatus({
  reportId,
}: PlatformPublishStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusQueryKey = [`/api/admin/dominical/${reportId}/publish-status`];
  const credentialsQueryKey = ["/api/admin/settings/meta"];

  // Fetch platform statuses
  const { data: statuses, isLoading: statusesLoading } = useQuery<
    PlatformPublishStatusData[]
  >({
    queryKey: statusQueryKey,
    refetchInterval: (query) => {
      const data = query.state.data as PlatformPublishStatusData[] | undefined;
      if (data?.some((s) => s.status === "publishing")) return 3000;
      return false;
    },
  });

  // Fetch credential status
  const { data: credentials } = useQuery<MetaCredentialStatus>({
    queryKey: credentialsQueryKey,
  });

  // Publish to single platform mutation
  const publishMutation = useMutation({
    mutationFn: async (platform: PlatformName) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/dominical/${reportId}/publish/${platform}`
      );
      return res.json();
    },
    onSuccess: (_data, platform) => {
      queryClient.refetchQueries({ queryKey: statusQueryKey });
      toast({ title: `Publishing to ${platformConfig[platform].label} started` });
    },
    onError: (err: Error, platform) => {
      toast({
        title: `Error publishing to ${platformConfig[platform].label}`,
        description: err.message,
        variant: "destructive",
      });
      queryClient.refetchQueries({ queryKey: statusQueryKey });
    },
  });

  // Publish to all platforms mutation
  const publishAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/admin/dominical/${reportId}/publish-all`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: statusQueryKey });
      toast({ title: "Publishing to all platforms started" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error publishing to all platforms",
        description: err.message,
        variant: "destructive",
      });
      queryClient.refetchQueries({ queryKey: statusQueryKey });
    },
  });

  // Get status data for a platform (default to not_published if not found)
  function getStatusForPlatform(
    platform: PlatformName
  ): PlatformPublishStatusData {
    const found = statuses?.find((s) => s.platform === platform);
    return (
      found ?? {
        reportId,
        platform,
        status: "not_published",
        platformPostId: null,
        errorMessage: null,
        publishedAt: null,
      }
    );
  }

  // Check if any platform is currently publishing
  const anyPublishing = statuses?.some((s) => s.status === "publishing");

  // Check if there are eligible platforms for "Publish All"
  const hasEligible = (["linkedin", "instagram", "facebook"] as PlatformName[]).some(
    (p) => {
      const status = getStatusForPlatform(p);
      return (
        (status.status === "not_published" || status.status === "failed") &&
        hasPlatformCredentials(p, credentials)
      );
    }
  );

  if (statusesLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Platform Publishing</CardTitle>
          <Button
            size="sm"
            onClick={() => publishAllMutation.mutate()}
            disabled={
              publishAllMutation.isPending || !!anyPublishing || !hasEligible
            }
            className="gap-2"
          >
            {publishAllMutation.isPending || anyPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publish to All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(["linkedin", "instagram", "facebook"] as PlatformName[]).map(
            (platform) => {
              const config = platformConfig[platform];
              const statusData = getStatusForPlatform(platform);
              const hasCredentials = hasPlatformCredentials(
                platform,
                credentials
              );
              const Icon = config.icon;

              return (
                <div
                  key={platform}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  {/* Left: platform icon + name + status badge */}
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                        <StatusBadge status={statusData.status} />
                      </div>
                      {/* Published timestamp */}
                      {statusData.status === "published" &&
                        statusData.publishedAt && (
                          <span className="text-xs text-muted-foreground">
                            Published{" "}
                            {new Date(statusData.publishedAt).toLocaleString()}
                          </span>
                        )}
                      {/* Published post ID */}
                      {statusData.status === "published" &&
                        statusData.platformPostId && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            ID: {statusData.platformPostId}
                          </span>
                        )}
                      {/* Error message */}
                      {statusData.status === "failed" &&
                        statusData.errorMessage && (
                          <span className="text-xs text-red-600">
                            {statusData.errorMessage}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Right: action button */}
                  <div className="flex-shrink-0">
                    {statusData.status === "not_published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => publishMutation.mutate(platform)}
                        disabled={
                          !hasCredentials ||
                          publishMutation.isPending ||
                          !!anyPublishing
                        }
                        title={
                          !hasCredentials
                            ? "Credentials not configured. Go to Settings to configure."
                            : undefined
                        }
                        className="gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}
                    {statusData.status === "publishing" && (
                      <Button size="sm" variant="outline" disabled>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Publishing...
                      </Button>
                    )}
                    {statusData.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => publishMutation.mutate(platform)}
                        disabled={
                          publishMutation.isPending || !!anyPublishing
                        }
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                    {statusData.status === "published" && (
                      <span className="text-xs text-green-600 font-medium">
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />
                        Done
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </CardContent>
    </Card>
  );
}
