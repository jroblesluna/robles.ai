# Requirements Document

## Introduction

Full-text search for the robles.ai blog using SQLite FTS5. Users can search across all blog post content (titles, excerpts, content sections, and categories) in both English and Spanish. The search is integrated inline on the blog listing page — a search bar replaces the post grid with ranked results while active, and restores the normal feed when cleared. Indexing happens via a one-time migration plus incremental updates each time the hourly cron generates new posts.

## Glossary

- **FTS5_Table**: A SQLite FTS5 virtual table (`blog_fts`) that stores tokenized blog post content for full-text search.
- **Search_API**: The Express route `GET /api/blog/search` that accepts a query and returns ranked results.
- **Search_Component**: The React UI element (input field + results list) embedded at the top of the BlogList page.
- **Migration_Script**: A one-time Node.js script that reads all existing blog post JSON files and populates the FTS5_Table.
- **Indexing_Pipeline**: The process responsible for inserting new blog post content into the FTS5_Table, triggered after the hourly cron generates posts.
- **Highlight_Snippet**: A fragment of matching text returned by the Search_API with search term markers for visual emphasis in the UI.
- **Relevance_Score**: The BM25-based ranking score computed by FTS5 to order search results by match quality.

## Requirements

### Requirement 1: FTS5 Table Creation

**User Story:** As a developer, I want a dedicated FTS5 virtual table in the SQLite database, so that the system can perform efficient full-text searches across blog content.

#### Acceptance Criteria

1. THE Migration_Script SHALL create an FTS5 virtual table named `blog_fts` with columns: `slug`, `language`, `title`, `excerpt`, `content`, `categories`.
2. THE FTS5_Table SHALL use the `unicode61` tokenizer with `remove_diacritics 2` for accent-insensitive matching.
3. THE FTS5_Table SHALL store one row per language per post (one row for English content, one row for Spanish content).
4. WHEN the FTS5_Table already exists, THE Migration_Script SHALL skip creation and log an informational message.

### Requirement 2: Initial Indexing Migration

**User Story:** As a developer, I want a one-time migration script that indexes all existing blog posts, so that search works immediately for the full post archive.

#### Acceptance Criteria

1. WHEN executed, THE Migration_Script SHALL recursively scan all JSON files under `server/data/posts/` and insert their content into the FTS5_Table.
2. THE Migration_Script SHALL extract `title`, `excerpt`, concatenated `content` (all heading and body fields joined), and `categories` from each post translation.
3. THE Migration_Script SHALL insert two rows per post: one with `language = 'en'` using `translations.en` fields, and one with `language = 'es'` using `translations.es` fields.
4. THE Migration_Script SHALL use the post file slug as the `slug` column value for both language rows.
5. IF a post JSON file lacks required translation fields, THEN THE Migration_Script SHALL skip that file and log a warning with the file path.
6. THE Migration_Script SHALL execute within a single database transaction to ensure atomicity.
7. THE Migration_Script SHALL be idempotent — re-running the script replaces existing entries without creating duplicates.

### Requirement 3: Incremental Indexing

**User Story:** As a developer, I want new posts to be automatically indexed after the hourly cron generates them, so that fresh content is searchable without manual intervention.

#### Acceptance Criteria

1. WHEN the hourly cron job finishes generating new posts, THE Indexing_Pipeline SHALL index newly created posts into the FTS5_Table.
2. THE Indexing_Pipeline SHALL insert two rows per new post (one English, one Spanish) following the same schema as the Migration_Script.
3. IF a newly generated post already exists in the FTS5_Table (matched by slug and language), THEN THE Indexing_Pipeline SHALL replace the existing row with the updated content.
4. IF the Indexing_Pipeline encounters a parse error on a new post file, THEN THE Indexing_Pipeline SHALL log the error and continue processing remaining posts.

### Requirement 4: Search API Endpoint

**User Story:** As a frontend developer, I want a search API endpoint, so that the UI can query blog posts by keyword and receive ranked results.

