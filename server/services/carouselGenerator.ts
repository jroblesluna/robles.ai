import path from 'path';
import db from '../db.js';
import { generateEngagementPhrases } from './engagementPhrases.js';
import {
  generateCarouselBackgroundImage,
  generateCoverBackground,
  generateCTABackground,
  ensureBackgroundsDir,
} from './carouselImageGen.js';
import { composeArticleSlide, composeCoverSlide, composeCTASlide } from './slideCompositor.js';
import type {
  CarouselGenerationResult,
  SlideResult,
  SlideError,
  ArticleInput,
  SlideType,
  CarouselPalette,
  PaletteConfig,
  CarouselImageStyle,
  ImageStyleConfig,
} from './carouselTypes.js';
import { PALETTE_CONFIGS, IMAGE_STYLE_CONFIGS } from './carouselTypes.js';
import fs from 'fs';

/** CTA default message */
const CTA_MESSAGE = 'Síguenos para más insights de IA cada semana';

/** Logo path resolved from project root */
const LOGO_PATH = path.resolve(process.cwd(), 'public/images/logo.png');

/** Maximum concurrent image generation calls */
const MAX_CONCURRENCY = 3;

/**
 * Retrieves the OpenAI API key from settings table or environment variable.
 */
function getApiKey(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;
  const apiKey = row?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return apiKey;
}

/**
 * Returns the composites directory path for a given report, creating it if needed.
 */
