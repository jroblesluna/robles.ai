import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Sparkles, X, Download, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CarouselSlide {
  id: number;
  position: number;
  slideType: "cover" | "article" | "cta";
  articleSlug: string | null;
  titleText: string;
  engagementPhrase: string | null;
  backgroundImagePath: string | null;
  compositeImagePath: string | null;
  status: "pending" | "generating" | "generated" | "failed";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface CarouselMetadata {
  reportId: number;
  status: "not_generated" | "generating" | "completed" | "partial" | "pending";
  slideCount: number;
  slides: CarouselSlide[];
}

interface CarouselPreviewProps {
  reportId: number;
  onEditSlide?: (slide: CarouselSlide) => void;
}

const statusBadgeConfig: Record<
  CarouselSlide["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Queued",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  generating: {
    label: "Generating...",
    className: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
  },
  generated: {
    label: "Ready",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export default function CarouselPreview({ reportId, onEditSlide }: CarouselPreviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enlargedSlide, setEnlargedSlide] = useState<CarouselSlide | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string>("tech-blue");
  const [selectedStyle, setSelectedStyle] = useState<string>("flat-vector");

  const palettes = [
    { value: "tech-blue", label: "Tech Blue" },
    { value: "emerald-green", label: "Emerald Green" },
    { value: "sunset-orange", label: "Sunset Orange" },
    { value: "royal-purple", label: "Royal Purple" },
    { value: "midnight-teal", label: "Midnight Teal" },
    { value: "natural", label: "Natural" },
  ];

  const imageStyles = [
    { value: "flat-vector", label: "Flat Vector" },
    { value: "3d-isometric", label: "3D Isometric" },
    { value: "cinematic-scene", label: "Cinematic Scene" },
    { value: "data-viz", label: "Data Visualization" },
    { value: "editorial-collage", label: "Editorial Collage" },
  ];

  const carouselQueryKey = [`/api/admin/dominical/${reportId}/carousel`];

  const {
    data: carousel,
    isLoading,
    error,
  } = useQuery<CarouselMetadata>({
    queryKey: carouselQueryKey,
    refetchInterval: (query) => {
      // Poll while generating
      const data = query.state.data as CarouselMetadata | undefined;
      if (data?.status === "generating") return 2000;
      return false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/admin/dominical/${reportId}/generate-carousel`,
        { palette: selectedPalette, imageStyle: selectedStyle }
      );
      return res.json();
    },
    onSuccess: () => {
      // Force immediate refetch (not just invalidate) so polling kicks in
      queryClient.refetchQueries({ queryKey: carouselQueryKey });
      toast({ title: "Carousel generation started" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error generating carousel",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (position: number) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/dominical/${reportId}/carousel/slides/${position}/regenerate`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: carouselQueryKey });
      toast({ title: "Slide regenerated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error regenerating slide",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const getSlideImageUrl = (slide: CarouselSlide) => {
    if (slide.status !== "generated") return null;
    // Cache-bust with updatedAt to ensure browser loads fresh image after regeneration
    const cacheBuster = slide.updatedAt || slide.createdAt || Date.now();
    return `/api/admin/dominical/${reportId}/carousel/slides/${slide.position}/image?t=${encodeURIComponent(cacheBuster)}`;
  };

  const getSlideLabel = (slide: CarouselSlide) => {
    switch (slide.slideType) {
      case "cover":
        return "Cover";
      case "cta":
        return "CTA";
      case "article":
        return slide.titleText.length > 30
          ? slide.titleText.slice(0, 30) + "..."
          : slide.titleText;
    }
  };

  const navigateSlide = (direction: 'prev' | 'next') => {
    if (!enlargedSlide || !carousel) return;
    const generatedSlides = carousel.slides.filter(s => s.status === 'generated');
    const currentIndex = generatedSlides.findIndex(s => s.id === enlargedSlide.id);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      setEnlargedSlide(generatedSlides[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < generatedSlides.length - 1) {
      setEnlargedSlide(generatedSlides[currentIndex + 1]);
    }
  };

  const isFirstSlide = () => {
    if (!enlargedSlide || !carousel) return true;
    const generatedSlides = carousel.slides.filter(s => s.status === 'generated');
    return generatedSlides.findIndex(s => s.id === enlargedSlide.id) === 0;
  };

  const isLastSlide = () => {
    if (!enlargedSlide || !carousel) return true;
    const generatedSlides = carousel.slides.filter(s => s.status === 'generated');
    const currentIndex = generatedSlides.findIndex(s => s.id === enlargedSlide.id);
    return currentIndex === generatedSlides.length - 1;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error loading carousel: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const hasSlides = carousel && carousel.slides.length > 0;
  const isGenerating = carousel?.status === "generating";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">LinkedIn Carousel</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {imageStyles.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={selectedPalette}
            onChange={(e) => setSelectedPalette(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {palettes.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isGenerating}
            className="gap-2"
          >
            {generateMutation.isPending || isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {hasSlides ? "Regenerate Carousel" : "Generate Carousel"}
          </Button>
        </div>
      </div>

      {/* Status indicator */}
      {isGenerating && (
        <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating carousel slides...</span>
          </div>
          {carousel && (
            <span className="font-medium">
              {carousel.slides.filter(s => s.status === 'generated').length}/{carousel.slides.length} ready
            </span>
          )}
        </div>
      )}

      {/* No slides yet */}
      {!hasSlides && !isGenerating && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No carousel generated yet
          </p>
          <p className="text-xs text-muted-foreground">
            Click "Generate Carousel" to create slides from selected articles
          </p>
        </div>
      )}

      {/* Slide thumbnails - horizontal scroll */}
      {hasSlides && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-min">
            {carousel.slides.map((slide) => {
              const imageUrl = getSlideImageUrl(slide);
              const statusCfg = statusBadgeConfig[slide.status];

              return (
                <div
                  key={slide.id}
                  className="flex-shrink-0 w-48 rounded-lg border bg-white overflow-hidden shadow-sm"
                >
                  {/* Thumbnail area */}
                  <button
                    type="button"
                    className="w-full aspect-square bg-gray-100 flex items-center justify-center relative cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => imageUrl && setEnlargedSlide(slide)}
                    disabled={!imageUrl}
                    aria-label={`View full size: ${getSlideLabel(slide)}`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={getSlideLabel(slide)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : slide.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium">Generating...</span>
                      </div>
                    ) : slide.status === "pending" ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 rounded-full border-2 border-amber-300 border-dashed animate-[spin_3s_linear_infinite] flex items-center justify-center">
                          <span className="text-amber-500 text-xs font-bold">{slide.position + 1}</span>
                        </div>
                        <span className="text-xs text-amber-600 font-medium">In queue</span>
                      </div>
                    ) : slide.status === "failed" ? (
                      <span className="text-xs text-red-500 text-center px-2">
                        {slide.errorMessage || "Generation failed"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No image
                      </span>
                    )}
                  </button>

                  {/* Slide info */}
                  <div className="p-2 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        #{slide.position} {slide.slideType}
                      </span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs truncate" title={slide.titleText}>
                      {getSlideLabel(slide)}
                    </p>

                    {/* Regenerate button */}
                    <div className="flex gap-1">
                      {onEditSlide && slide.status === "generated" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1 text-xs h-7"
                          onClick={() => onEditSlide(slide)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 text-xs h-7"
                        onClick={() => regenerateMutation.mutate(slide.position)}
                        disabled={
                          regenerateMutation.isPending || isGenerating
                        }
                      >
                        {regenerateMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enlarge modal */}
      {enlargedSlide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setEnlargedSlide(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged slide view"
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setEnlargedSlide(null)}
              aria-label="Close enlarged view"
            >
              <X className="h-6 w-6" />
            </Button>
            {/* Image container with navigation arrows */}
            <div className="relative">
              {/* Left arrow - full height of image, hidden on first slide */}
              {!isFirstSlide() && (
                <button
                  type="button"
                  className="absolute left-0 top-0 bottom-0 w-16 z-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/20 transition-colors cursor-pointer rounded-l-lg"
                  onClick={(e) => { e.stopPropagation(); navigateSlide('prev'); }}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-10 w-10" />
                </button>
              )}
              {/* Right arrow - full height of image, hidden on last slide */}
              {!isLastSlide() && (
                <button
                  type="button"
                  className="absolute right-0 top-0 bottom-0 w-16 z-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/20 transition-colors cursor-pointer rounded-r-lg"
                  onClick={(e) => { e.stopPropagation(); navigateSlide('next'); }}
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-10 w-10" />
                </button>
              )}
              <img
                src={getSlideImageUrl(enlargedSlide)!}
                alt={getSlideLabel(enlargedSlide)}
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-white text-sm">
                #{enlargedSlide.position} — {enlargedSlide.slideType} — {enlargedSlide.titleText}
              </span>
              <a
                href={getSlideImageUrl(enlargedSlide)!}
                download={`slide-${enlargedSlide.position}.png`}
                className="inline-flex items-center gap-1 text-sm text-white hover:text-blue-300"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
