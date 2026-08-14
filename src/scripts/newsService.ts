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
  const apiKey = process.env.NEWS_API_KEY;
  const fromDate = date;
  const toDate = date;

  // Fetch more articles (10) so we can filter out weak ones
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&to=${toDate}&sortBy=popularity&language=en&pageSize=10&apiKey=${apiKey}`;

  console.log(`Fetching news from URL: ${url}`);
  const response = await axios.get(url);
  const articles = response.data.articles;

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
