import { Router, type Request, type Response } from 'express';
import db from './db.js';
import { ensureFtsTable } from './fts/indexer.js';

// Ensure the FTS5 table exists on module load
ensureFtsTable(db);

const searchRouter = Router();

/**
 * GET /search?q=<terms>&lang=<en|es>&page=<n>&limit=<n>
 *
 * Full-text search across blog posts using FTS5 with BM25 ranking.
 * Returns paginated results with highlight snippets.
 */
searchRouter.get('/search', (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;

    // Validate required q parameter
    if (!q || q.trim().length === 0) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    // Parse optional lang parameter — ignore if invalid
    const langParam = req.query.lang as string | undefined;
    const lang = langParam === 'en' || langParam === 'es' ? langParam : undefined;

    // Parse pagination with sensible defaults and bounds
    let page = parseInt(req.query.page as string, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit as string, 10);
    if (isNaN(limit) || limit < 1) limit = 9;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;

    // Build the search query dynamically based on lang filter
    const matchValue = q.trim();

    if (lang) {
      // With language filter
      const results = db.prepare(`
        SELECT slug, language, title, excerpt,
               snippet(blog_fts, 4, '<mark>', '</mark>', '...', 32) as snippet,
               bm25(blog_fts, 0, 0, 10, 5, 2, 3) as score
        FROM blog_fts
        WHERE blog_fts MATCH ?
          AND language = ?
        ORDER BY score, slug DESC
        LIMIT ? OFFSET ?
      `).all(matchValue, lang, limit, offset) as Array<{
        slug: string;
        language: 'en' | 'es';
        title: string;
        excerpt: string;
        snippet: string;
        score: number;
      }>;

      const totalRow = db.prepare(`
        SELECT count(*) as total
        FROM blog_fts
        WHERE blog_fts MATCH ?
          AND language = ?
      `).get(matchValue, lang) as { total: number };

      res.json({ results, total: totalRow.total });
    } else {
      // Search all languages
      const results = db.prepare(`
        SELECT slug, language, title, excerpt,
               snippet(blog_fts, 4, '<mark>', '</mark>', '...', 32) as snippet,
               bm25(blog_fts, 0, 0, 10, 5, 2, 3) as score
        FROM blog_fts
        WHERE blog_fts MATCH ?
        ORDER BY score, slug DESC
        LIMIT ? OFFSET ?
      `).all(matchValue, limit, offset) as Array<{
        slug: string;
        language: 'en' | 'es';
        title: string;
        excerpt: string;
        snippet: string;
        score: number;
      }>;

      const totalRow = db.prepare(`
        SELECT count(*) as total
        FROM blog_fts
        WHERE blog_fts MATCH ?
      `).get(matchValue) as { total: number };

      res.json({ results, total: totalRow.total });
    }
  } catch (err) {
    console.error('[Search] Error executing search query:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default searchRouter;
