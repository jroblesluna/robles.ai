// Enhanced BlogList.tsx with scroll pagination, inline pill filters, and improved card design

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import BlogSearch from '@/components/BlogSearch';

interface Post {
  slug: string;
  date: string;
  image?: string;
  editorId: number;
  translations: {
    en: { title: string; excerpt: string; content: { heading: string; body: string }[] };
    es: { title: string; excerpt: string; content: { heading: string; body: string }[] };
  };
}

interface Editor {
  id: number;
  name: string;
  signature: string;
  specialty: string;
  colorPalette: string[];
}

function extractDateTimeFromSlug(slug: string): Date {
  const isoString = slug
    .slice(0, 19)
    .replace(/-/g, ':')
    .replace(/^([\d]{4}):([\d]{2}):([\d]{2}):/, '$1-$2-$3T')
    .replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(isoString);
}

function formatDate(date: Date, language: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function BlogList() {
  const { i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editorFilter, setEditorFilter] = useState<number | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const lang = i18n.language as 'en' | 'es';

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!hasMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasMore]
  );

  useEffect(() => {
    fetch('/api/editors')
      .then((res) => res.json())
      .then((data) => setEditors(data.editors));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({ page: page.toString(), limit: '9' });
    if (editorFilter) query.append('editorId', editorFilter.toString());

    setLoading(true);
    fetch(`/api/blog?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setPosts((prev) => [...prev, ...data.posts]);
        setHasMore(data.posts.length > 0);
      })
      .finally(() => setLoading(false));
  }, [page, editorFilter]);

  function handleFilterChange(id: number | null) {
    if (editorFilter === id) return;
    setEditorFilter(id);
    setPage(1);
    setPosts([]);
  }

  const activeEditor = editors.find((e) => e.id === editorFilter);

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {lang === 'es' ? 'Centro de Noticias IA' : 'AI News Hub'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {lang === 'es'
            ? 'Últimas noticias sobre inteligencia artificial, generadas por nuestro equipo editorial IA'
            : 'Latest insights on artificial intelligence, powered by our AI editorial team'}
        </p>
      </div>

      {/* Search */}
      <BlogSearch onSearchActive={setSearchActive} />

      {!searchActive && (
        <>
          {/* Inline Pill Filters */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => handleFilterChange(null)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                editorFilter === null
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {lang === 'es' ? 'Todos' : 'All'}
            </button>
            {editors.map((editor) => (
              <button
                key={editor.id}
                onClick={() => handleFilterChange(editor.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  editorFilter === editor.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <img
                  src={`/avatars/${editor.id}-headshot.png`}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span>{editor.specialty}</span>
              </button>
            ))}
          </div>

          {/* Results indicator when filter is active */}
          {editorFilter !== null && activeEditor && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <span>
                {lang === 'es' ? `Mostrando posts de ${activeEditor.specialty}` : `Showing ${activeEditor.specialty} posts`}
              </span>
              <button
                onClick={() => handleFilterChange(null)}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors text-xs"
                aria-label={lang === 'es' ? 'Limpiar filtro' : 'Clear filter'}
              >
                &times;
              </button>
            </div>
          )}

          {/* Loading skeletons (initial load) */}
          {posts.length === 0 && loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-100 shadow-md bg-white p-4 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                  <div className="h-5 w-full bg-gray-200 rounded mb-2" />
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-4" />
                  <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded mb-6" />
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div>
                      <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-16 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {posts.map((post, index) => {
              const translation =
                post.translations[lang] || post.translations.en;
              const postDate = extractDateTimeFromSlug(post.slug);
              const formattedDate = formatDate(postDate, lang);
              const editor = editors.find((e) => e.id === post.editorId);
              const accentColor = editor?.colorPalette?.[0] ?? '#a855f7';

              const isLast = index === posts.length - 1;
              return (
                <div ref={isLast ? lastPostRef : null} key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="h-full block rounded-lg border-l-4 border border-gray-100 hover:border-purple-300 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-white p-4"
                    style={{ borderLeftColor: accentColor }}
                  >
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <h2 className="text-lg font-bold mb-1 text-gray-800 line-clamp-2">
                          {translation.title}
                        </h2>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {translation.excerpt}
                        </p>
                      </div>
                      {editor && (
                        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-50">
                          <img
                            src={`/avatars/${editor.id}-headshot.png`}
                            alt={editor.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-xs text-gray-600 font-medium">{editor.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{formattedDate}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Loading indicator for more posts */}
          {loading && posts.length > 0 && (
            <div className="flex justify-center items-center py-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">
                  {lang === 'es' ? 'Cargando más noticias...' : 'Loading more news...'}
                </span>
              </div>
            </div>
          )}

          {/* No more posts */}
          {!hasMore && posts.length > 0 && !loading && (
            <div className="text-center py-8">
              <span className="text-sm text-gray-400">
                {lang === 'es' ? 'No hay más noticias' : 'No more news'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
