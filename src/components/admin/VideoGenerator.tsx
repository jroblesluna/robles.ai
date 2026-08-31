import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Download, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VideoStatusData {
  status: "not_generated" | "generating" | "generated" | "failed";
  error: string | null;
  scriptPreview: string | null;
}

interface VideoGeneratorProps {
  reportId: number;
}

// Purely cosmetic — there's no granular server-side progress to report, so
// this just rotates through flavor text while status stays "generating",
// the same way ChatGPT varies its "thinking" filler instead of one static line.
const GENERATING_MESSAGES = [
  "Robly is writing today's script…",
  "Warming up the voice synthesizer…",
  "Teaching Robly to talk…",
  "Listening for when Robly should speak…",
  "Painting a background scene…",
  "Rendering animation frames…",
  "Assembling the final video…",
  "Polishing the whiteboard captions…",
  "Almost there…",
];

function useRotatingMessage(active: boolean, messages: string[], intervalMs = 2800): string {
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    if (!active) return;
    setMessage(messages[Math.floor(Math.random() * messages.length)]);
    const id = setInterval(() => {
      setMessage((prev) => {
        if (messages.length <= 1) return prev;
        let next = prev;
        while (next === prev) {
          next = messages[Math.floor(Math.random() * messages.length)];
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return message;
}

export default function VideoGenerator({ reportId }: VideoGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const videoQueryKey = [`/api/admin/dominical/${reportId}/video`];

  const { data: video, isLoading } = useQuery<VideoStatusData>({
    queryKey: videoQueryKey,
    refetchInterval: (query) => {
      const data = query.state.data as VideoStatusData | undefined;
      return data?.status === "generating" ? 2000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/dominical/${reportId}/generate-video`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: videoQueryKey });
      toast({ title: "Video generation started" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error generating video",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const status = video?.status || "not_generated";
  const fileUrl = `/api/admin/dominical/${reportId}/video/file`;
  const generatingMessage = useRotatingMessage(status === "generating", GENERATING_MESSAGES);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <VideoIcon className="h-4 w-4 text-primary" />
          Video Summary
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={status === "generating" || generateMutation.isPending}
          className="gap-2"
        >
          {status === "generating" || generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {status === "generated" ? "Regenerate Video" : "Generate Video"}
        </Button>
      </div>

      {!isLoading && status === "failed" && video?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {video.error}
        </div>
      )}

      {status === "generating" && (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
          {generatingMessage}
        </Badge>
      )}

      {status === "not_generated" && (
        <p className="text-sm text-muted-foreground">
          No video generated yet for this report.
        </p>
      )}

      {status === "generated" && (
        <div className="space-y-2">
          <video controls className="w-full max-w-sm rounded-lg border" src={fileUrl} />
          <a
            href={fileUrl}
            download={`dominical-video-${reportId}.mp4`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download mp4
          </a>
          {video?.scriptPreview && (
            <p className="text-xs text-muted-foreground">Script: {video.scriptPreview}</p>
          )}
        </div>
      )}
    </div>
  );
}
