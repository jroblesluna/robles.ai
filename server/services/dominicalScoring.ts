import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import db from '../db.js';

// Reconstruct __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to posts directory
const POSTS_DIR = path.resolve(__dirname, './data/posts');

export interface PostSummary {
  slug: string;
  titleEn: string;
  titleEs: string;
  excerpt: string;
  date: string;
  categories: string[];
}

export interface ScoredPost {
  slug: string;
  title: string;
  score: number;
  reason: string;
}

/**
 * Reads all post JSON files from the last N days.
 * Scans the `server/data/posts/YYYY/MM/DD/` directory structure.
 */
export function getRecentPosts(days: number = 7): PostSummary[] {
  const posts: PostSummary[] = [];
  const now = new Date();

  // Generate list of date directories to scan (last N days)
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dayDir = path.join(POSTS_DIR, year, month, day);

    if (!fs.existsSync(dayDir)) {
      continue;
    }

    const files = fs.readdirSync(dayDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(dayDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const enTranslation = content.translations?.en;
        const esTranslation = content.translations?.es;

        if (!enTranslation || !esTranslation) {
          continue;
        }

        // Extract date from filename: YYYY-MM-DD-HH-mm-ss-slug.json
        const dateStr = `${year}-${month}-${day}`;

        posts.push({
          slug: enTranslation.slug,
          titleEn: enTranslation.title,
          titleEs: esTranslation.title,
          excerpt: enTranslation.excerpt,
          date: dateStr,
          categories: content.categories || [],
        });
      } catch (err) {
        console.error(`Error reading post file ${file}:`, err);
      }
    }
  }

  return posts;
}

/**
 * Sends collected posts to GPT-4o for scoring.
 * Returns sorted array of { slug, title, score, reason } (highest score first).
 */
export async function scorePostsWithGPT(
  posts: PostSummary[],
  apiKey: string
): Promise<ScoredPost[]> {
  if (posts.length === 0) {
    return [];
  }

  // Pre-filter: limit to 30 posts for reliable GPT scoring
  // Select diverse posts across dates and categories
  let postsToScore = posts;
  if (posts.length > 30) {
    // Sort by date descending and take the most recent, ensuring category diversity
    const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
    const selected: PostSummary[] = [];
    const seenCategories = new Set<string>();
    
    for (const post of sorted) {
      const mainCategory = post.categories[0] || 'general';
      if (!seenCategories.has(mainCategory) || selected.length < 30) {
        selected.push(post);
        seenCategories.add(mainCategory);
      }
      if (selected.length >= 30) break;
    }
    postsToScore = selected;
  }

  const openai = new OpenAI({ apiKey });

  // Prepare post summaries for the prompt
  const postList = postsToScore.map((p, i) => (
    `${i + 1}. [${p.date}] "${p.titleEs}" (EN: "${p.titleEn}")\n   Categories: ${p.categories.join(', ')}\n   Excerpt: ${p.excerpt}`
  )).join('\n\n');

  const systemPrompt = `You are a content curator for "El Dominical IA", a weekly LinkedIn newsletter targeting business professionals in Latin America. Your job is to score news articles based on their relevance, impact, and appeal for this audience.`;

  const userPrompt = `Score the following ${postsToScore.length} news articles for a LinkedIn post targeting business professionals in LatAm. Consider factors like business impact, innovation relevance, audience interest, and storytelling potential.

You MUST return a JSON object with a key "articles" containing an array of objects. Each object must have: slug (string), score (1-10 integer), reason (one line string).

Example format:
{"articles": [{"slug": "example-slug", "score": 8, "reason": "High relevance explanation"}]}

Articles to score:

${postList}

Return the JSON object with ALL ${postsToScore.length} articles scored.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from GPT-4o scoring');
  }

  // Parse the response - it might be wrapped in an object or be a direct array
  let scored: ScoredPost[];
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    scored = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Check if it's a single scored item (has slug, score, reason properties)
    if ('slug' in parsed && 'score' in parsed) {
      console.warn('⚠️ GPT-4o returned a single object instead of an array. Wrapping it.');
      scored = [parsed as ScoredPost];
    } else {
      // Search for any array in the response object (including nested)
      const findArray = (obj: any): any[] | null => {
        for (const value of Object.values(obj)) {
          if (Array.isArray(value) && value.length > 0) {
            return value;
          }
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nested = findArray(value);
            if (nested) return nested;
          }
        }
        return null;
      };

      const foundArray = findArray(parsed);
      
      if (foundArray) {
        scored = foundArray;
      } else {
        console.error('❌ Unexpected GPT-4o response format. Raw response:', content.slice(0, 500));
        throw new Error('Unexpected GPT-4o response format: could not find scored articles array');
      }
    }
  } else {
    console.error('❌ Unexpected GPT-4o response type:', typeof parsed, content.slice(0, 500));
    throw new Error('Unexpected GPT-4o response format: could not find scored articles array');
  }

  // Enrich with titles from our post data and sort by score descending
  const enriched: ScoredPost[] = scored.map((item) => {
    const originalPost = postsToScore.find((p) => p.slug === item.slug);
    return {
      slug: item.slug,
      title: originalPost?.titleEs || originalPost?.titleEn || item.slug,
      score: Number(item.score) || 0,
      reason: item.reason || '',
    };
  });

  // Sort by score descending
  enriched.sort((a, b) => b.score - a.score);

  return enriched;
}

/**
 * Main entry function: reads settings, gets recent posts, scores them, returns top N.
 * Reads `openai_api_key` and `dominical_top_n` from the settings table.
 */
export async function getTopScoredPosts(topN?: number): Promise<ScoredPost[]> {
  // Read settings from DB
  const apiKeyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;

  const topNRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('dominical_top_n') as
    | { value: string | null }
    | undefined;

  const apiKey = apiKeyRow?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set it in Admin Settings or as OPENAI_API_KEY env var.');
  }

  const limit = topN ?? (topNRow?.value ? parseInt(topNRow.value, 10) : 5);

  // Get recent posts
  const posts = getRecentPosts(7);
  if (posts.length === 0) {
    throw new Error('No posts found in the last 7 days.');
  }

  // Score posts with GPT-4o
  const scoredPosts = await scorePostsWithGPT(posts, apiKey);

  // Return top N
  return scoredPosts.slice(0, limit);
}
