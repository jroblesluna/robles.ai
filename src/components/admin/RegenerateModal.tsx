import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export const PALETTE_OPTIONS = [
  { value: "tech-blue", label: "Tech Blue" },
  { value: "emerald-green", label: "Emerald Green" },
  { value: "sunset-orange", label: "Sunset Orange" },
  { value: "royal-purple", label: "Royal Purple" },
  { value: "midnight-teal", label: "Midnight Teal" },
  { value: "natural", label: "Natural" },
];

export const STYLE_OPTIONS = [
  { value: "flat-vector", label: "Flat Vector" },
  { value: "3d-isometric", label: "3D Isometric" },
  { value: "cinematic-scene", label: "Cinematic Scene" },
  { value: "data-viz", label: "Data Visualization" },
  { value: "editorial-collage", label: "Editorial Collage" },
];

interface RegenerateModalProps {
  reportId: number;
  /** Position of the slide to regenerate; null keeps the modal closed. */
  position: number | null;
  slideType?: "cover" | "article" | "cta";
  onClose: () => void;
  onRegenerated: () => void;
}

interface GenerationInfo {
  position: number;
  slideType: "cover" | "article" | "cta";
  titleText: string;
  engagementPhrase: string | null;
  palette: string | null;
  imageStyle: string | null;
  storedPrompt: string | null;
  prompt: string;
  isPreview: boolean;
}

export default function RegenerateModal({
  reportId,
  position,
  slideType,
  onClose,
  onRegenerated,
}: RegenerateModalProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [palette, setPalette] = useState<string>("tech-blue");
  const [imageStyle, setImageStyle] = useState<string>("flat-vector");
  const [titleText, setTitleText] = useState<string>("");
  const [engagementPhrase, setEngagementPhrase] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [storedPrompt, setStoredPrompt] = useState<string | null>(null);
  const [effectiveType, setEffectiveType] = useState<"cover" | "article" | "cta">(
    slideType ?? "article"
  );
  // Tracks whether the prompt textarea has been manually edited by the user.
  const [promptDirty, setPromptDirty] = useState(false);

  const isOpen = position !== null;

  // Load generation info whenever the modal opens for a slide.
  useEffect(() => {
    if (position === null) return;

    let cancelled = false;
    setLoading(true);
    setPromptDirty(false);

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/admin/dominical/${reportId}/carousel/slides/${position}/generation-info`
        );
        const data: GenerationInfo = await res.json();
        if (cancelled) return;

        setPalette(data.palette || "tech-blue");
        setImageStyle(data.imageStyle || "flat-vector");
        setTitleText(data.titleText || "");
        setEngagementPhrase(data.engagementPhrase || "");
        setPrompt(data.prompt || "");
        setStoredPrompt(data.storedPrompt);
        setEffectiveType(data.slideType);
      } catch (err: any) {
        if (!cancelled) {
          toast({
            title: "Error loading slide info",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [position, reportId, toast]);

  // Rebuild the prompt from the current palette/style selection.
  // Only overwrites the textarea if the user hasn't manually edited it.
  const rebuildPrompt = useCallback(
    async (nextPalette: string, nextStyle: string, force = false) => {
      if (position === null) return;
      if (promptDirty && !force) return;

      setRebuilding(true);
      try {
        const url =
          `/api/admin/dominical/${reportId}/carousel/slides/${position}/generation-info` +
          `?palette=${encodeURIComponent(nextPalette)}&imageStyle=${encodeURIComponent(nextStyle)}`;
        const res = await apiRequest("GET", url);
        const data: GenerationInfo = await res.json();
        setPrompt(data.prompt || "");
        setPromptDirty(false);
      } catch (err: any) {
        toast({
          title: "Error rebuilding prompt",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setRebuilding(false);
      }
    },
    [position, reportId, promptDirty, toast]
  );

  const handlePaletteChange = (value: string) => {
    setPalette(value);
    rebuildPrompt(value, imageStyle);
  };

  const handleStyleChange = (value: string) => {
    setImageStyle(value);
    rebuildPrompt(palette, value);
  };

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        palette,
        imageStyle,
        customPrompt: prompt,
        titleText,
      };
      // Only send engagementPhrase for article slides.
      if (effectiveType === "article") {
        body.engagementPhrase = engagementPhrase;
      }
      const res = await apiRequest(
        "POST",
        `/api/admin/dominical/${reportId}/carousel/slides/${position}/regenerate`,
        body
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Slide regenerated" });
      onRegenerated();
      onClose();
    },
    onError: (err: Error) => {
      toast({
        title: "Error regenerating slide",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  const isArticle = effectiveType === "article";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            Regenerate Slide {position! + 1}{" "}
            <span className="text-sm font-normal text-muted-foreground capitalize">
              ({effectiveType})
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Style + Palette */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regen-style">Image Style</Label>
                <select
                  id="regen-style"
                  value={imageStyle}
                  onChange={(e) => handleStyleChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regen-palette">Color Palette</Label>
                <select
                  id="regen-palette"
                  value={palette}
                  onChange={(e) => handlePaletteChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PALETTE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title text */}
            <div className="space-y-2">
              <Label htmlFor="regen-title">
                {isArticle ? "Title Text" : "Text"}
              </Label>
              <Input
                id="regen-title"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                placeholder="Slide title..."
              />
            </div>

            {/* Engagement phrase (article slides only) */}
            {isArticle && (
              <div className="space-y-2">
                <Label htmlFor="regen-engagement">
                  Engagement Phrase
                  <span className="ml-2 text-xs text-muted-foreground">
                    (max 80 characters)
                  </span>
                </Label>
                <Input
                  id="regen-engagement"
                  value={engagementPhrase}
                  onChange={(e) => setEngagementPhrase(e.target.value)}
                  placeholder="Provocative question or statement..."
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {engagementPhrase.length}/80
                </p>
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="regen-prompt">
                  Image Prompt
                  <span className="ml-2 text-xs text-muted-foreground">
                    {storedPrompt
                      ? "(prompt used to generate this image)"
                      : "(preview — not yet generated with a stored prompt)"}
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => rebuildPrompt(palette, imageStyle, true)}
                  disabled={rebuilding}
                >
                  {rebuilding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  Rebuild from style/palette
                </Button>
              </div>
              <Textarea
                id="regen-prompt"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setPromptDirty(true);
                }}
                rows={10}
                className="text-xs font-mono leading-relaxed"
                placeholder="The concatenated prompt sent to the image model..."
              />
              <p className="text-xs text-muted-foreground">
                The exact text above is what gets sent to the image model. Edit it
                to fine-tune the result. Changing style or palette rebuilds it
                automatically (unless you've edited it manually — use Rebuild to
                force).
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || loading || !prompt.trim()}
            className="gap-2"
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
