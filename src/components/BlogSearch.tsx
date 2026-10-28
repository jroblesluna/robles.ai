import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Search, X, Loader2 } from 'lucide-react';
import { normalizeLanguage, blogSearchPath } from '@shared/seoPolicy';
import { useSearch } from '@/hooks/useSearch';

type SearchState = ReturnType<typeof useSearch>;

interface BlogSearchProps {
  onSearchActive: (active: boolean) => void;
}

function extractDateTimeFromSlug(slug: string): Date {
  const isoString = slug
    .slice(0, 19)
    .replace(/-/g, ':')
    .replace(/^([\d]{4}):([\d]{2}):([\d]{2}):/, '$1-$2-$3T')
    .replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(isoString);
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

/** The search field alone, so pages can place it apart from the results. */
export function BlogSearchInput({ search, className }: { search: SearchState; className?: string }) {
  const { i18n, t } = useTranslation();
  const { query, setQuery, clearSearch } = search;
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        aria-label={t("blogSearch.label")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={lang === 'es' ? 'Buscar en la sala de prensa…' : 'Search the newsroom…'}
        className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-base text-slate-800 shadow-xl shadow-slate-950/10 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="tap-target absolute right-1 top-1/2 -translate-y-1/2 rounded-lg text-slate-400 transition hover:text-slate-700"
          aria-label={lang === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/** Search results (loading, empty, list, infinite scroll) for a search state. */
export function BlogSearchResults({ search }: { search: SearchState }) {
  const { i18n, t } = useTranslation();
  const { query, results, isLoading, isLoadingMore, isSearchActive, hasMore, loadMore } = search;

  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastResultRef = useCallback(
    (node: HTMLAnchorElement | null) => {
      if (!hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasMore, loadMore]
  );

  return (
    <>
      {isSearchActive && !isLoading && results.length > 0 && (
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {lang === 'es' ? `Resultados para “${query}”` : `Results for “${query}”`}
        </h2>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-16" role="status" aria-label={t("blogSearch.loading")}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* No Results */}
      {isSearchActive && !isLoading && results.length === 0 && (
        <div className="py-16 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            {lang === 'es' ? 'No se encontraron resultados' : 'No results found'}
          </p>
        </div>
      )}

      {/* Search Results */}
      {isSearchActive && !isLoading && results.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((result, index) => {
            const postDate = extractDateTimeFromSlug(result.slug);
            const formattedDate = formatDateWithTimeZone(postDate, lang);
            const isLast = index === results.length - 1;

            return (
              <a
                href={blogSearchPath(result.slug, result.language)}
                key={`${result.slug}-${result.language}`}
                ref={isLast ? lastResultRef : null}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
              >
                <h3 className="mb-3 text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-700">
                  {result.title}
                </h3>
                <div
                  className="search-snippet mb-5 text-sm leading-relaxed text-slate-600"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">{formattedDate}</p>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600" />
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-10" role="status" aria-label={t("blogSearch.loading")}>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* No more results */}
      {isSearchActive && !hasMore && results.length > 0 && !isLoading && !isLoadingMore && (
        <div className="py-10 text-center">
          <span className="text-sm text-slate-400">
            {lang === 'es' ? 'No hay más resultados' : 'No more results'}
          </span>
        </div>
      )}

      {/* Inline styles for mark highlighting */}
      <style>{`
        .search-snippet mark {
          background-color: #dbeafe;
          color: #1e3a8a;
          padding: 0.05em 0.25em;
          border-radius: 3px;
        }
      `}</style>
    </>
  );
}

export default function BlogSearch({ onSearchActive }: BlogSearchProps) {
  const search = useSearch();
  const { isSearchActive } = search;

  useEffect(() => {
    onSearchActive(isSearchActive);
  }, [isSearchActive, onSearchActive]);

  return (
    <div className="w-full mb-6">
      <BlogSearchInput search={search} />
      <div className="mt-6">
        <BlogSearchResults search={search} />
      </div>
    </div>
  );
}
