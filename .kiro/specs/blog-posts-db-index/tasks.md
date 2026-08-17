# Implementation Plan: Blog Posts DB Index

## Overview

Replace the file-system scan in `GET /api/blog` with indexed SQLite queries using a new `blog_posts_index` table. The implementation mirrors the existing FTS5 indexer pattern (`server/fts/indexer.ts`) with a dedicated listing indexer module at `server/listing/indexer.ts`. JSON files remain the source of truth; the table is a derived read cache populated via full rebuild or incremental upsert.

## Tasks

- [x] 1. Create listing indexer module with core interfaces and table management
  - [x] 1.1 Create `server/listing/indexer.ts` with interfaces, table creation, and extraction function
    - Define `ListingPostRow` and `PostJson` interfaces (extend FTS PostJson with `date`, `editorId`)
    - Implement `ensureListingTable(db)` — creates `blog_posts_index` table with `slug` PK, indexes on `editor_id` and `date DESC`
    - Implement `extractListingRow(post)` — maps PostJson to ListingPostRow, returns null for invalid posts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3_

  - [x] 1.2 Implement `rebuildListingIndex` and `indexListingPosts` functions in `server/listing/indexer.ts`
    - Implement `rebuildListingIndex(db, postsDir)` — recursive JSON scan, DELETE all + INSERT all in single transaction, skip invalid files with warnings, return `{ indexed, skipped }`
    - Implement `indexListingPosts(db, posts)` — upsert array of posts using INSERT OR REPLACE, log per-post errors and continue
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Write unit and property tests for the listing indexer module
  - [x] 2.1 Write unit tests for `extractListingRow` and `ensureListingTable`
    - Test valid post extraction (correct field mapping)
    - Test missing slug returns null
    - Test missing translations produces null title/excerpt
    - Test `ensureListingTable` is idempotent (call twice without error)
    - _Requirements: 1.1, 1.4, 2.3_

  - [x] 2.2 Write property test: Extraction preserves data (Property 8)
    - **Property 8: Extraction Preserves Data**
    - For any valid PostJson, `extractListingRow(post)` produces a row with matching slug, date, editorId→editor_id, categories as JSON, translations title/excerpt
    - **Validates: Requirements 2.3, 1.1**

  - [x] 2.3 Write property test: Rebuild round-trip (Property 1)
    - **Property 1: Rebuild Round-Trip**
    - For any set of valid PostJson files on disk, rebuilding the index and querying all rows produces the same set of posts as scanning files directly
    - Use temp directories with generated JSON files
    - **Validates: Requirements 2.7**

  - [x] 2.4 Write property test: Rebuild idempotence (Property 2)
    - **Property 2: Rebuild Idempotence**
    - Calling `rebuildListingIndex` twice produces the same database state as calling it once
    - **Validates: Requirements 2.2, 2.4**

  - [x] 2.5 Write property test: Upsert preserves latest data (Property 3)
    - **Property 3: Upsert Preserves Latest Data**
    - Calling `indexListingPosts` with a post results in the row containing exact metadata from that post
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Checkpoint - Core module verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Migrate the listing API and add admin reindex endpoint
  - [x] 4.1 Rewrite `GET /api/blog` handler in `server/routes.ts` to query `blog_posts_index`
    - Replace file-scan logic with SQL query using dynamic WHERE clause
    - Support `page`, `limit`, `editorId`, and `category` query parameters
    - Add `LIMIT`/`OFFSET` pagination and `ORDER BY date DESC`
    - Return same response shape: `{ posts: [...], total: N }` with `slug`, `date`, `editorId`, `translations`
    - Cap `limit` at 100 to prevent abuse
    - Import `ensureListingTable` and call during route setup
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 8.1, 8.2, 8.3, 8.4_

  - [x] 4.2 Add `POST /api/admin/reindex-posts` endpoint in `server/adminRoutes.ts`
    - Import `rebuildListingIndex` from `server/listing/indexer.ts`
    - Protect with `requireAuth` middleware
    - Call `rebuildListingIndex` and return `{ success: true, indexed, skipped }`
    - Return 500 on failure with `{ success: false, error: "Reindex failed" }`
    - _Requirements: 6.1, 6.2_

  - [x] 4.3 Write unit tests for the listing API endpoint
    - Test default pagination (page=1, limit=9)
    - Test editorId filter returns only matching posts
    - Test category filter returns only matching posts
    - Test combined editorId + category filter
    - Test invalid page/limit defaults to safe values
    - _Requirements: 4.2, 4.3, 4.5, 4.7, 8.1, 8.4_

  - [x] 4.4 Write property tests for listing API query behavior
    - **Property 4: Pagination Completeness** — iterating all pages returns exactly N distinct posts
    - **Property 5: Editor Filter Correctness** — filter returns only matching editor_id rows
    - **Property 6: Category Filter Correctness** — filter returns only posts containing the category
    - **Property 7: Date Ordering** — results are in non-increasing date order
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.6, 4.7, 8.1, 8.2**

- [x] 5. Checkpoint - API migration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate with cron job and server startup
  - [x] 6.1 Add incremental listing indexing to the hourly cron job in `server/routes.ts`
    - Import `indexListingPosts` from `server/listing/indexer.ts`
    - After existing `indexNewPosts` FTS call, call `indexListingPosts(db, posts)` for newly generated posts
    - Wrap in try/catch — log error as non-fatal, don't block cron
    - _Requirements: 3.1, 3.5, 7.3, 7.4_

  - [x] 6.2 Add server startup auto-rebuild logic in `server/routes.ts`
    - After route setup, call `ensureListingTable(db)`
    - Query `SELECT COUNT(*) FROM blog_posts_index` — if 0, run `rebuildListingIndex`
    - If rows exist, log that index is populated and skip rebuild
    - Use async IIFE pattern (non-blocking)
    - _Requirements: 6.3, 6.4_

  - [x] 6.3 Write integration tests for cron and startup behavior
    - Test server startup with empty DB triggers rebuild
    - Test cron calls both FTS and listing indexers independently
    - Test detail API `/api/blog/:slug` remains unchanged (reads from JSON)
    - _Requirements: 5.1, 5.2, 7.1, 7.2, 7.4_

- [x] 7. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The listing indexer mirrors the FTS indexer pattern in `server/fts/indexer.ts`
- Use in-memory `better-sqlite3` databases for unit/property tests
- Use temporary directories with generated JSON files for rebuild tests
- Reuse/extend `fast-check` generators from `server/fts/indexer.indexing.property.test.ts`
- The `Detail_API` (`GET /api/blog/:slug`) remains unchanged — it still reads from JSON files
- The frontend (`BlogList.tsx`) requires no changes — response shape is preserved
- Property tests use `fast-check` with minimum 100 iterations per property

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3"] }
  ]
}
```
