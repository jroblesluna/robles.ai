# Implementation Plan: Blog FTS5 Search

## Overview

Implement full-text search for the robles.ai blog using SQLite FTS5. The implementation follows a bottom-up approach: indexer module first, then migration script, search API route, and finally the frontend search component. Each layer builds on the previous one and includes property-based tests to validate correctness properties from the design.

## Tasks

- [x] 1. Create FTS Indexer module
  - [x] 1.1 Implement `server/fts/indexer.ts` with `ensureFtsTable`, `extractContent`, `indexPost`, `indexAllPosts`, and `indexNewPosts`
    - Create `server/fts/` directory
    - Define `IndexableRow` and `PostJson` interfaces
    - Implement `ensureFtsTable(db)` — creates FTS5 virtual table with unicode61 tokenizer and `remove_diacritics 2`
    - Implement `extractContent(post)` — extracts 0-2 IndexableRow objects from a post (one per available translation), concatenating all heading+body content sections
    - Implement `indexPost(db, post)` — upserts a single post's rows using INSERT OR REPLACE
    - Implement `indexAllPosts(db, postsDir)` — bulk indexes all posts in a transaction (DELETE + re-insert for idempotency)
    - Implement `indexNewPosts(db, posts)` — incremental indexing, error-resilient per post
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4_

  - [x] 1.2 Write property tests for `extractContent` (Properties 1, 2, 4)
    - **Property 1: Two rows per post with correct slug and language** — For any valid post with both translations, `extractContent` produces exactly 2 rows with correct slug and language values
    - **Property 2: Content extraction completeness** — For any translation with N content sections, the extracted content string contains every heading and body value
    - **Property 4: Invalid post handling** — For any post missing required fields, `extractContent` returns an empty array for that translation without throwing
    - **Validates: Requirements 1.3, 2.2, 2.3, 2.4, 2.5, 3.2, 3.4**

  - [x] 1.3 Write property tests for indexing operations (Properties 5, 6, 7)
    - **Property 5: Indexing idempotency** — Running `indexAllPosts` N times produces the same row count as running it once
    - **Property 6: Upsert replaces content** — Re-indexing a post with new content replaces old content, no duplicates
    - **Property 7: Resilient batch processing** — A batch with valid and invalid posts indexes all valid posts regardless of invalid ones
    - **Validates: Requirements 2.7, 3.3, 3.4**

- [x] 2. Create migration script
  - [x] 2.1 Implement `server/fts/migrate.ts` CLI script
    - Import `ensureFtsTable` and `indexAllPosts` from indexer
    - Open the existing `server/data/dominical.db` database
    - Call `ensureFtsTable(db)` then `indexAllPosts(db, 'server/data/posts/')`
    - Log progress (table creation, number of posts indexed)
    - Handle errors with process exit code
    - _Requirements: 1.1, 1.4, 2.1, 2.6_

- [x] 3. Checkpoint - Verify indexer and migration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Search API route
  - [x] 4.1 Create `server/searchRoutes.ts` with search endpoint
    - Create Express router with `GET /api/blog/search`
    - Validate `q` parameter (return 400 if missing/empty)
    - Accept optional `lang` (en|es), `page` (default 1), `limit` (default 9)
    - Execute FTS5 MATCH query with BM25 ranking: `bm25(blog_fts, 0, 0, 10, 5, 2, 3)`
    - Generate highlight snippets using `snippet(blog_fts, 4, '<mark>', '</mark>', '...', 32)`
    - Apply language filter when `lang` parameter is valid
    - Order by BM25 score ASC (more negative = more relevant), then slug DESC
    - Return paginated results with `{ results, total }` response shape
    - Handle database errors with 500 response and server-side logging
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 6.1, 6.2, 6.3, 7.1, 7.2_

  - [x] 4.2 Register search route in `server/routes.ts`
    - Import `searchRoutes` and mount at `/api/blog`
    - _Requirements: 4.1_

  - [x] 4.3 Write property tests for Search API (Properties 8, 9, 10, 11, 12, 13)
    - **Property 8: Empty query validation** — Any empty or whitespace-only query returns HTTP 400
    - **Property 9: Pagination bounds** — Results count ≤ limit, no duplicate slugs across pages
    - **Property 10: Language filter correctness** — When `lang` specified, all results have matching language
    - **Property 11: Results ordered by descending relevance** — Scores are in non-increasing order; ties broken by slug DESC
    - **Property 12: Highlight snippets contain mark tags** — Non-empty snippets contain at least one `<mark>...</mark>` pair
    - **Property 13: Response shape correctness** — Response has `results` array and `total` ≥ results.length
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 4.10, 6.2, 6.3, 7.1**

  - [x] 4.4 Write property test for BM25 ranking (Property 14)
    - **Property 14: Title-weighted ranking (metamorphic)** — A post with search term in title only ranks higher than a post with the same term in content body only
    - **Validates: Requirements 6.1**

- [x] 5. Checkpoint - Verify search API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement frontend search
  - [x] 6.1 Create `src/hooks/useSearch.ts` custom hook
    - Implement debounced search with 300ms delay
    - Use `@tanstack/react-query` for API fetching
    - Expose `query`, `setQuery`, `results`, `total`, `isLoading`, `isSearchActive`, `clearSearch`
    - Pass current i18next language as `lang` parameter
    - _Requirements: 5.4, 5.7_

  - [x] 6.2 Create `src/components/BlogSearch.tsx` component
    - Render search input with `Search` icon (lucide-react) and conditional `X` clear button
    - Use `useSearch` hook for state management
    - Display loading indicator while request is in-flight
    - Render result cards with title, highlighted snippet (`<mark>` rendered as styled text), and post date
    - Navigate to post detail page on card click using wouter
    - Show localized "no results found" message when results are empty
    - Call `onSearchActive` callback to notify parent of search state
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.8, 5.9, 5.10, 5.11_

  - [x] 6.3 Integrate `BlogSearch` into `src/pages/BlogList.tsx`
    - Add BlogSearch component above the post grid
    - Hide post grid and infinite scroll when search is active
    - Restore normal feed when search is cleared
    - _Requirements: 5.1, 5.5, 5.6_

  - [x] 6.4 Write unit tests for BlogSearch component (Property 15)
    - **Property 15: Search result cards render required fields** — Each result card displays title, highlighted snippet with `<mark>` emphasis, and post date
    - **Validates: Requirements 5.9**

- [x] 7. Wire incremental indexing into cron
  - [x] 7.1 Modify `server/routes.ts` to call `indexNewPosts` after hourly cron generates posts
    - Import `indexNewPosts` from `server/fts/indexer`
    - After existing post generation and slug index rebuild, read new post files and call `indexNewPosts`
    - Handle errors gracefully (log and continue, don't break cron)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project already has `fast-check` and `vitest` configured — no test framework setup needed
- The existing `better-sqlite3` database at `server/data/dominical.db` is where the FTS5 table will be created

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["6.1", "7.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4"] }
  ]
}
```
