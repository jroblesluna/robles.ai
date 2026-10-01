import { useTranslation } from 'react-i18next';

export interface BlogArticleBlock {
  heading: string;
  body: string;
}

interface BlogArticleProps {
  /** The post translation's `content` array (heading blocks + body text). */
  content: BlogArticleBlock[];
  /**
   * When true, the last section renders a "Back to Table of Contents" anchor
   * (the full-page BlogPost behavior). The modal viewer omits it.
   */
  showBackToToc?: boolean;
  /** Extra classes appended to the `<article>` element. */
  className?: string;
  /**
   * Visual density of the article body. `default` keeps the full-page
   * `BlogPost` look (`prose prose-lg`, larger section headings). `compact`
   * tightens type scale for the in-page modal: plain `prose` and smaller
   * section headings so they don't dominate the dialog (Req 11.4 / ux-overhaul).
   */
  size?: 'default' | 'compact';
}

/**
 * Splits a body string into visual paragraphs.
 *
 * Extracted verbatim from `BlogPost` so the modal and the full page render
 * identical paragraph structure (Req 11.3).
 * Design: Area 2 — 2a (shared BlogArticle for identical content structure).
 */
export function splitIntoParagraphs(text: string): string[] {
  // 1. If text has double line breaks, use them
  const byDoubleBreak = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (byDoubleBreak.length >= 2) return byDoubleBreak;

  // 2. If text has single line breaks, use them
  const bySingleBreak = text.split(/\n/).map((p) => p.trim()).filter((p) => p.length > 30);
  if (bySingleBreak.length >= 2) return bySingleBreak;

  // 3. Fallback: split into visual paragraphs every ~3 sentences
  // Use a regex that splits on ". " followed by an uppercase letter,
  // but NOT on decimals ($1.9), abbreviations (EE.UU.), or initials (Dr. Smith)
  const sentenceEnders = /(?<=[.!?])\s+(?=[A-ZÀ-Ü])/g;
  const sentences = text.split(sentenceEnders).filter((s) => s.trim().length > 0);

  if (sentences.length <= 3) return [text];

  // Group every 3 sentences into a paragraph
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    const group = sentences.slice(i, i + 3).join(' ');
    paragraphs.push(group.trim());
  }
  return paragraphs;
}

/**
 * Presentational renderer for a blog article body — the heading blocks and
 * body paragraphs. Shared by the full-page `BlogPost` and the in-page
 * `BlogModal` so both use one source of truth for content structure (Req 11.3).
 */
export function BlogArticle({
  content,
  showBackToToc = false,
  className,
  size = 'default',
}: BlogArticleProps) {
  const { i18n } = useTranslation();

  const compact = size === 'compact';
  // Full page keeps `prose-lg` + larger italic/bold headings; the modal uses a
  // tighter `prose` scale with smaller headings so they fit the dialog.
  const articleClass = compact ? 'prose max-w-none' : 'prose prose-lg max-w-none';
  const headingClass = compact
    ? 'scroll-mt-20 relative italic mb-2 text-base font-semibold text-gray-800 md:text-lg'
    : 'scroll-mt-20 relative italic mb-2 font-bold text-gray-800';

  return (
    <article className={`${articleClass}${className ? ` ${className}` : ''}`}>
      {content.map((block, idx) => (
        <section key={idx} className="mb-8">
          {block.heading && (
            <h2 id={`section-${idx}`} className={headingClass}>
              {block.heading}
            </h2>
          )}
          {splitIntoParagraphs(block.body).map((paragraph, pidx) => (
            <p key={pidx} className="mb-4">
              {paragraph}
            </p>
          ))}
          {showBackToToc && (content.length || -1) == idx + 1 && (
            <div className="mt-6">
              <a
                href="#toc"
                className="text-blue-500 text-sm hover:underline inline-flex items-center"
              >
                ↑ {i18n.language === 'es' ? 'Volver al índice' : 'Back to Table of Contents'}
              </a>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}

export default BlogArticle;
