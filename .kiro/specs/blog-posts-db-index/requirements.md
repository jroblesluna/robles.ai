# Requirements Document

## Introduction

Migrate the blog post listing from scanning ~800+ JSON files on every request to using SQLite as a fast read index. JSON files remain the single source of truth (the hourly cron generates them), and the database serves as a derived read cache for listing, pagination, and filtering. This eliminates the O(n) file-scan per request, replacing it with indexed SQL queries while maintaining the ability to rebuild the index from files at any time.

## Glossary

- **Blog_Index_Table**: A SQLite table (`blog_posts_index`) that stores denormalized blog post metadata for fast listing queries.
- **Listing_API**: The Express route `GET /api/blog` that returns paginated, filterable blog post metadata.
- **Detail_API**: The Express route `GET /api/blog/:slug` that reads a single blog post's full content from the JSON file.
- **Index_Rebuild_Script**: A function that scans all JSON files under `server/data/posts/` and repopulates the Blog_Index_Table from scratch.
- **Incremental_Indexer**: The process that inserts newly generated post metadata into the Blog_Index_Table after the hourly cron creates new JSON files.
- **Post_JSON_File**: A JSON file stored at `server/data/posts/YYYY/MM/DD/slug.json` containing the full blog post data including slug, date, editorId, categories, and translations.
- **FTS5_Table**: The existing `blog_fts` virtual table used for full-text search (remains unchanged by this feature).

## Requirements

### Requirement 1: Blog Index Table Creation

**User Story:** As a developer, I want a SQLite table that stores blog post metadata, so that listing queries can be served from indexed database reads instead of file-system scans.

#### Acceptance Criteria

1. THE Blog_Index_Table SHALL be created with columns: `slug` (TEXT, PRIMARY KEY), `date` (TEXT, NOT NULL), `editor_id` (INTEGER, NOT NULL), `categories` (TEXT), `title_en` (TEXT), `excerpt_en` (TEXT), `title_es` (TEXT), `excerpt_es` (TEXT), `created_at` (TEXT, NOT NULL).
2. THE Blog_Index_Table SHALL have an index on the `editor_id` column for efficient editor filtering.
3. THE Blog_Index_Table SHALL have an index on the `date` column for efficient date-based sorting.
4. WHEN the database is initialized, THE system SHALL create the Blog_Index_Table if it does not already exist.
5. THE Blog_Index_Table SHALL store categories as a JSON array string for flexible querying.

### Requirement 2: Full Index Rebuild

**User Story:** As a developer, I want a rebuild function that repopulates the index from all JSON files, so that the database can be reconstructed from the source of truth at any time.

#### Acceptance Criteria

1. WHEN invoked, THE Index_Rebuild_Script SHALL recursively scan all Post_JSON_File entries under `server/data/posts/` and insert their metadata into the Blog_Index_Table.
2. THE Index_Rebuild_Script SHALL clear all existing rows from the Blog_Index_Table before inserting new data to ensure idempotency.
3. THE Index_Rebuild_Script SHALL extract `slug`, `date`, `editorId`, `categories`, and translation metadata (`title`, `excerpt`) for both `en` and `es` from each Post_JSON_File.
4. THE Index_Rebuild_Script SHALL execute within a single database transaction for atomicity.
5. IF a Post_JSON_File cannot be parsed, THEN THE Index_Rebuild_Script SHALL skip that file, log a warning with the file path, and continue processing remaining files.
6. WHEN the rebuild completes, THE Index_Rebuild_Script SHALL log the total number of posts indexed and the number of files skipped.
7. FOR ALL valid Post_JSON_File entries, rebuilding the index then querying all rows SHALL produce the same set of posts as scanning the files directly (round-trip property).

### Requirement 3: Incremental Indexing on Cron

**User Story:** As a developer, I want new posts to be automatically added to the index after the hourly cron generates them, so that fresh content appears in listings without a full rebuild.

#### Acceptance Criteria

