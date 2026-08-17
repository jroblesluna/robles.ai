import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  isSearchActive: boolean;
  clearSearch: () => void;
}

export function useSearch(): UseSearchResult {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the query input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const lang = i18n.language as 'en' | 'es';
  const trimmedQuery = debouncedQuery.trim();
  const enabled = trimmedQuery.length > 0;

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['/api/blog/search', trimmedQuery, lang],
    queryFn: async () => {
      const url = `/api/blog/search?q=${encodeURIComponent(trimmedQuery)}&lang=${lang}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        return { results: [], total: 0 };
      }
      return res.json();
    },
    enabled,
    staleTime: 30_000,
  });

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const isSearchActive = query.trim().length > 0;

  return {
    query,
    setQuery,
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading: enabled && isLoading,
    isSearchActive,
    clearSearch,
  };
}
