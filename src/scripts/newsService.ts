import axios from 'axios';
import * as cheerio from 'cheerio';

interface ArticleResult {
  articleId: number;
  title: string;
  url: string;
  urlToImage: string;
  source: string;
  content: string;
  liveContent: string; // <--- nuevo campo
}

export async function searchNews(query: string, date: string): Promise<ArticleResult[]> {
  const apiKey = process.env.NEWS_API_KEY;
  const fromDate = date;
  const toDate = date;

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&to=${toDate}&sortBy=popularity&language=en&pageSize=5&apiKey=${apiKey}`;

  console.log(`Fetching news from URL: ${url}`);
  const response = await axios.get(url);
  const articles = response.data.articles;
  console.log(`Fetched articles: ${JSON.stringify(articles)}`);

  const results: ArticleResult[] = [];

  let articleId = 0;
  for (const article of articles) {
    let liveContent = '';
    articleId++;
    try {
      const page = await axios.get(article.url, { timeout: 10000 }); // 10 seconds timeout
      const $ = cheerio.load(page.data);

      // Extraer el contenido visible de la página:
      // Vamos a intentar extraer los <p> más importantes
      let paragraphs = $('p')
        .map((_, p) => $(p).text())
        .get()
        .filter(text => text.length > 50) // evitar basura como "Accept Cookies"
        .slice(0, 10) // máximo 10 párrafos para no saturar
        .join('\n\n');

      if (paragraphs.length > 10000) {
        paragraphs = paragraphs.slice(0, 9997) + '...'; // Leave room for ellipsis
      }

      liveContent = paragraphs || '';
    } catch (err) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.warn(`⚠️ Could not scrape ${article.url}:`, errorMessage);
      liveContent = '';
    }

    results.push({
      articleId: articleId,
      title: article.title,
      url: article.url,
      urlToImage: article.urlToImage,
      source: article.source.name,
      content: article.content,
      liveContent: liveContent,
    });
  }

  return results;
}