1. WHEN the hourly cron job finishes generating new posts, THE Incremental_Indexer SHALL insert the new post metadata into the Blog_Index_Table.
2. THE Incremental_Indexer SHALL accept an array of post objects and insert or replace each one in the Blog_Index_Table using an upsert strategy (INSERT OR REPLACE).
3. IF a post with the same slug already exists in the Blog_Index_Table, THEN THE Incremental_Indexer SHALL replace the existing row with the updated metadata.
4. IF the Incremental_Indexer encounters a parse error on a post, THEN THE Incremental_Indexer SHALL log the error and continue processing remaining posts.
5. THE Incremental_Indexer SHALL be callable from the same cron code path that currently calls `indexNewPosts` for the FTS5_Table.

### Requirement 4: Listing API Migration

**User Story:** As a blog reader, I want the blog listing page to load quickly, so that I can browse posts without long wait times caused by file-system scanning.

#### Acceptance Criteria

1. WHEN a request is received, THE Listing_API SHALL query the Blog_Index_Table instead of scanning Post_JSON_File entries on disk.
2. THE Listing_API SHALL accept query parameters `page` (default 1) and `limit` (default 9) for pagination.
3. THE Listing_API SHALL accept an optional query parameter `editorId` to filter posts by editor.
4. THE Listing_API SHALL return posts sorted by date in descending order (most recent first).
5. THE Listing_API SHALL return a JSON response with fields: `posts` (array of post objects with `slug`, `date`, `editorId`, `translations` containing `en` and `es` title and excerpt) and `total` (total number of matching posts).
6. THE Listing_API SHALL use SQL `LIMIT` and `OFFSET` for pagination rather than in-memory slicing.
7. WHEN `editorId` is provided, THE Listing_API SHALL filter results using the indexed `editor_id` column.
8. IF an internal error occurs during query execution, THEN THE Listing_API SHALL return HTTP 500 with an error message and log the detailed error server-side.
9. THE Listing_API SHALL maintain the same response shape as the current endpoint so the frontend requires no changes to data consumption logic.

### Requirement 5: Detail API Preservation

**User Story:** As a developer, I want the blog detail endpoint to continue reading JSON files directly, so that full post content is always served from the source of truth.

#### Acceptance Criteria

1. THE Detail_API SHALL continue reading the full post content from the Post_JSON_File on disk.
2. THE Detail_API SHALL remain unmodified by this feature.
3. IF a requested Post_JSON_File does not exist on disk, THEN THE Detail_API SHALL return HTTP 404.

### Requirement 6: Index-File Sync Recovery

**User Story:** As a developer, I want the ability to detect and repair index drift, so that the database index stays consistent with the JSON file source of truth.

#### Acceptance Criteria

1. THE system SHALL expose the Index_Rebuild_Script as an API endpoint `POST /api/admin/reindex-posts` (protected by admin authentication).
2. WHEN the reindex endpoint is called, THE system SHALL execute the full Index_Rebuild_Script and return the count of posts indexed.
3. THE system SHALL automatically run the Index_Rebuild_Script on server startup if the Blog_Index_Table is empty (zero rows).
4. IF the Blog_Index_Table contains rows on server startup, THEN THE system SHALL skip the automatic rebuild and log that the index is already populated.

### Requirement 7: FTS5 Compatibility

**User Story:** As a developer, I want the existing full-text search functionality to remain unchanged, so that search continues working alongside the new listing index.

#### Acceptance Criteria

1. THE existing FTS5_Table (`blog_fts`) SHALL remain unchanged in schema and data.
2. THE existing `GET /api/blog/search` endpoint SHALL continue functioning without modification.
3. THE Incremental_Indexer for the Blog_Index_Table SHALL operate independently from the existing `indexNewPosts` function for the FTS5_Table.
4. WHEN the hourly cron generates new posts, THE system SHALL call both the Incremental_Indexer (for listing) and `indexNewPosts` (for FTS) independently.

### Requirement 8: Category Filtering Support

**User Story:** As a blog reader, I want to filter posts by category, so that I can browse content relevant to specific topics.

#### Acceptance Criteria

1. THE Listing_API SHALL accept an optional query parameter `category` to filter posts by category.
2. WHEN `category` is provided, THE Listing_API SHALL return only posts whose `categories` field contains the specified category value.
3. THE Blog_Index_Table SHALL support efficient category lookups through the stored JSON array format and SQL LIKE or JSON functions.
4. THE Listing_API SHALL support combining `editorId` and `category` filters in a single query.
