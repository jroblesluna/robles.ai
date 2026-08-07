import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  Save,
  Linkedin,
  XCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
  Sparkles,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import CarouselPreview from "@/components/admin/CarouselPreview";
import SlideEditor from "@/components/admin/SlideEditor";
import { useQueryClient } from "@tanstack/react-query";

interface ScoreBreakdown {
  novelty: number;
  peopleImpact: number;
  economicImpact: number;
  narrativePotential: number;
}

interface PostSummary {
  slug: string;
  titleEn: string;
  titleEs: string;
  excerpt: string;
  date: string;
  categories: string[];
  scores?: ScoreBreakdown;
  weightedScore?: number;
  reason?: string;
}

interface ScoredPost {
  slug: string;
  title: string;
  scores: ScoreBreakdown;
  weightedScore: number;
  reason: string;
}

interface DominicalReportDetail {
  id: number;
  week_start: string;
  week_end: string;
  all_news: PostSummary[];
  selected_news: ScoredPost[];
  post_text: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  last_edited_at: string | null;
}

const MAX_CHARS = 3000;

const statusConfig: Record<string, { label: string; className: string }> = {
  pending_review: {
    label: "Pending Review",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  edited: {
    label: "Edited",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  published: {
    label: "Published",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

function formatDate(iso: string): string {
  // Add T00:00:00 to prevent timezone offset issues
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDominicalDetail() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/admin/dominical/:id");
  const { toast } = useToast();

  const [report, setReport] = useState<DominicalReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Editable state
  const [postText, setPostText] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  // Image state
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectionChanged, setSelectionChanged] = useState(false);

  // Slide editor state
  const [editingSlide, setEditingSlide] = useState<{
    position: number;
    titleText: string;
    engagementPhrase: string | null;
    slideType: "cover" | "article" | "cta";
    status: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportId = params?.id;

  const fetchReport = useCallback(async () => {
    if (!reportId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/dominical/${reportId}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setReport(data);
      setPostText(data.post_text || "");
      setSelectedSlugs(
        new Set((data.selected_news || []).map((n: ScoredPost) => n.slug))
      );
      setImageUrl(data.image_url || "");
      setImageUrlInput(data.image_url || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSave = async () => {
    if (!reportId) return;
    try {
      setSaving(true);
      const selectedNews = report?.selected_news.filter((n) =>
        selectedSlugs.has(n.slug)
      );
      const res = await fetch(`/api/admin/dominical/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_text: postText,
          selected_news: selectedNews,
          image_url: imageUrl || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      toast({ title: "Report saved successfully" });
      await fetchReport();
    } catch (err) {
      toast({
        title: "Error saving report",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!reportId) return;
    const confirmed = window.confirm(
      "Are you sure you want to cancel this week's report? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setCancelling(true);
      const res = await fetch(`/api/admin/dominical/${reportId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel");
      }
      toast({ title: "Report cancelled" });
      await fetchReport();
    } catch (err) {
      toast({
        title: "Error cancelling report",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handlePublish = async () => {
    if (!reportId) return;
    const isRepublishing = report?.status === "published";
    const confirmed = window.confirm(
      isRepublishing
        ? "This report was already published. Are you sure you want to republish to LinkedIn?"
        : "Are you sure you want to publish this report to LinkedIn?"
    );
    if (!confirmed) return;

    try {
      setPublishing(true);
      const res = await fetch(`/api/admin/dominical/${reportId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to publish");
      }
      toast({ title: "Published to LinkedIn successfully" });
      await fetchReport();
    } catch (err) {
      toast({
        title: "Error publishing to LinkedIn",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const toggleNewsSelection = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
    setSelectionChanged(true);
  };

  const handleRegeneratePost = async () => {
    if (!reportId) return;
    try {
      setRegenerating(true);
      const res = await fetch(`/api/admin/dominical/${reportId}/regenerate-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_slugs: Array.from(selectedSlugs) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to regenerate");
      }
      const data = await res.json();
      setPostText(data.post_text);
      setSelectionChanged(false);
      toast({ title: "Post regenerated with new selection" });
    } catch (err) {
      toast({
        title: "Error regenerating post",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getScoredPost = (slug: string): { scores?: ScoreBreakdown; weightedScore: number; reason: string } | undefined => {
    const selected = report?.selected_news.find((n) => n.slug === slug);
    if (selected) return { scores: selected.scores, weightedScore: selected.weightedScore, reason: selected.reason };
    const allNews = report?.all_news.find((n) => n.slug === slug);
    if (allNews && allNews.weightedScore) return { scores: allNews.scores, weightedScore: allNews.weightedScore, reason: allNews.reason || '' };
    return undefined;
  };

  const handleImageUrlCommit = () => {
    const trimmed = imageUrlInput.trim();
    setImageUrl(trimmed);
  };

  const handleImageUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleImageUrlCommit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageUrl(dataUrl);
      setImageUrlInput("");
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateImage = async () => {
    if (!reportId) return;
    try {
      setGeneratingImage(true);
      const res = await fetch(
        `/api/admin/dominical/${reportId}/generate-image`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate image");
      }
      const data = await res.json();
      if (data.image_url) {
        setImageUrl(data.image_url);
        setImageUrlInput(data.image_url);
        toast({ title: "Image generated successfully" });
      }
    } catch (err) {
      toast({
        title: "Error generating image",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`/api/admin/dominical/${reportId}/carousel/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carousel-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Error downloading PDF",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const charCount = postText.length;
  const charWarning = charCount > MAX_CHARS * 0.9;
  const charOver = charCount > MAX_CHARS;

  if (!matched) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/dominical")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Button>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Report not found"}
        </div>
      </div>
    );
  }

  const statusCfg = statusConfig[report.status] || {
    label: report.status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const isReadOnly = report.status === "cancelled";
  const isPublished = report.status === "published";

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/dominical")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Week: {formatDate(report.week_start)} – {formatDate(report.week_end)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
              {report.last_edited_at && (
                <span className="text-xs text-muted-foreground">
                  Last edited: {formatDate(report.last_edited_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || isReadOnly}
            size="sm"
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublish}
            disabled={publishing || report.status === "cancelled" || !postText}
            className="gap-2"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Linkedin className="h-4 w-4" />
            )}
            {isPublished ? "Republish" : "Send to LinkedIn"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling || isReadOnly}
            className="gap-2"
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel this week
          </Button>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: News List */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            News this week ({report.all_news.length})
          </Label>
          {selectionChanged && !isReadOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={handleRegeneratePost}
              disabled={regenerating || selectedSlugs.size === 0}
              className="gap-2"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Regenerate Post with selection ({selectedSlugs.size})
            </Button>
          )}
          <div className="max-h-[600px] overflow-y-auto space-y-2 rounded-lg border p-3">
            {report.all_news.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No news available
              </p>
            ) : (
              (() => {
                // Sort: selected first (by score desc), then unselected
                const sorted = [...report.all_news].sort((a, b) => {
                  const aSelected = selectedSlugs.has(a.slug);
                  const bSelected = selectedSlugs.has(b.slug);
                  if (aSelected && !bSelected) return -1;
                  if (!aSelected && bSelected) return 1;
                  // Within same group, sort by score descending
                  const aScore = getScoredPost(a.slug)?.weightedScore || 0;
                  const bScore = getScoredPost(b.slug)?.weightedScore || 0;
                  return bScore - aScore;
                });

                return sorted.map((news) => {
                  const scored = getScoredPost(news.slug);
                  const isSelected = selectedSlugs.has(news.slug);

                  return (
                    <div
                      key={news.slug}
                      className={`rounded-md border p-3 transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNewsSelection(news.slug)}
                          disabled={isReadOnly}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${news.titleEs || news.titleEn}`}
                        />
                        <div className="flex-1 min-w-0">
                          <a
                            href={`https://robles.ai/blog/${news.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium leading-tight hover:text-blue-600 hover:underline"
                          >
                            {news.titleEs || news.titleEn}
                          </a>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(news.date)}
                          </p>
                          {scored && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs font-bold ${
                                    scored.weightedScore >= 80
                                      ? "bg-green-100 text-green-800"
                                      : scored.weightedScore >= 60
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {scored.weightedScore}/100
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate">
                                  {scored.reason}
                                </span>
                              </div>
                              {scored.scores && (
                                <div className="flex gap-1 flex-wrap">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                    Nov: {scored.scores.novelty}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                                    Pers: {scored.scores.peopleImpact}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                    Econ: {scored.scores.economicImpact}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                                    Narr: {scored.scores.narrativePotential}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* Right panel: Post Editor + Image */}
        <div className="space-y-6">
          {/* Post text editor */}
          <div className="space-y-2">
            <Label htmlFor="post-text" className="text-base font-semibold">
              LinkedIn Post
            </Label>
            <textarea
              id="post-text"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              disabled={isReadOnly}
              className="w-full min-h-[320px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Write your LinkedIn post here..."
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${
                  charOver
                    ? "text-red-600 font-semibold"
                    : charWarning
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                }`}
              >
                {charCount} / {MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Image section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Image</Label>

            {/* Image preview */}
            {imageUrl ? (
              <div className="rounded-lg border overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Dominical report cover"
                  className="w-full h-auto max-h-[300px] object-cover"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No image yet
                </p>
              </div>
            )}

            {/* URL input */}
            <div className="space-y-1">
              <Label htmlFor="image-url-input" className="text-xs text-muted-foreground">
                Paste image URL
              </Label>
              <Input
                id="image-url-input"
                type="url"
                placeholder="https://example.com/image.png"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onBlur={handleImageUrlCommit}
                onKeyDown={handleImageUrlKeyDown}
                disabled={isReadOnly}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                aria-label="Upload image file"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadOnly}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={isReadOnly || generatingImage}
                className="gap-2"
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate with AI
              </Button>
            </div>

            {/* Remove image button (if image exists) */}
            {imageUrl && !isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImageUrl("");
                  setImageUrlInput("");
                }}
                className="text-muted-foreground text-xs"
              >
                Remove image
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Carousel section */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">LinkedIn Carousel</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
        <CarouselPreview
          reportId={Number(reportId)}
          onEditSlide={(slide) =>
            setEditingSlide({
              position: slide.position,
              titleText: slide.titleText,
              engagementPhrase: slide.engagementPhrase,
              slideType: slide.slideType,
              status: slide.status,
            })
          }
        />
      </div>

      {/* Slide editor modal */}
      {editingSlide && (
        <SlideEditor
          reportId={Number(reportId)}
          slide={editingSlide}
          isOpen={!!editingSlide}
          onClose={() => setEditingSlide(null)}
          onUpdated={() => {
            setEditingSlide(null);
            queryClient.invalidateQueries({
              queryKey: [`/api/admin/dominical/${reportId}/carousel`],
            });
          }}
        />
      )}
    </div>
  );
}
