import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SlideData {
  position: number;
  titleText: string;
  engagementPhrase: string | null;
  slideType: "cover" | "article" | "cta";
  status: string;
}

interface SlideEditorProps {
  reportId: number;
  slide: SlideData;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function SlideEditor({
  reportId,
  slide,
  isOpen,
  onClose,
  onUpdated,
}: SlideEditorProps) {
  const { toast } = useToast();
  const [titleText, setTitleText] = useState(slide.titleText);
  const [engagementPhrase, setEngagementPhrase] = useState(
    slide.engagementPhrase || ""
  );

  // Sync local state when slide prop changes
  useEffect(() => {
    setTitleText(slide.titleText);
    setEngagementPhrase(slide.engagementPhrase || "");
  }, [slide.titleText, slide.engagementPhrase]);

  const imageUrl = `/api/admin/dominical/${reportId}/carousel/slides/${slide.position}/image`;

  const recomposeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "PUT",
        `/api/admin/dominical/${reportId}/carousel/slides/${slide.position}/text`,
        {
          titleText,
          engagementPhrase: engagementPhrase || undefined,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Slide re-composed successfully" });
      onUpdated();
    },
    onError: (err: Error) => {
      toast({
        title: "Error re-composing slide",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            Edit Slide {slide.position + 1}{" "}
            <span className="text-sm font-normal text-muted-foreground capitalize">
              ({slide.slideType})
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image preview */}
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={`${imageUrl}?t=${Date.now()}`}
              alt={`Slide ${slide.position + 1} preview`}
              className="w-full h-auto max-h-[360px] object-contain bg-gray-900"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Text fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slide-title">Title Text</Label>
              <Input
                id="slide-title"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                placeholder="Article title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slide-engagement">
                Engagement Phrase
                <span className="ml-2 text-xs text-muted-foreground">
                  (max 80 characters)
                </span>
              </Label>
              <Input
                id="slide-engagement"
                value={engagementPhrase}
                onChange={(e) => setEngagementPhrase(e.target.value)}
                placeholder="Provocative question or statement..."
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground text-right">
                {engagementPhrase.length}/80
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => recomposeMutation.mutate()}
            disabled={recomposeMutation.isPending}
            className="gap-2"
          >
            {recomposeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-compose
          </Button>
        </div>
      </div>
    </div>
  );
}
