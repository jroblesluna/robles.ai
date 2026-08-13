# Design Document: Blog FTS5 Search

## Architecture Overview

The blog search feature adds a full-text search layer on top of the existing SQLite-backed blog system. It follows the existing project architecture: server-side Express routes backed by `better-sqlite3`, consumed by a React frontend via `@tanstack/react-query`.

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ BlogList.tsx                                      │  │
│  │  ├── SearchInput (debounced, 300ms)               │  │
│  │  ├── SearchResults (cards with highlights)        │  │
│  │  └── PostGrid (existing infinite scroll)          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ GET /api/blog/search?q=&lang=&page=&limit=
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Express)                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ server/searchRoutes.ts                            │  │
│  │  └── searchBlog(q, lang?, page, limit)            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ server/fts/indexer.ts                             │  │
│  │  ├── ensureFtsTable(db)                           │  │
│  │  ├── indexPost(db, post)                          │  │
│  │  ├── indexAllPosts(db, postsDir)                  │  │
│  │  └── extractContent(post) → IndexableRow[]        │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ SQLite (dominical.db)                             │  │
│  │  └── blog_fts (FTS5 virtual table)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. FTS Indexer (`server/fts/indexer.ts`)

Responsible for creating the FTS5 table and managing index operations (initial bulk load and incremental updates).

