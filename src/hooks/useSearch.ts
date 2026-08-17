import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface SearchResult {
  slug: string;
  language: 'en' | 'es';
  title: string;
  excerpt: string;
  snippet: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

interface UseSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSearchActive: boolean;
  hasMore: boolean;
  loadMore: () => void;
  clearSearch: () => void;
}

const LIMIT = 9;

export function useSearch(): UseSearchResult {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce the query input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const lang = i18n.language as 'en' | 'es';
  const trimmedQuery = debouncedQuery.trim();

  // Reset results when query or language changes
  useEffect(() => {
    setResults([]);
    setPage(1);
    setTotal(0);
    setHasMore(false);
  }, [trimmedQuery, lang]);

  // Fetch results when query, page, or language changes
  useEffect(() => {
    if (trimmedQuery.length === 0) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const isFirstPage = page === 1;
    if (isFirstPage) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const url = '/api/blog/search?q=' + encodeURIComponent(trimmedQuery) + '&lang=' + lang + '&page=' + page + '&limit=' + LIMIT;

    fetch(url, { credentials: 'include', signal: controller.signal })
      .then((res) => {
        if (!res.ok) return { results: [], total: 0 } as SearchResponse;
        return res.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (isFirstPage) {
          setResults(data.results);
        } else {
          setResults((prev) => [...prev, ...data.results]);
        }
        setTotal(data.total);
        setHasMore(data.results.length === LIMIT);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('[Search] Fetch error:', err);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
        setIsLoadingMore(false);
      });

    return () => {
      controller.abort();
    };
  }, [trimmedQuery, lang, page]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isLoadingMore, isLoading]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setPage(1);
    setHasMore(false);
  }, []);

  const isSearchActive = query.trim().length > 0;

  return {
    query,
    setQuery,
    results,
    total,
    isLoading,
    isLoadingMore,
    isSearchActive,
    hasMore,
    loadMore,
    clearSearch,
  };
}
