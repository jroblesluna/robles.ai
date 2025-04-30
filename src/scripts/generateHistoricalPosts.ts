import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { searchNews } from './newsService';
import { savePost, listRecentTopics } from './postUtils';
import { buildPostPrompt } from './postPrompt';
import { updateSitemap } from './sitemapService';

dotenv.config();

// Necesario en ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateDatePrefix(date: Date, editorId: number): string {
  const clonedDate = new Date(date);
  clonedDate.setUTCHours((editorId - 1) % 24, 0, 0, 0);
  const year = clonedDate.getUTCFullYear();
  const month = String(clonedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(clonedDate.getUTCDate()).padStart(2, '0');
  const hours = String(clonedDate.getUTCHours()).padStart(2, '0');
  const minutes = String(clonedDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(clonedDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

async function generateHistoricalPosts(targetDate?: string, targetEditorId?: number) {
  const startDate = new Date('2025-04-29');
  const today = new Date();

  const editorsPath = path.resolve(__dirname, '../../server/data/editors.json');
  const editorsData = JSON.parse(await fs.readFile(editorsPath, 'utf-8'));
  const editors = editorsData.editors;

  const datesToProcess: Date[] = [];
  console.log(`🗓️ Parameters: `);
  console.log(`- Target Date: ${targetDate || 'No date specified'}`);
  console.log(`- Target Editor ID: ${targetEditorId || 'No editor specified'}`);
  console.log(`- Start Date: ${startDate.toISOString().slice(0, 10)}`);
  if (targetDate) {
    datesToProcess.push(new Date(targetDate));
  } else {
    for (let date = new Date(startDate); date <= today; date.setDate(date.getDate() + 1)) {
      datesToProcess.push(new Date(date));
    }
  }

  for (const date of datesToProcess) {
    const dateString = date.toISOString().slice(0, 10);
    const editorsToProcess = targetEditorId
      ? editors.filter((editor: any) => editor.id === targetEditorId)
      : editors;

    for (const editor of editorsToProcess) {
      const recentTopics = await listRecentTopics(dateString);
      const news = await searchNews(editor.specialty, dateString);

      if (!news.length) {
        console.warn(`⚠️ No news found for ${editor.name} on ${dateString}. Skipping.`);
        continue;
      }
      const compactedNews = news.map(article => {
        console.log('Processing article Title:', article.title); // Log the article being processed
        console.log('Processing article URL:', article.url); // Log the article URL
        console.log('Article Content:', article.content); // Log the length of the article content
        console.log('Article Content length:', article.content.length); // Log the length of the article content
        console.log('Article Live length:', article.liveContent.length); // Log the length of the article content
        return {
          articleId: article.articleId,
          title: article.title,
          source: article.source,
          content: (article.liveContent && article.liveContent.length > article.content.length)
            ? article.liveContent
            : article.content
        };
      });

      const { systemPrompt, userPrompt } = buildPostPrompt(editor, compactedNews, recentTopics);

      const temperature = randomBetween(editor.min_temperature, editor.max_temperature);
      const top_p = randomBetween(editor.min_top_p, editor.max_top_p);

      console.log(`🚀 Generating post for ${editor.name} on ${dateString}`);
      console.log(`Temperature: ${temperature.toFixed(2)}, Top_p: ${top_p.toFixed(2)}`);

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          top_p,
          max_tokens: 15000,
        });
        //Simulate response
        /*
        const response = {
          choices: [
            {
              message: {
                content: `{
                  "translations": {
                    "en": {
                      "title": "Sample Title",
                      "excerpt": "Sample Excerpt",
                      "content": [
                        { "heading": "Sample Heading", "body": "Sample Body" }
                      ]
                    },
                    "es": {
                      "title": "Título de muestra",
                      "excerpt": "Extracto de muestra",
                      "content": [
                        { "heading": "Encabezado de muestra", "body": "Cuerpo de muestra" }
                      ]
                    }
                  },
                  "image": "https://example.com/image.jpg",
                  "sources": [
                    { "articleId": 1, "title": "Source Title", "source": "Source Name" }
                  ],
                  "translations": {
                    "en": {
                      "slug": "sample-slug"
                    },
                    "es": {
                      "slug": "slug-de-muestra"
                    }
                  }
                }`,
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300
          }
        };*/

        let content = response.choices[0]?.message?.content;
        if (!content) {
          console.error(`❌ No content returned for ${editor.name} on ${dateString}`);
          continue;
        }

        content = content.replace(/```json\s*|\s*```/g, '').trim();
        const post = JSON.parse(content);

        post.editorId = editor.id;
        const datePrefix = generateDatePrefix(date, editor.id);
        post.date = datePrefix;

        if (post.translations?.en?.slug) {
          post.translations.en.slug = `${datePrefix}-${post.translations.en.slug}`;
          post.slug = post.translations.en.slug;
        }
        if (post.translations?.es?.slug) {
          post.translations.es.slug = `${datePrefix}-${post.translations.es.slug}`;
        }

        if (Array.isArray(post.sources)) {
          post.sources = post.sources.map((source: { articleId: number; title: string; source: string }) => {
            const matchedArticle = news.find(a => a.articleId === source.articleId);
            if (matchedArticle) {
              return {
                ...source,
                url: matchedArticle.url,
                urlToImage: matchedArticle.urlToImage
              };
            }
            return source;
          });
        }

        post.stats = {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        };

        await savePost(post, dateString);
        await updateSitemap(post.slug, dateString);

        console.log(`✅ Post generated for ${editor.name} on ${datePrefix}`);
      } catch (error) {
        console.error(`❌ Error generating post for ${editor.name} on ${dateString}:`, error);
      }
    }
  }
}

// Capturar argumentos
const args = process.argv.slice(2);
const targetDate = args[0];        // formato YYYY-MM-DD
const targetEditorId = args[1] ? parseInt(args[1], 10) : undefined;

// Llamar función principal
generateHistoricalPosts(targetDate, targetEditorId);