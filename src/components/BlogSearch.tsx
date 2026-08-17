import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';

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

export default function BlogSearch({ onSearchActive }: BlogSearchProps) {
  const { i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { query, setQuery, results, isLoading, isLoadingMore, isSearchActive, hasMore, loadMore, clearSearch } = useSearch();

  const lang = i18n.language as 'en' | 'es';
  const observer = useRef<IntersectionObserver | null>(null);

  const lastResultRef = useCallback(
    (node: HTMLButtonElement | null) => {
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

  useEffect(() => {
    onSearchActive(isSearchActive);
  }, [isSearchActive, onSearchActive]);

  return (
    <div className="w-full mb-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === 'es' ? 'Buscar posts...' : 'Search posts...'}
          className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition text-gray-700 placeholder-gray-400"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            aria-label={lang === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      )}

      {/* No Results */}
      {isSearchActive && !isLoading && results.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500 text-sm">
            {lang === 'es' ? 'No se encontraron resultados' : 'No results found'}
          </p>
        </div>
      )}

      {/* Search Results */}
      {isSearchActive && !isLoading && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
          {results.map((result, index) => {
            const postDate = extractDateTimeFromSlug(result.slug);
            const formattedDate = formatDateWithTimeZone(postDate, lang);
            const isLast = index === results.length - 1;

            return (
              <button
                key={`${result.slug}-${result.language}`}
                ref={isLast ? lastResultRef : null}
                onClick={() => setLocation(`/blog/${result.slug}`)}
                className="text-left block rounded-lg border border-white hover:border-purple-400 hover:-mt-2 hover:mb-2 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden bg-white p-4"
              >
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                      {result.title}
                    </h3>
                    <div
                      className="text-sm text-gray-600 mb-3 search-snippet"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-auto">{formattedDate}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      )}

      {/* No more results */}
      {isSearchActive && !hasMore && results.length > 0 && !isLoading && !isLoadingMore && (
        <div className="text-center py-8">
          <span className="text-sm text-gray-400">
            {lang === 'es' ? 'No hay más resultados' : 'No more results'}
          </span>
        </div>
      )}

      {/* Inline styles for mark highlighting */}
      <style>{`
        .search-snippet mark {
          background-color: #fef08a;
          padding: 0.1em 0.2em;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