**Responsibilities:**
- Create the `blog_fts` FTS5 virtual table if it doesn't exist
- Extract searchable content from post JSON objects
- Insert/replace rows in the FTS5 table (2 per post: en + es)
- Skip invalid posts gracefully with logging
- Provide idempotent operations (re-indexing replaces, doesn't duplicate)

### 2. Search Route (`server/searchRoutes.ts`)

An Express router exposing the search API endpoint.

**Responsibilities:**
- Validate query parameters (`q` required, `lang` optional, `page`/`limit` with defaults)
- Execute FTS5 MATCH queries with BM25 ranking and column weights
- Generate highlight snippets using FTS5 `snippet()` function
- Return paginated, ranked results with total count
- Handle errors gracefully (400 for bad input, 500 for server errors)

### 3. Search Component (`src/components/BlogSearch.tsx`)

A React component embedded in the BlogList page that provides the search UI.

**Responsibilities:**
- Render a search input with search icon and conditional clear button
- Debounce user input (300ms) before triggering API calls
- Manage search state (idle, loading, results, no-results)
- Replace the post grid with search results when active
- Navigate to post detail on result click
- Pass current i18next language as the `lang` parameter

### 4. Cron Integration (modification to `server/routes.ts`)

After the existing hourly cron completes post generation and slug index rebuild, it calls the indexer to add new posts to the FTS table.

## Interfaces

### FTS5 Table Schema

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS blog_fts USING fts5(
  slug UNINDEXED,
  language UNINDEXED,
  title,
  excerpt,
  content,
  categories,
  tokenize='unicode61 remove_diacritics 2'
);
```

- `slug` and `language` are `UNINDEXED` — they're stored for retrieval but not searched.
- `title`, `excerpt`, `content`, `categories` are the searchable columns.

### Indexer Module Interface

```typescript
// server/fts/indexer.ts
import type Database from 'better-sqlite3';

export interface IndexableRow {
  slug: string;
  language: 'en' | 'es';
  title: string;
  excerpt: string;
  content: string;     // All headings + bodies concatenated
  categories: string;  // Space-separated category names
}

export interface PostJson {
  slug: string;
  categories: string[];
  translations: {
    en?: {
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
    es?: {
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
  };
}

/**
 * Creates the blog_fts virtual table if it doesn't already exist.
 * Logs an info message if the table already exists.
 */
export function ensureFtsTable(db: Database.Database): void;

/**
 * Extracts indexable rows from a post JSON object.
 * Returns an array of 0-2 rows (one per available translation).
 * Skips translations missing required fields.
 */
export function extractContent(post: PostJson): IndexableRow[];

/**
 * Indexes a single post (upserts both language rows).
 * Uses INSERT OR REPLACE via rowid matching on (slug, language).
 */
export function indexPost(db: Database.Database, post: PostJson): void;

/**
 * Bulk indexes all posts from a directory (recursive JSON scan).
 * Runs within a single transaction for atomicity.
 * Skips invalid files with warning logs.
 * Idempotent: clears existing rows before re-inserting.
 */
export function indexAllPosts(db: Database.Database, postsDir: string): Promise<void>;

/**
 * Indexes an array of newly generated posts (incremental).
 * Each post is upserted individually; errors on one post don't stop others.
 */
export function indexNewPosts(db: Database.Database, posts: PostJson[]): void;
```

### Search API Interface

```typescript
// Request: GET /api/blog/search?q=<terms>&lang=<en|es>&page=<n>&limit=<n>

// Response (200)
interface SearchResponse {
  results: SearchResult[];
  total: number;
}

interface SearchResult {
  slug: string;
  language: 'en' | 'es';
  title: string;
  excerpt: string;
  snippet: string;       // HTML string with <mark>...</mark> highlights
  score: number;         // BM25 relevance score (negative, closer to 0 = more relevant)
}

// Response (400) - Missing or empty q
interface SearchErrorResponse {
  error: string;
}
```

### Search Component Props

```typescript
// src/components/BlogSearch.tsx
interface BlogSearchProps {
  onSearchActive: (active: boolean) => void;  // Notifies parent to hide/show grid
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
```

## Data Flow

### Initial Migration Flow

```
1. Run: tsx server/fts/migrate.ts
2. ensureFtsTable(db) → CREATE VIRTUAL TABLE IF NOT EXISTS
3. indexAllPosts(db, 'server/data/posts/')
   a. Recursively collect all .json files
   b. BEGIN TRANSACTION
   c. DELETE FROM blog_fts (clean slate for idempotency)
   d. For each file:
      - Parse JSON
      - extractContent(post) → IndexableRow[]
      - INSERT into blog_fts
      - Skip on error, log warning
   e. COMMIT
```

### Incremental Indexing Flow (Hourly Cron)

```
1. Cron generates new posts via generateHistoricalPosts()
2. SlugIndex rebuilt
3. Read newly generated post files
4. For each new post:
   - Parse JSON
   - indexPost(db, post) → INSERT OR REPLACE
   - On parse error: log and continue
```

### Search Query Flow

```
1. User types in SearchInput → debounced 300ms
2. Frontend sends GET /api/blog/search?q=<terms>&lang=<currentLang>&page=1&limit=9
3. Backend validates params (400 if q missing/empty)
4. Backend executes:
   SELECT slug, language, title, excerpt,
          snippet(blog_fts, 4, '<mark>', '</mark>', '...', 32) as snippet,
          bm25(blog_fts, 0, 0, 10, 5, 2, 3) as score
   FROM blog_fts
   WHERE blog_fts MATCH ?
   [AND language = ?]
   ORDER BY score, slug DESC
   LIMIT ? OFFSET ?
5. Count query for total: SELECT count(*) FROM blog_fts WHERE blog_fts MATCH ? [AND language = ?]
6. Return { results, total }
7. Frontend renders SearchResults cards with highlighted snippets
```

### BM25 Weight Configuration

The `bm25()` function arguments correspond to columns in order:
- `slug`: weight 0 (UNINDEXED, not used)
- `language`: weight 0 (UNINDEXED, not used)
- `title`: weight 10 (highest priority — exact title matches are most relevant)
- `excerpt`: weight 5 (summary text, important but secondary)
- `content`: weight 2 (body text, many matches expected, lower individual weight)
- `categories`: weight 3 (category match indicates topical relevance)

Note: BM25 returns negative values where more negative = more relevant. We order ASC for BM25 (or negate the value for display).

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Post JSON missing `translations.en` or `translations.es` | Skip that language row; if both missing, skip file entirely. Log warning. |
| Post JSON unparseable (invalid JSON) | Skip file, log error with file path. Continue processing remaining files. |
| FTS5 table already exists on migration | Log info message, skip CREATE. |
| Search query parameter `q` missing/empty | Return HTTP 400 `{ error: "Query parameter 'q' is required" }` |
| Search query parameter `lang` invalid value | Ignore the filter (search all languages) |
| Database error during search | Return HTTP 500 `{ error: "Internal server error" }`, log full error server-side |
| Database error during indexing (bulk) | Transaction rollback, throw error to caller |
| Database error during indexing (incremental, single post) | Log error, continue with next post |

## File Structure

```
server/
  fts/
    indexer.ts        # FTS table creation + content extraction + indexing logic
    migrate.ts        # CLI script for one-time bulk migration
  searchRoutes.ts     # Express router for GET /api/blog/search
  routes.ts           # Modified: imports indexer, calls after cron
  db.ts               # Existing: no changes needed

src/
  components/
    BlogSearch.tsx     # Search input + results display component
  hooks/
    useSearch.ts       # Custom hook encapsulating search API + debounce logic
  pages/
    BlogList.tsx       # Modified: integrates BlogSearch component
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Two rows per post with correct slug and language

*For any* valid post JSON with both `translations.en` and `translations.es` present, indexing that post into the FTS5 table SHALL produce exactly 2 rows: one with `language = 'en'` and one with `language = 'es'`, both sharing the same `slug` value equal to the post's slug field.

**Validates: Requirements 1.3, 2.3, 2.4, 3.2**

### Property 2: Content extraction completeness

*For any* valid post translation containing N content sections (each with heading and body), the `extractContent` function SHALL produce a content string that contains every heading and every body value from that translation joined together.

**Validates: Requirements 2.2**

### Property 3: Accent-insensitive matching

*For any* text containing accented characters (e.g., "café", "información"), inserting it into the FTS5 table and searching for the equivalent unaccented term (e.g., "cafe", "informacion") SHALL return a match.

**Validates: Requirements 1.2**

### Property 4: Invalid post handling

*For any* post JSON object missing required translation fields (title, excerpt, or content), the `extractContent` function SHALL return an empty array for that translation, and `indexPost` SHALL not insert any row for the missing translation without throwing an error.

**Validates: Requirements 2.5, 3.4**

### Property 5: Indexing idempotency

*For any* set of valid posts, running `indexAllPosts` N times (where N ≥ 1) SHALL produce the same number of rows in the FTS5 table and the same content as running it exactly once.

**Validates: Requirements 2.7**

### Property 6: Upsert replaces content

*For any* post that has been indexed with content A, re-indexing the same post (same slug and language) with content B SHALL result in only content B being present in the FTS5 table for that slug and language — no duplicates and no stale data.

**Validates: Requirements 3.3**

### Property 7: Resilient batch processing

*For any* batch of post JSON objects containing a mix of valid and invalid entries, indexing the batch SHALL successfully index all valid posts regardless of how many invalid posts are in the batch.

**Validates: Requirements 3.4**

### Property 8: Empty query validation

*For any* query string that is empty or composed entirely of whitespace characters, the Search API SHALL return HTTP 400.

**Validates: Requirements 4.5**

### Property 9: Pagination bounds

*For any* valid search query with pagination parameters `page` and `limit`, the number of results returned SHALL be less than or equal to `limit`, and results across sequential pages SHALL not overlap (no duplicate slugs).

**Validates: Requirements 4.4**

### Property 10: Language filter correctness

*For any* search query with a specified `lang` parameter ('en' or 'es'), all returned results SHALL have their `language` field equal to the specified `lang` value.

**Validates: Requirements 4.3, 7.1**

### Property 11: Results ordered by descending relevance

*For any* search query returning multiple results, the sequence of relevance scores SHALL be in non-increasing order (most relevant first). When scores are equal, results SHALL be ordered by slug descending (most recent date prefix first).

**Validates: Requirements 4.7, 6.2, 6.3**

### Property 12: Highlight snippets contain mark tags

*For any* search result returned by the Search API, if the result includes a non-empty snippet, that snippet SHALL contain at least one `<mark>...</mark>` tag pair wrapping matched text.

**Validates: Requirements 4.9**

### Property 13: Response shape correctness

*For any* valid search query (non-empty `q`), the Search API response SHALL contain a `results` array and a `total` number where `total` is greater than or equal to the length of `results`.

**Validates: Requirements 4.8, 4.10**

### Property 14: Title-weighted ranking (metamorphic)

*For any* search term T and two posts P1 and P2 where P1 contains T only in its title and P2 contains T only in its content body, searching for T SHALL rank P1 higher than P2 (P1 appears before P2 in results).

**Validates: Requirements 6.1**

### Property 15: Search result cards render required fields

*For any* search result returned from the API, the rendered search result card SHALL display the post title, a highlight snippet with visible `<mark>` tag emphasis, and the post date.

**Validates: Requirements 5.9**
