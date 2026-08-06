/**
 * Shared TypeScript interfaces for the Dominical Carousel system.
 */

/** Available color palettes for carousel generation */
export type CarouselPalette = 'tech-blue' | 'emerald-green' | 'sunset-orange' | 'royal-purple' | 'midnight-teal';

/** Palette configuration with colors for illustrations and text accents */
export interface PaletteConfig {
  name: string;
  label: string;
  /** Primary accent color for image generation prompts */
  primaryAccent: string;
  /** Secondary accent color */
  secondaryAccent: string;
  /** Background color description for image prompts */
  backgroundDesc: string;
  /** Hex color for engagement phrase text */
  phraseColor: string;
}

/** All available palettes */
export const PALETTE_CONFIGS: Record<CarouselPalette, PaletteConfig> = {
  'tech-blue': {
    name: 'tech-blue',
    label: 'Tech Blue',
    primaryAccent: 'electric cyan and bright blue',
    secondaryAccent: 'white and light purple',
    backgroundDesc: 'dark navy (#1a1a2e)',
    phraseColor: '#93c5fd',
  },
  'emerald-green': {
    name: 'emerald-green',
    label: 'Emerald Green',
    primaryAccent: 'emerald green and mint',
    secondaryAccent: 'gold and white',
    backgroundDesc: 'dark forest green (#0f2419)',
    phraseColor: '#6ee7b7',
  },
  'sunset-orange': {
    name: 'sunset-orange',
    label: 'Sunset Orange',
    primaryAccent: 'warm orange and coral',
    secondaryAccent: 'golden yellow and cream',
    backgroundDesc: 'dark burgundy (#1a0f0f)',
    phraseColor: '#fdba74',
  },
  'royal-purple': {
    name: 'royal-purple',
    label: 'Royal Purple',
    primaryAccent: 'royal purple and magenta',
    secondaryAccent: 'pink and white',
    backgroundDesc: 'deep indigo (#1a0a2e)',
    phraseColor: '#c4b5fd',
  },
  'midnight-teal': {
    name: 'midnight-teal',
    label: 'Midnight Teal',
    primaryAccent: 'teal and turquoise',
    secondaryAccent: 'silver and light blue',
    backgroundDesc: 'dark charcoal (#0f1a1a)',
    phraseColor: '#5eead4',
  },
};

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
  /** Category label to show in the band (article slides) */
  categoryLabel?: string;
  /** Accent color for engagement phrase */
  phraseColor?: string;
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
