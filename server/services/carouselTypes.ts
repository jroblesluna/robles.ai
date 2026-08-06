/**
 * Shared TypeScript interfaces for the Dominical Carousel system.
 */

/** Slide type literal union */
export type SlideType = 'cover' | 'article' | 'cta';

/** Slide status literal union */
export type SlideStatus = 'pending' | 'generating' | 'generated' | 'failed';

/** Result for a single slide in the carousel generation pipeline */
export interface SlideResult {
  position: number;
  type: SlideType;
  status: 'generated' | 'failed';
  imagePath: string | null;
  articleSlug: string | null;
  titleText: string;
  engagementPhrase: string | null;
}

/** Error information for a slide that failed generation */
export interface SlideError {
  position: number;
  error: string;
}

/** Overall result of a full carousel generation */
export interface CarouselGenerationResult {
  reportId: number;
  slides: SlideResult[];
  errors: SlideError[];
}

/** Input data for an article used in engagement phrase generation */
export interface ArticleInput {
  title: string;
  excerpt: string;
  categories: string[];
}

/** Options for composing an article slide */
export interface ComposeSlideOptions {
  backgroundImagePath: string;
  logoPath: string;
  titleText: string;
  engagementPhrase?: string;
  slideType: SlideType;
  outputPath: string;
}

/** Options for composing the cover slide */
export interface ComposeCoverOptions {
  backgroundImagePath: string;
  logoPath: string;
  weekStart: string;
  weekEnd: string;
  outputPath: string;
}

/** Options for composing the CTA (call-to-action) slide */
export interface ComposeCTAOptions {
  backgroundImagePath: string;
  logoPath: string;
  ctaMessage: string;
  outputPath: string;
}

/** Result of exporting the carousel to PDF */
export interface PdfExportResult {
  pdfBuffer: Buffer;
  pageCount: number;
  warnings: string[];
}