function ensureCompositesDir(reportId: number): string {
  const dir = path.resolve(process.cwd(), 'server/data/carousel', String(reportId), 'composites');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Checks if any slide for the report is currently in 'generating' status.
 * Throws a 409 error if generation is in progress.
 */
function assertNotGenerating(reportId: number): void {
  const generating = db
    .prepare('SELECT COUNT(*) as count FROM carousel_slides WHERE report_id = ? AND status = ?')
    .get(reportId, 'generating') as { count: number };

  if (generating.count > 0) {
    const error = new Error('Carousel generation already in progress for this report');
    (error as any).statusCode = 409;
    throw error;
  }
}

/**
 * Fetches the report from the database and parses selected_news.
 * Cross-references with all_news to get categories (not stored in selected_news).
 */
function fetchReport(reportId: number): {
  id: number;
  week_start: string;
  week_end: string;
  articles: Array<{ title: string; excerpt: string; categories: string[]; slug: string }>;
} {
  const row = db
    .prepare('SELECT id, week_start, week_end, selected_news, all_news FROM dominical_reports WHERE id = ?')
    .get(reportId) as
    | { id: number; week_start: string; week_end: string; selected_news: string | null; all_news: string | null }
    | undefined;

  if (!row) {
    const error = new Error(`Report with ID ${reportId} not found`);
    (error as any).statusCode = 404;
    throw error;
  }

  // Parse all_news to build a slug → categories lookup
  let allNewsMap = new Map<string, { categories: string[]; excerpt: string }>();
  if (row.all_news) {
    try {
      const parsed = JSON.parse(row.all_news);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.slug) {
            allNewsMap.set(item.slug, {
              categories: item.categories || [],
              excerpt: item.excerpt || '',
            });
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  let articles: Array<{ title: string; excerpt: string; categories: string[]; slug: string }> = [];
  if (row.selected_news) {
    try {
      const parsed = JSON.parse(row.selected_news);
      if (Array.isArray(parsed)) {
        articles = parsed.map((item: any) => {
          const allNewsItem = allNewsMap.get(item.slug);
          return {
            title: item.title || '',
            excerpt: item.excerpt || allNewsItem?.excerpt || '',
            categories: item.categories || allNewsItem?.categories || [],
            slug: item.slug || '',
          };
        });
      }
    } catch {
      articles = [];
    }
  }

  return {
    id: row.id,
    week_start: row.week_start,
    week_end: row.week_end,
    articles,
  };
}

/**
 * Inserts or replaces a slide record in the database.
 */
function upsertSlide(params: {
  reportId: number;
  position: number;
  slideType: SlideType;
  articleSlug: string | null;
  titleText: string;
  engagementPhrase: string | null;
  backgroundImagePath: string | null;
  compositeImagePath: string | null;
  status: string;
  errorMessage: string | null;
}): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO carousel_slides
      (report_id, position, slide_type, article_slug, title_text, engagement_phrase,
       background_image_path, composite_image_path, status, error_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.reportId,
    params.position,
    params.slideType,
    params.articleSlug,
    params.titleText,
    params.engagementPhrase,
    params.backgroundImagePath,
    params.compositeImagePath,
    params.status,
    params.errorMessage,
    now,
    now,
  );
}

/**
 * Runs async tasks with a concurrency limit.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        const value = await tasks[currentIndex]();
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason: any) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Generates a full carousel for the given report.
 * Carousel structure: position 0 = cover, positions 1..N = articles, position N+1 = CTA.
 */
export async function generateCarousel(reportId: number, palette?: CarouselPalette, imageStyle?: CarouselImageStyle): Promise<CarouselGenerationResult> {
  // Concurrency guard
  assertNotGenerating(reportId);

  const apiKey = getApiKey();
  const report = fetchReport(reportId);
  const articles = report.articles;

  const paletteConfig: PaletteConfig | undefined = palette ? PALETTE_CONFIGS[palette] : undefined;
  const styleConfig: ImageStyleConfig | undefined = imageStyle ? IMAGE_STYLE_CONFIGS[imageStyle] : undefined;

  const backgroundsDir = ensureBackgroundsDir(reportId);
  const compositesDir = ensureCompositesDir(reportId);

  const slides: SlideResult[] = [];
  const errors: SlideError[] = [];

  // Create all slide records with status 'pending' (queued/waiting)
  // Position 0: cover
  upsertSlide({
    reportId,
    position: 0,
    slideType: 'cover',
    articleSlug: null,
    titleText: 'El Dominical IA',
    engagementPhrase: null,
    backgroundImagePath: null,
    compositeImagePath: null,
    status: 'pending',
    errorMessage: null,
  });

  // Positions 1..N: articles
  for (let i = 0; i < articles.length; i++) {
    upsertSlide({
      reportId,
      position: i + 1,
      slideType: 'article',
      articleSlug: articles[i].slug || null,
      titleText: articles[i].title,
      engagementPhrase: null,
      backgroundImagePath: null,
      compositeImagePath: null,
      status: 'pending',
      errorMessage: null,
    });
  }

  // Position N+1: CTA
  upsertSlide({
    reportId,
    position: articles.length + 1,
    slideType: 'cta',
    articleSlug: null,
    titleText: CTA_MESSAGE,
    engagementPhrase: null,
    backgroundImagePath: null,
    compositeImagePath: null,
    status: 'pending',
    errorMessage: null,
  });

  // Generate engagement phrases for all articles in one batch
  let phrases: string[] = [];
  if (articles.length > 0) {
    try {
      const articleInputs: ArticleInput[] = articles.map((a) => ({
        title: a.title,
        excerpt: a.excerpt || '',
        categories: a.categories || [],
      }));
      const result = await generateEngagementPhrases(articleInputs, apiKey);
      phrases = result.phrases;
    } catch (err: any) {
      // If engagement phrases fail, continue with empty phrases
      console.error('[CarouselGenerator] Engagement phrases failed:', err.message);
      phrases = articles.map(() => '');
    }
  }

  // Generate, compose, and finalize each slide with concurrency limit
  const slideTasks: (() => Promise<{ slide: SlideResult; error?: SlideError }>)[] = [];

  // Cover task
  slideTasks.push(async () => {
    const position = 0;
    const bgPath = path.join(backgroundsDir, 'cover.png');

    // Mark as generating
    db.prepare('UPDATE carousel_slides SET status = ?, updated_at = ? WHERE report_id = ? AND position = ?')
      .run('generating', new Date().toISOString(), reportId, position);

    // Generate background
    let bgSuccess = true;
    try {
      await generateCoverBackground(apiKey, bgPath, paletteConfig, styleConfig);
    } catch (err: any) {
      bgSuccess = false;
      console.error(`[CarouselGenerator] Cover background failed:`, err.message);
    }

    // Compose slide
    return composeSingleSlide({
      reportId,
      position,
      slideType: 'cover',
      articleSlug: null,
      titleText: 'El Dominical IA',
      engagementPhrase: null,
      bgPath: bgSuccess ? bgPath : null,
      compositesDir,
      weekStart: report.week_start,
      weekEnd: report.week_end,
      paletteConfig,
    });
  });

  // Article tasks
  for (let i = 0; i < articles.length; i++) {
    const position = i + 1;
    const article = articles[i];
    const phrase = phrases[i] || null;

    slideTasks.push(async () => {
      const bgPath = path.join(backgroundsDir, `slide-${position}.png`);

      // Mark as generating
      db.prepare('UPDATE carousel_slides SET status = ?, updated_at = ? WHERE report_id = ? AND position = ?')
        .run('generating', new Date().toISOString(), reportId, position);

      // Generate background
      let bgSuccess = true;
      try {
        await generateCarouselBackgroundImage(
          article.title,
          article.categories || [],
          apiKey,
          bgPath,
          paletteConfig,
          styleConfig,
        );
      } catch (err: any) {
        bgSuccess = false;
        console.error(`[CarouselGenerator] Slide ${position} background failed:`, err.message);
      }

      // Compose slide
      return composeSingleSlide({
        reportId,
        position,
        slideType: 'article',
        articleSlug: article.slug || null,
        titleText: article.title,
        engagementPhrase: phrase,
        bgPath: bgSuccess ? bgPath : null,
        compositesDir,
        weekStart: report.week_start,
        weekEnd: report.week_end,
        categories: article.categories || [],
        paletteConfig,
      });
    });
  }

  // CTA task
  slideTasks.push(async () => {
    const position = articles.length + 1;
    const bgPath = path.join(backgroundsDir, 'cta.png');

    // Mark as generating
    db.prepare('UPDATE carousel_slides SET status = ?, updated_at = ? WHERE report_id = ? AND position = ?')
      .run('generating', new Date().toISOString(), reportId, position);

    // Generate background
    let bgSuccess = true;
    try {
      await generateCTABackground(apiKey, bgPath, paletteConfig, styleConfig);
    } catch (err: any) {
      bgSuccess = false;
      console.error(`[CarouselGenerator] CTA background failed:`, err.message);
    }

    // Compose slide
    return composeSingleSlide({
      reportId,
      position,
      slideType: 'cta',
      articleSlug: null,
      titleText: CTA_MESSAGE,
      engagementPhrase: null,
      bgPath: bgSuccess ? bgPath : null,
      compositesDir,
      weekStart: report.week_start,
      weekEnd: report.week_end,
      paletteConfig,
    });
  });

  // Run all slide tasks with concurrency limit
  const slideResults = await runWithConcurrency(slideTasks, MAX_CONCURRENCY);

  // Collect results
  for (const result of slideResults) {
    if (result.status === 'fulfilled') {
      slides.push(result.value.slide);
      if (result.value.error) errors.push(result.value.error);
    } else {
      // This shouldn't happen since composeSingleSlide handles errors internally
      console.error('[CarouselGenerator] Unexpected task rejection:', result.reason?.message);
    }
  }

  return { reportId, slides, errors };
}

/**
 * Composes a single slide (cover, article, or CTA) and updates the DB record.
 */
async function composeSingleSlide(params: {
  reportId: number;
  position: number;
  slideType: SlideType;
  articleSlug: string | null;
  titleText: string;
  engagementPhrase: string | null;
  bgPath: string | null;
  compositesDir: string;
  weekStart: string;
  weekEnd: string;
  categories?: string[];
  paletteConfig?: PaletteConfig;
}): Promise<{ slide: SlideResult; error?: SlideError }> {
  const { reportId, position, slideType, articleSlug, titleText, engagementPhrase, bgPath, compositesDir, weekStart, weekEnd, categories, paletteConfig } = params;

  // If background generation failed, mark slide as failed
  if (!bgPath || !fs.existsSync(bgPath)) {
    const errorMsg = 'Background image generation failed';
    upsertSlide({
      reportId,
      position,
      slideType,
      articleSlug,
      titleText,
      engagementPhrase,
      backgroundImagePath: null,
      compositeImagePath: null,
      status: 'failed',
      errorMessage: errorMsg,
    });
    return {
      slide: {
        position,
        type: slideType,
        status: 'failed',
        imagePath: null,
        articleSlug,
        titleText,
        engagementPhrase,
      },
      error: { position, error: errorMsg },
    };
  }

  // Determine composite output path
  const compositeFilename = position === 0
    ? '00-cover.png'
    : slideType === 'cta'
      ? `${String(position).padStart(2, '0')}-cta.png`
      : `${String(position).padStart(2, '0')}-slide.png`;
  const compositePath = path.join(compositesDir, compositeFilename);

  try {
    // Compose based on slide type
    switch (slideType) {
      case 'cover':
        await composeCoverSlide({
          backgroundImagePath: bgPath,
          logoPath: LOGO_PATH,
          weekStart,
          weekEnd,
          outputPath: compositePath,
        });
        break;

      case 'article':
        await composeArticleSlide({
          backgroundImagePath: bgPath,
          logoPath: LOGO_PATH,
          titleText,
          engagementPhrase: engagementPhrase || undefined,
          slideType: 'article',
          outputPath: compositePath,
          categoryLabel: categories?.[0] || undefined,
          phraseColor: paletteConfig?.phraseColor,
        });
        break;

      case 'cta':
        await composeCTASlide({
          backgroundImagePath: bgPath,
          logoPath: LOGO_PATH,
          ctaMessage: titleText,
          outputPath: compositePath,
        });
        break;
    }

    // Update DB with success
    upsertSlide({
      reportId,
      position,
      slideType,
      articleSlug,
      titleText,
      engagementPhrase,
      backgroundImagePath: bgPath,
      compositeImagePath: compositePath,
      status: 'generated',
      errorMessage: null,
    });

    return {
      slide: {
        position,
        type: slideType,
        status: 'generated',
        imagePath: compositePath,
        articleSlug,
        titleText,
        engagementPhrase,
      },
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Composition failed';
    upsertSlide({
      reportId,
      position,
      slideType,
      articleSlug,
      titleText,
      engagementPhrase,
      backgroundImagePath: bgPath,
      compositeImagePath: null,
      status: 'failed',
      errorMessage: errorMsg,
    });

    return {
      slide: {
        position,
        type: slideType,
        status: 'failed',
        imagePath: null,
        articleSlug,
        titleText,
        engagementPhrase,
      },
      error: { position, error: errorMsg },
    };
  }
}

/**
 * Regenerates only the specified slide for a report.
 */
export async function regenerateSlide(reportId: number, position: number, palette?: CarouselPalette, imageStyle?: CarouselImageStyle): Promise<SlideResult> {
  // Concurrency guard
  assertNotGenerating(reportId);

  const apiKey = getApiKey();
  const report = fetchReport(reportId);
  const articles = report.articles;
  const totalSlides = articles.length + 2;

  const paletteConfig: PaletteConfig | undefined = palette ? PALETTE_CONFIGS[palette] : undefined;
  const styleConfig: ImageStyleConfig | undefined = imageStyle ? IMAGE_STYLE_CONFIGS[imageStyle] : undefined;

  if (position < 0 || position >= totalSlides) {
    const error = new Error(`Invalid slide position ${position}. Valid range: 0-${totalSlides - 1}`);
    (error as any).statusCode = 400;
    throw error;
  }

  const backgroundsDir = ensureBackgroundsDir(reportId);
  const compositesDir = ensureCompositesDir(reportId);

  // Determine slide type and content
  let slideType: SlideType;
  let titleText: string;
  let articleSlug: string | null = null;
  let engagementPhrase: string | null = null;

  if (position === 0) {
    slideType = 'cover';
    titleText = 'El Dominical IA';
  } else if (position === totalSlides - 1) {
    slideType = 'cta';
    titleText = CTA_MESSAGE;
  } else {
    slideType = 'article';
    const articleIndex = position - 1;
    const article = articles[articleIndex];
    titleText = article.title;
    articleSlug = article.slug || null;

    // Generate a fresh engagement phrase for this single article
    try {
      const articleInput: ArticleInput = {
        title: article.title,
        excerpt: article.excerpt || '',
        categories: article.categories || [],
      };
      const result = await generateEngagementPhrases([articleInput], apiKey);
      engagementPhrase = result.phrases[0] || null;
    } catch (err: any) {
      console.error('[CarouselGenerator] Engagement phrase regen failed:', err.message);
      // Try to keep existing phrase from DB
      const existing = db
        .prepare('SELECT engagement_phrase FROM carousel_slides WHERE report_id = ? AND position = ?')
        .get(reportId, position) as { engagement_phrase: string | null } | undefined;
      engagementPhrase = existing?.engagement_phrase || null;
    }
  }

  // Mark slide as generating
  upsertSlide({
    reportId,
    position,
    slideType,
    articleSlug,
    titleText,
    engagementPhrase,
    backgroundImagePath: null,
    compositeImagePath: null,
    status: 'generating',
    errorMessage: null,
  });

  // Generate background
  let bgPath: string | null = null;
  try {
    if (slideType === 'cover') {
      bgPath = path.join(backgroundsDir, 'cover.png');
      await generateCoverBackground(apiKey, bgPath, paletteConfig, styleConfig);
    } else if (slideType === 'cta') {
      bgPath = path.join(backgroundsDir, 'cta.png');
      await generateCTABackground(apiKey, bgPath, paletteConfig, styleConfig);
    } else {
      const articleIndex = position - 1;
      bgPath = path.join(backgroundsDir, `slide-${position}.png`);
      await generateCarouselBackgroundImage(
        articles[articleIndex].title,
        articles[articleIndex].categories || [],
        apiKey,
        bgPath,
        paletteConfig,
        styleConfig,
      );
    }
  } catch (err: any) {
    bgPath = null;
    console.error('[CarouselGenerator] Background regen failed:', err.message);
  }

  // Compose the slide
  const articleCategories = slideType === 'article' ? (articles[position - 1]?.categories || []) : undefined;
  const result = await composeSingleSlide({
    reportId,
    position,
    slideType,
    articleSlug,
    titleText,
    engagementPhrase,
    bgPath,
    compositesDir,
    weekStart: report.week_start,
    weekEnd: report.week_end,
    categories: articleCategories,
    paletteConfig,
  });

  return result.slide;
}
