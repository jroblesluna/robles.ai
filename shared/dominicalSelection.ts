interface ReportNews {
  slug: string;
  title?: string;
  titleEs?: string;
  titleEn?: string;
  scores?: unknown;
  weightedScore?: number | null;
  reason?: string | null;
}

/** Resolve the editor's complete selection against the report's own news pool. */
export function resolveDominicalSelection(slugs: unknown, allNews: ReportNews[], previous: ReportNews[]) {
  if (!Array.isArray(slugs) || slugs.some(slug => typeof slug !== 'string')) {
    throw new Error('selected_slugs must be an array of strings');
  }
  const pool = new Map(allNews.map(news => [news.slug, news]));
  const saved = new Map(previous.map(news => [news.slug, news]));
  return Array.from(new Set<string>(slugs)).map(slug => {
    const news = pool.get(slug);
    if (!news) throw new Error('Selected news is not part of this report');
    const existing = saved.get(slug);
    // Preserve real scoring, including zero. Never manufacture a model evaluation.
    return {
      slug,
      title: existing?.title || news.titleEs || news.titleEn || slug,
      scores: existing?.scores ?? news.scores,
      weightedScore: existing?.weightedScore ?? news.weightedScore,
      reason: existing?.reason ?? news.reason ?? 'Manually selected by editor',
    };
  });
}
