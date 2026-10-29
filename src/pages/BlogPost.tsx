import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowUp, ChevronRight, Clock, ExternalLink, Home, ListTree } from 'lucide-react';
import { navigate } from 'wouter/use-browser-location';
import { applyPageMetadata } from '@/lib/pageMetadata';
import { normalizeLanguage, explicitLanguage } from '@shared/seoPolicy';
import { buildBlogMeta, buildBlogJsonLd } from '@shared/seoMetadata';
import { useParams, useSearch } from 'wouter';
import { BlogArticle, asQuestion, isRoblesSection } from '@/components/BlogArticle';
import ErrorState from '@/components/state/ErrorState';
import NotFound from '@/pages/not-found';
import LoadingState from '@/components/state/LoadingState';
import { initialPublicPost } from '@/lib/publicPost';
import { recordVisit, type Trail } from '@/lib/historyTrail';
import { listPostPath, type BlogListPost } from '@/lib/blogModal';

interface Post {
  slug: string;
  date: string;
  image: string;
  editorId: number;
  categories: string[];
  keywords: string[];
  translations: {
    en: {
      slug: string;
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
    es: {
      slug: string;
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
  };
  sources: { title: string; url: string; source: string; urlToImage?: string }[];
  stats?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface Editor {
  id: number;
  name: string;
  signature: string;
  specialty?: string;
}

// Extrae y convierte la fecha del slug tipo YYYY-MM-DD-HH-MM-SS
function extractDateTimeFromSlug(slug: string): Date {
  const slugDateTime = slug
    .slice(0, 19)
    .replace(/-/g, ':')
    .replace(/^(\d{4}):(\d{2}):(\d{2}):/, '$1-$2-$3T')
    .replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(slugDateTime);
}

function formatDateWithTimeZone(date: Date, language: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function countWords(content: { body: string }[] = []) {
  return content.reduce((sum, block) => sum + block.body.split(/\s+/).length, 0);
}

interface RelatedRead {
  post: BlogListPost;
  /** Word count per language; null when the full post could not be loaded. */
  words: Record<'en' | 'es', number> | null;
}

function isPlainClick(event: React.MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function BlogPost() {
  const { t, i18n } = useTranslation();

  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [post, setPost] = useState<Post | null>(() => initialPublicPost<Post>(slug));
  const [editors, setEditors] = useState<Editor[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [trail, setTrail] = useState<Trail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const search = useSearch();
  useEffect(() => {
    if (!post || !slug) return;
    const language = explicitLanguage(new URLSearchParams(search).get('lang'))
      ?? (post.translations.es.slug === slug ? 'es' : 'en');
    if (normalizeLanguage(i18n.language) !== language) void i18n.changeLanguage(language);
    const translatedSlug = post.translations[language].slug;
    const meta = buildBlogMeta({ post, lang: language, slug: translatedSlug });
    meta.jsonLd = buildBlogJsonLd({ post, lang: language, slug: translatedSlug }, 'Robles.AI');
    applyPageMetadata(meta);
    setTrail(recordVisit(post.translations[language].title, { blogPost: true }));
  }, [post, slug, search, i18n]);

  useEffect(() => {
    const controller = new AbortController();
    if (slug) {
      setFetchError(false);
      setNotFound(false);
      const initial = initialPublicPost<Post>(slug);
      setPost(initial);
      if (!initial || reloadKey > 0) fetch(`/api/blog/${encodeURIComponent(slug)}`, { signal: controller.signal })
        .then((res) => {
          // Preserve the requested URL and show not-found content instead of another 200 shell.
          if (res.status === 404) {
            setNotFound(true);
            return null;
          }
          // Any other non-OK status is a fetch failure → error state (Req 19.3).
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data) setPost(data);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          // Non-404 failure (network/5xx): show a retryable error state instead
          // of a hard redirect to not-found (Req 19.3).
          console.error('Error fetching post:', err);
          setFetchError(true);
        });
    }
    fetch('/api/editors', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setEditors(data.editors))
      .catch(() => { /* Editorial attribution is optional; article content remains usable. */ });

    return () => controller.abort();
  }, [slug, reloadKey]);

  // "More reading": the latest stories from three other editors. The list API has no word counts, so each pick's JSON is fetched
  // for its reading time (3 small requests, after the article is on screen).
  const [related, setRelated] = useState<RelatedRead[]>([]);
  useEffect(() => {
    if (!post) return;
    const controller = new AbortController();
    const { signal } = controller;
    const list = (query: string) =>
      fetch(`/api/blog?${query}`, { signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (Array.isArray(data?.posts) ? (data.posts as BlogListPost[]) : []))
        .catch(() => [] as BlogListPost[]);
    Promise.all([list(`editorId=${post.editorId}&limit=2`), list('limit=24')])
      .then(([sameAuthor, latest]) => {
        // One more story by this post's editor, then one each from other editors.
        const fromAuthor = sameAuthor.find((p) => p.slug !== post.slug);
        const usedEditors = new Set([post.editorId]);
        const others = latest.filter(
          (p) => p.slug !== post.slug && !usedEditors.has(p.editorId) && Boolean(usedEditors.add(p.editorId)),
        );
        const picks = (fromAuthor ? [fromAuthor, ...others] : others).slice(0, 3);
        return Promise.all(
          picks.map((pick) =>
            fetch(`/api/blog/${encodeURIComponent(pick.slug)}`, { signal })
              .then((res) => (res.ok ? (res.json() as Promise<Post>) : null))
              .catch(() => null)
              .then((full): RelatedRead => ({
                post: pick,
                words: full ? { en: countWords(full.translations.en?.content), es: countWords(full.translations.es?.content) } : null,
              })),
          ),
        );
      })
      .then((items) => { if (!signal.aborted) setRelated(items); });
    return () => controller.abort();
  }, [post]);

  // Back-to-top visibility + scroll-spy: the active TOC entry is the last
  // section heading that has crossed the top 30% of the viewport.
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      let active = -1;
      document.querySelectorAll<HTMLElement>('article h2[id^="section-"]').forEach((heading) => {
        if (active === -1 || heading.getBoundingClientRect().top < window.innerHeight * 0.3) {
          active = Number(heading.id.slice('section-'.length));
        }
      });
      setActiveSection(Math.max(active, 0));
      // Reading progress: 0 when the article card reaches the top of the
      // viewport, 100 when its bottom reaches the bottom of the viewport.
      const body = document.getElementById('post-body');
      if (body) {
        const rect = body.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const ratio = scrollable > 0 ? -rect.top / scrollable : rect.bottom <= window.innerHeight ? 1 : 0;
        setReadProgress(Math.round(Math.min(1, Math.max(0, ratio)) * 100));
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post, search]);

  if (notFound) return <NotFound />;

  if (fetchError && !post) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <ErrorState
          onRetry={() => {
            setFetchError(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  if (!post) return <LoadingState className="min-h-[40vh]" />;

  const pageLanguage = explicitLanguage(new URLSearchParams(search).get('lang'))
    ?? (post.translations.es.slug === slug ? 'es' : 'en');
  const translation = post.translations[pageLanguage];
  const editor = editors.find((e) => e.id === post.editorId);
  const langQuery = pageLanguage === 'es' ? '?lang=es' : '';

  const postDate = extractDateTimeFromSlug(post.slug);

  const wordCount = countWords(translation.content);
  const readingTimeMinutes = Math.ceil(wordCount / 200);
  const tocItems = translation.content
    .map((block, idx) => ({ heading: isRoblesSection(block.heading) ? asQuestion(block.heading, pageLanguage) : block.heading, idx }))
    .filter((item) => item.heading);
  const hasToc = tocItems.length > 1;

  // Crumbs: Home, then this tab's trail. A direct load has no list page in the
  // trail yet, so a static Blog crumb fills that gap.
  const crumbs = trail?.items ?? [];
  const current = trail?.current ?? -1;
  const trailStartsAtBlog = crumbs[0]?.url.split('?')[0] === '/blog';

  function staticCrumb(href: string, label: React.ReactNode, ariaLabel?: string) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        onClick={(e) => {
          if (!isPlainClick(e)) return;
          e.preventDefault();
          navigate(href);
        }}
        className="inline-flex items-center text-blue-200 transition-colors hover:text-white"
      >
        {label}
      </a>
    );
  }

  const separator = <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-slate-500" />;

  function renderToc() {
    return (
      <ol className="space-y-1">
        {tocItems.map(({ heading, idx }) => {
          const active = idx === activeSection;
          return (
            <li key={idx}>
              <a
                href={`#section-${idx}`}
                aria-current={active ? 'location' : undefined}
                className={`block rounded-r-lg border-l-2 py-2 pl-3 pr-2 text-sm leading-snug transition-colors ${
                  active
                    ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {heading}
              </a>
            </li>
          );
        })}
      </ol>
    );
  }

  const sectionLabelClass = 'mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500';

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50">
      {/* ── Reading progress bar, pinned under the site header ── */}
      <div
        role="progressbar"
        aria-label={t('blogPost.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readProgress}
        className="fixed inset-x-0 top-[var(--header-h)] z-40 h-1 bg-slate-200/60"
      >
        <div
          className="h-full origin-left bg-gradient-to-r from-blue-600 to-blue-400 transition-transform duration-150 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${readProgress / 100})` }}
        />
      </div>
      {/* ── Masthead: same navy/blue treatment as the AI News Hub ── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0b1a3d] to-blue-950" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(147,197,253,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />

        <div className="container relative mx-auto px-4 pb-12 pt-6 sm:px-6 md:pb-16 md:pt-8">
          {/* History-based breadcrumbs: earlier crumbs go back, later ones forward */}
          <nav aria-label={t('blogPost.breadcrumb')}>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
              <li className="flex items-center">
                {staticCrumb(`/${langQuery}`, <Home className="h-4 w-4" />, t('blogPost.home'))}
              </li>
              {!trailStartsAtBlog && (
                <li className="flex items-center gap-1.5">
                  {separator}
                  {staticCrumb(`/blog${langQuery}`, t('blogHub.title'))}
                </li>
              )}
              {crumbs.map((crumb) => (
                <li key={crumb.pos} className="flex min-w-0 items-center gap-1.5">
                  {separator}
                  {crumb.pos === current ? (
                    <span aria-current="page" className="max-w-[14rem] truncate font-medium text-white sm:max-w-xs">
                      {crumb.title}
                    </span>
                  ) : (
                    <a
                      href={crumb.url}
                      title={crumb.title}
                      onClick={(e) => {
                        if (!isPlainClick(e)) return;
                        e.preventDefault();
                        window.history.go(crumb.pos - current);
                      }}
                      className={`max-w-[10rem] truncate transition-colors sm:max-w-[14rem] ${
                        crumb.pos < current ? 'text-blue-200 hover:text-white' : 'text-slate-400 hover:text-blue-200'
                      }`}
                    >
                      {crumb.title}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-8 grid gap-10 md:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-14 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
            {(editor?.specialty || post.categories?.[0]) && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                {editor?.specialty || post.categories[0]}
              </p>
            )}
            <h1 className="text-3xl font-bold leading-[1.15] tracking-tight md:text-5xl lg:text-[3.25rem]">
              {translation.title}
            </h1>
            {translation.excerpt && (
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">
                {translation.excerpt}
              </p>
            )}
            </div>

            {/* Byline card: authors + date/reading stats, beside the title on desktop */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:p-6">
              <div className="flex flex-wrap gap-x-8 gap-y-4 lg:flex-col">
                <div className="flex items-center gap-3">
                  <img
                    src="/avatars/antonio-robles-headshot.png"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                  />
                  <div className="text-sm leading-tight">
                    <p className="text-xs text-slate-400">{t('blogModal.publishedBy')}</p>
                    <p className="font-semibold text-white">{t('blogModal.authorName')}</p>
                  </div>
                </div>
                {editor && (
                  <div className="flex items-center gap-3">
                    <img
                      src={`/avatars/${editor.id}-headshot.png`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                    />
                    <div className="text-sm leading-tight">
                      <p className="text-xs text-slate-400">{t('blogModal.aiAssistant')}</p>
                      <p className="font-semibold text-white">{editor.name}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-5 space-y-1 border-t border-white/10 pt-4 text-sm text-slate-400">
                <time className="block" dateTime={Number.isNaN(postDate.getTime()) ? undefined : postDate.toISOString()}>
                  {formatDateWithTimeZone(postDate, pageLanguage)}
                </time>
                <p className="tabular-nums">
                  {wordCount} {t('blogModal.words')} · {readingTimeMinutes} {t('blogModal.minRead')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body: sticky TOC on the left, article on the right ── */}
      <div className="container mx-auto px-4 py-10 sm:px-6 md:py-14">
        <div
          className={
            hasToc
              ? 'lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-14'
              : 'mx-auto max-w-5xl'
          }
        >
          {hasToc && (
            <aside id="toc" aria-labelledby="toc-title" className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100vh-var(--header-h)-3rem)] overflow-y-auto pb-4">
                <h2 id="toc-title" className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span className="h-px w-6 bg-blue-600" />
                  {t('blogPost.toc')}
                  <span className="ml-auto tabular-nums tracking-normal text-blue-600">{readProgress}%</span>
                </h2>
                {renderToc()}
              </div>
            </aside>
          )}

          <div className="min-w-0">
            {/* Phones/tablets: the TOC collapses above the article */}
            {hasToc && (
              <details className="group mb-6 rounded-2xl border border-slate-200 bg-white p-4 lg:hidden">
                <summary className="tap-target flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <ListTree className="h-4 w-4 text-blue-600" />
                  {t('blogPost.toc')}
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-3">{renderToc()}</div>
              </details>
            )}

            <div id="post-body" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10 xl:p-14">
              <BlogArticle content={translation.content} keywords={post.keywords} />

              {/* ── Categories + keywords (tags) ── */}
              {(post.categories?.length > 0 || post.keywords?.length > 0) && (
                <div className="mt-10 space-y-6 border-t border-slate-100 pt-6">
                  {post.categories?.length > 0 && (
                    <div>
                      <h3 className={sectionLabelClass}>{t('blogModal.categories')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {post.categories.map((category, idx) => (
                          <span key={idx} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {post.keywords?.length > 0 && (
                    <div>
                      <h3 className={sectionLabelClass}>{t('blogModal.keywords')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {post.keywords.map((keyword, idx) => (
                          <span key={idx} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            #{keyword.replace(/\s+/g, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Sources ── */}
              {post.sources?.length > 0 && (
                <div className="mt-10">
                  <h3 className={sectionLabelClass}>{t('blogModal.sources')}</h3>
                  <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {post.sources.map((source, idx) => (
                      <li key={idx}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug text-slate-800 break-anywhere group-hover:text-blue-700">{source.title}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">{source.source}</span>
                          </span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-600" />
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* ── Editorial transparency ── */}
              <aside className="mt-10 flex gap-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200/70">
                <img
                  src={editor ? `/avatars/${editor.id}-headshot.png` : '/avatars/antonio-robles-headshot.png'}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('blogModal.aboutEditor')}</p>
                  {editor && (
                    <q className="mt-1.5 block text-sm font-medium italic text-slate-800">{editor.signature}</q>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t('blogModal.aiDisclosure')}</p>
                </div>
              </aside>
            </div>

            {/* ── More reading ── */}
            {related.length > 0 && (
              <section aria-labelledby="related-title" className="mt-12">
                <h2 id="related-title" className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span className="h-px w-6 bg-blue-600" />
                  {t('blogPost.related')}
                  <span className="h-px flex-1 bg-slate-200" />
                </h2>
                {/* Featured card on the left (same author when available), two compact cards stacked on the right */}
                <ul className="grid gap-4 lg:grid-cols-2 lg:grid-rows-2">
                  {related.map(({ post: item, words }, i) => {
                    const text = item.translations[pageLanguage]?.title ? item.translations[pageLanguage] : item.translations.en;
                    const href = listPostPath(item, pageLanguage);
                    const itemWords = words?.[pageLanguage] || words?.en;
                    const itemEditor = editors.find((e) => e.id === item.editorId);
                    const featured = i === 0;
                    const sameAuthor = item.editorId === post.editorId;
                    return (
                      <li key={item.slug} className={featured ? 'lg:row-span-2' : undefined}>
                        <a
                          href={href}
                          onClick={(e) => {
                            if (!isPlainClick(e)) return;
                            e.preventDefault();
                            navigate(href);
                            window.scrollTo(0, 0);
                          }}
                          className={`group relative flex h-full flex-col overflow-hidden rounded-2xl transition duration-200 hover:-translate-y-0.5 ${
                            featured
                              ? 'bg-gradient-to-br from-slate-950 via-[#0b1a3d] to-blue-950 p-6 text-white shadow-xl shadow-blue-950/15 md:p-7'
                              : 'border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5'
                          }`}
                        >
                          {featured && (
                            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/25 blur-3xl transition-opacity group-hover:opacity-80" />
                          )}
                          <p className={`relative mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${featured ? 'text-blue-200' : 'text-blue-600'}`}>
                            {sameAuthor && itemEditor
                              ? t('blogPost.moreFromAuthor', { name: itemEditor.name })
                              : itemEditor?.specialty ?? ''}
                          </p>
                          <h3
                            className={`relative font-semibold leading-snug line-clamp-3 transition-colors ${
                              featured ? 'text-xl md:text-2xl' : 'text-base text-slate-900 group-hover:text-blue-700'
                            }`}
                          >
                            {text.title}
                          </h3>
                          <p
                            className={`relative mt-2 text-sm leading-relaxed ${
                              featured ? 'text-slate-300 line-clamp-4 md:text-base' : 'mb-4 text-slate-600 line-clamp-2'
                            }`}
                          >
                            {text.excerpt}
                          </p>
                          <span
                            className={`relative mt-auto flex items-center gap-2 text-xs font-medium ${
                              featured ? 'pt-6 text-slate-300' : 'border-t border-slate-100 pt-4 text-slate-500'
                            }`}
                          >
                            {itemEditor && (
                              <>
                                <img
                                  src={`/avatars/${itemEditor.id}-headshot.png`}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className={`shrink-0 rounded-full object-cover ring-2 ${featured ? 'h-9 w-9 ring-white/20' : 'h-7 w-7 ring-white'}`}
                                />
                                <span className={`min-w-0 truncate ${featured ? 'font-semibold text-white' : 'text-slate-700'}`}>{itemEditor.name}</span>
                              </>
                            )}
                            {itemWords ? (
                              <span className="flex shrink-0 items-center gap-1">
                                {itemEditor && <span aria-hidden className={`mr-1 h-1 w-1 rounded-full ${featured ? 'bg-slate-500' : 'bg-slate-300'}`} />}
                                <Clock className="h-3.5 w-3.5" />
                                {Math.ceil(itemWords / 200)} {t('blogModal.minRead')}
                              </span>
                            ) : null}
                            <ArrowRight
                              className={`ml-auto h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${
                                featured ? 'text-white' : 'text-slate-300 group-hover:text-blue-600'
                              }`}
                            />
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {post.stats && (
              <div className="mt-6 text-center text-xs text-slate-500">
                {pageLanguage === 'es'
                  ? `Tokens usados: Prompt ${post.stats.prompt_tokens}, Respuesta ${post.stats.completion_tokens}, Total ${post.stats.total_tokens}`
                  : `Tokens used: Prompt ${post.stats.prompt_tokens}, Completion ${post.stats.completion_tokens}, Total ${post.stats.total_tokens}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BACK TO TOP BUTTON */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`tap-target fixed bottom-8 right-8 rounded-full bg-slate-900 text-white shadow-lg transition-all duration-300 hover:bg-blue-600 ${
          showScrollTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-label={t('blogPost.backToTop')}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