#### Acceptance Criteria

1. THE Search_API SHALL be accessible at `GET /api/blog/search`.
2. THE Search_API SHALL accept a required query parameter `q` containing the search terms.
3. THE Search_API SHALL accept an optional query parameter `lang` with values `en` or `es` to filter results by language.
4. THE Search_API SHALL accept optional query parameters `page` (default 1) and `limit` (default 9) for pagination.
5. WHEN the `q` parameter is missing or empty, THE Search_API SHALL return HTTP 400 with an error message.
6. WHEN valid parameters are provided, THE Search_API SHALL query the FTS5_Table using the FTS5 MATCH syntax with the provided search terms.
7. THE Search_API SHALL return results ordered by Relevance_Score (BM25 rank, most relevant first).
8. THE Search_API SHALL return a JSON response with fields: `results` (array of matched posts with slug, language, title, excerpt, Highlight_Snippet, and Relevance_Score) and `total` (total number of matches).
9. THE Search_API SHALL generate Highlight_Snippet values using the FTS5 `snippet()` function with `<mark>` and `</mark>` as delimiters.
10. IF no results match the query, THEN THE Search_API SHALL return an empty `results` array with `total` equal to 0.
11. IF an internal error occurs during search, THEN THE Search_API SHALL return HTTP 500 with a generic error message and log the detailed error server-side.

### Requirement 5: Frontend Search Component

**User Story:** As a blog reader, I want a search bar on the blog page, so that I can quickly find posts by keyword.

#### Acceptance Criteria

1. THE Search_Component SHALL render a text input field at the top of the BlogList page, above the post grid.
2. THE Search_Component SHALL include a search icon (lucide-react `Search`) inside the input as a visual affordance.
3. THE Search_Component SHALL include a clear button (lucide-react `X`) that appears when the input contains text.
4. WHEN the user types in the Search_Component, THE Search_Component SHALL debounce input by 300 milliseconds before sending a request to the Search_API.
5. WHILE a search query is active (input is non-empty), THE Search_Component SHALL replace the normal post grid and infinite scroll with search results.
6. WHEN the user clears the input or deletes all text, THE Search_Component SHALL restore the normal paginated post feed.
7. THE Search_Component SHALL pass the current i18next language as the `lang` parameter to the Search_API.
8. WHILE the Search_API request is in-flight, THE Search_Component SHALL display a loading indicator.
9. WHEN search results are returned, THE Search_Component SHALL display each result as a card showing the post title, the Highlight_Snippet with `<mark>` tags rendered as highlighted text, and the post date.
10. WHEN the user clicks a search result card, THE Search_Component SHALL navigate to the blog post detail page using the result slug.
11. IF the Search_API returns zero results, THEN THE Search_Component SHALL display a localized "no results found" message.

### Requirement 6: Result Ranking

**User Story:** As a blog reader, I want search results ordered by relevance, so that the most pertinent posts appear first.

#### Acceptance Criteria

1. THE Search_API SHALL rank results using the FTS5 BM25 algorithm with column weights: title (weight 10), excerpt (weight 5), content (weight 2), categories (weight 3).
2. THE Search_API SHALL return results in descending order of relevance (highest score first).
3. WHEN multiple posts have equal Relevance_Score, THE Search_API SHALL use the post slug as a secondary sort (most recent first by date prefix in slug).

### Requirement 7: Bilingual Support

**User Story:** As a bilingual reader, I want to search in my preferred language and also find posts in the other language when needed.

#### Acceptance Criteria

1. WHEN the `lang` parameter is provided, THE Search_API SHALL filter results to only return rows matching that language.
2. WHEN the `lang` parameter is omitted, THE Search_API SHALL search across both English and Spanish content and return all matching rows.
3. THE Search_Component SHALL default the `lang` parameter to the user's currently selected i18next language.
4. THE FTS5_Table SHALL index content independently for each language so that language-specific tokenization is preserved.
