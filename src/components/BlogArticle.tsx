import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export interface BlogArticleBlock {
  heading: string;
  body: string;
}

interface BlogArticleProps {
  /** The post translation's `content` array (heading blocks + body text). */
  content: BlogArticleBlock[];
  /** The post's keywords; each is bolded on its first mention per section. */
  keywords?: string[];
  /**
   * When true, the last section renders a "Back to Table of Contents" anchor
   * (the full-page BlogPost behavior). The modal viewer omits it.
   */
  showBackToToc?: boolean;
  /** Extra classes appended to the `<article>` element. */
  className?: string;
  /**
   * Visual density of the article body. `default` keeps the full-page
   * `BlogPost` look (`prose`, larger bold section headings). `compact`
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

// Posts are plain text, so emphasis is inferred at render time:
// **marked** text, direct quotes, figures (money, %, multipliers, scale words)
// and the post's own keywords (first mention per section).
// ponytail: regex heuristics, not NLP; a quote containing an apostrophe or a
// figure written in words ("two million") is left plain.
const MARKED = String.raw`\*\*[^*\n]+\*\*`;
const QUOTE = String.raw`“[^”]{20,}”|"[^"\n]{20,}"|(?<!\w)'[^'\n]{20,}'(?!\w)`;
const SCALE = String.raw`(?:\s?(?:billion|million|trillion|thousand|mil millones|millones|bn|[BMK]\b))`;
const FIGURE = String.raw`(?:US)?\$\s?\d[\d.,]*${SCALE}?|(?<![\w.])\d[\d.,]*(?:\s?%|\s?percent\b|\s?por ciento\b|${SCALE}|x\b)`;
const PULL_QUOTE_MIN = 60;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emphasisPattern(keywords: string[]) {
  const words = keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 2)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const keywordGroup = words.length ? String.raw`|(?<kw>(?<!\w)(?:${words.join('|')})(?!\w))` : '';
  return new RegExp(`(?<mark>${MARKED})|(?<quote>${QUOTE})|(?<fig>${FIGURE})${keywordGroup}`, 'gi');
}

/** The closing "Where Robles.AI fits" section is detected by its heading. */
export function isRoblesSection(heading: string) {
  return /robles\.ai/i.test(heading);
}

/** Frames a heading as a question: "X?" in English, "¿X?" in Spanish. */
export function asQuestion(heading: string, language: string) {
  const text = heading.trim().replace(/^¿/, '').replace(/[?.:!]+$/, '');
  return language.startsWith('es') ? `¿${text}?` : `${text}?`;
}

/** First direct quote long enough to work as a pull quote, without its quote marks. */
export function findPullQuote(text: string): string | null {
  for (const match of text.matchAll(new RegExp(QUOTE, 'g'))) {
    const inner = match[0].slice(1, -1).trim();
    if (inner.length >= PULL_QUOTE_MIN) return inner;
  }
  return null;
}

/**
 * Splits a paragraph into text and emphasised spans. `seenKeywords` is shared
 * across a section so each keyword is only highlighted on first mention.
 */
export function emphasize(text: string, pattern: RegExp, seenKeywords: Set<string>): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const { mark, quote, fig, kw } = match.groups ?? {};
    const start = match.index ?? 0;
    let node: React.ReactNode = null;
    if (mark) node = <strong key={start} className="font-semibold text-slate-900">{mark.slice(2, -2)}</strong>;
    else if (quote) node = <em key={start} className="font-medium text-slate-900">{quote}</em>;
    else if (fig) node = <strong key={start} className="font-semibold text-blue-700">{fig}</strong>;
    else if (kw && !seenKeywords.has(kw.toLowerCase())) {
      seenKeywords.add(kw.toLowerCase());
      node = <strong key={start} className="font-semibold text-slate-900">{kw}</strong>;
    }
    if (!node) continue;
    if (start > last) nodes.push(text.slice(last, start));
    nodes.push(node);
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Presentational renderer for a blog article body — the heading blocks and
 * body paragraphs. Shared by the full-page `BlogPost` and the in-page
 * `BlogModal` so both use one source of truth for content structure (Req 11.3).
 */
export function BlogArticle({
  content,
  keywords = [],
  showBackToToc = false,
  className,
  size = 'default',
}: BlogArticleProps) {
  const { t, i18n } = useTranslation();
  const pattern = emphasisPattern(keywords);

  const compact = size === 'compact';
  // Full page uses larger bold headings; the modal uses a
  // tighter `prose` scale with smaller headings so they fit the dialog.
  const articleClass = compact
    ? 'prose prose-slate max-w-none prose-p:text-[1.0625rem] prose-p:leading-[1.8] prose-p:text-slate-700'
    : 'prose prose-slate max-w-none prose-p:text-[1.0625rem] prose-p:leading-[1.8] prose-p:text-slate-700';
  const headingClass = compact
    ? 'scroll-mt-20 relative mb-3 mt-0 text-lg font-semibold tracking-tight text-slate-900 md:text-xl'
    : 'scroll-mt-[calc(var(--header-h)+1.5rem)] relative mb-3 mt-0 text-xl font-bold md:text-[1.375rem] tracking-tight text-slate-900';

  return (
    <article className={`${articleClass}${className ? ` ${className}` : ''}`}>
      {content.map((block, idx) => {
        const seenKeywords = new Set<string>();
        const paragraphs = splitIntoParagraphs(block.body);
        // One pull quote per section, shown after the paragraph that contains it.
        const pullQuote = compact ? null : findPullQuote(block.body);
        const pullQuoteAt = pullQuote ? paragraphs.findIndex((p) => p.includes(pullQuote)) : -1;
        // The closing "Where Robles.AI fits" section becomes a soft CTA card.
        const isCallout = !compact && isRoblesSection(block.heading);
        const heading = isCallout ? asQuestion(block.heading, i18n.language ?? 'en') : block.heading;
        return (
        <section
          key={idx}
          className={
            isCallout
              ? 'relative mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-6 md:p-8'
              : 'mb-10'
          }
        >
          {isCallout && (
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
          )}
          {block.heading && (
            <h2 id={`section-${idx}`} className={headingClass}>
              {heading}
            </h2>
          )}
          {paragraphs.map((paragraph, pidx) => (
            <Fragment key={pidx}>
              <p
                className={
                  !compact && idx === 0 && pidx === 0
                    ? 'mb-4 text-lg leading-relaxed text-slate-800'
                    : isCallout ? 'relative mb-4' : 'mb-4'
                }
              >
                {emphasize(paragraph, pattern, seenKeywords)}
              </p>
              {pidx === pullQuoteAt && (
                // Decorative repeat of a quote already in the text (magazine pull quote).
                <blockquote
                  aria-hidden
                  className="not-prose my-8 rounded-r-2xl border-l-4 border-blue-600 bg-blue-50/60 px-6 py-5 text-lg font-semibold italic leading-snug text-slate-900 md:text-xl"
                >
                  “{pullQuote}”
                </blockquote>
              )}
            </Fragment>
          ))}
          {isCallout && (
            <a
              href={`/get-started${i18n.language?.startsWith('es') ? '?lang=es' : ''}#contacto`}
              className="not-prose relative mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 no-underline transition hover:border-blue-300 hover:bg-blue-50"
            >
              {t('blogPost.cta')}
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
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
        );
      })}
    </article>
  );
}

export default BlogArticle;
