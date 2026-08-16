import axios from 'axios';
import * as cheerio from 'cheerio';

interface ArticleResult {
  articleId: number;
  title: string;
  url: string;
  urlToImage: string;
  source: string;
  content: string;
  liveContent: string;
}

// --- NewsAPI Key Rotation ---
const NEWS_API_KEYS: string[] = (process.env.NEWS_API_KEYS || process.env.NEWS_API_KEY || '').split(',').filter(k => k.trim());
let currentKeyIndex = 0;

function getNextApiKey(): string {
  if (NEWS_API_KEYS.length === 0) throw new Error('No NEWS_API_KEY(S) configured');
  const key = NEWS_API_KEYS[currentKeyIndex % NEWS_API_KEYS.length];
  currentKeyIndex++;
  return key.trim();
}

function rotateToNextKey(): string {
  if (NEWS_API_KEYS.length <= 1) throw new Error('All NewsAPI keys exhausted (rate limited)');
  const key = NEWS_API_KEYS[currentKeyIndex % NEWS_API_KEYS.length];
  currentKeyIndex++;
  console.log(`  Rotating to NewsAPI key #${(currentKeyIndex % NEWS_API_KEYS.length) + 1}/${NEWS_API_KEYS.length}`);
  return key.trim();
}

/**
 * Extract the main textual content from an HTML page.
 * Tries multiple strategies: <article>, main content areas, then falls back to <p> tags.
 */
function extractContent($: cheerio.CheerioAPI): string {
  // Strategy 1: Look for <article> or known content containers
  const contentSelectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.story-body',
    '.article-body',
    '.content-body',
    'main',
  ];

  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      const paragraphs = el
        .find('p')
        .map((_, p) => $(p).text().trim())
        .get()
        .filter((text) => text.length > 40)
        .slice(0, 30);

      if (paragraphs.length >= 3) {
        return paragraphs.join('\n\n');
      }
    }
  }

  // Strategy 2: Fall back to all <p> tags on the page
  const allParagraphs = $('p')
    .map((_, p) => $(p).text().trim())
    .get()
    .filter((text) => text.length > 40)
    .slice(0, 25);

  return allParagraphs.join('\n\n');
}

export async function searchNews(query: string, date: string): Promise<ArticleResult[]> {
  const fromDate = date;
  const toDate = date;
  // Try each API key until one works (rotate on 429)
  let articles: any[] = [];
  for (let keyAttempt = 0; keyAttempt < NEWS_API_KEYS.length; keyAttempt++) {
    const apiKey = keyAttempt === 0 ? getNextApiKey() : rotateToNextKey();
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&to=${toDate}&sortBy=popularity&language=en&pageSize=10&apiKey=${apiKey}`;
    console.log(`Fetching news: "${query}" key #${(currentKeyIndex % NEWS_API_KEYS.length) + 1}`);
    try {
      const response = await axios.get(url);
      articles = response.data.articles || [];
      break;
    } catch (err: any) {
      if (err?.response?.status === 429 && keyAttempt < NEWS_API_KEYS.length - 1) {
        console.log(`  NewsAPI rate limited (429). Rotating to next key...`);
        continue;
      }
      throw err;
    }
  }
  const results: ArticleResult[] = [];
  let articleId = 0;

  for (const article of articles) {
    let liveContent = '';
    articleId++;

    try {
      const page = await axios.get(article.url, {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RoblesAI/1.0; +https://robles.ai)',
        },
      });
      const $ = cheerio.load(page.data);

      // Remove noise elements before extraction
      $('script, style, nav, footer, header, aside, .sidebar, .comments, .ad, [class*="cookie"]').remove();

      let content = extractContent($);

      // Cap at 15000 chars to stay within token budget
      if (content.length > 15000) {
        content = content.slice(0, 14997) + '...';
      }

      liveContent = content;
    } catch (err) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.warn(`⚠️ Could not scrape ${article.url}:`, errorMessage);
      liveContent = '';
    }

    results.push({
      articleId,
      title: article.title,
      url: article.url,
      urlToImage: article.urlToImage,
      source: article.source.name,
      content: article.content || '',
      liveContent,
    });
  }

  // Filter out articles with insufficient content (less than 300 chars of usable text)
  const MIN_CONTENT_LENGTH = 300;
  const richResults = results.filter((r) => {
    const bestContent = r.liveContent.length > r.content.length ? r.liveContent : r.content;
    return bestContent.length >= MIN_CONTENT_LENGTH;
  });

  // Return at least the top 5 rich articles, or all results if filtering removes too many
  if (richResults.length >= 3) {
    console.log(`📰 ${richResults.length}/${results.length} articles passed content filter`);
    return richResults.slice(0, 7);
  }

  console.log(`📰 Content filter too aggressive, returning top ${Math.min(5, results.length)} articles`);
  return results.slice(0, 5);
}
