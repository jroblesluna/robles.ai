import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { chatOptions, getAiModel } from '../../server/services/aiModels.js';
import dotenv from 'dotenv';
import { searchEditorNews } from './newsService';
import { savePost, listRecentTopics } from './postUtils';
import { buildPostPrompt } from './postPrompt';
import { updateSitemap } from './sitemapService';
import db from '../../server/db.js';

dotenv.config();

// Necesario en ESM:
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Read API key from DB (settings table) with env var fallback
function getOpenAIApiKey(): string {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as { value: string } | undefined;
    if (row?.value) return row.value;
  } catch {
    // DB query failed, fall through to env
  }
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  throw new Error('OpenAI API key not configured. Set it in Admin Settings or as OPENAI_API_KEY env var.');
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getOpenAIApiKey() });
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Check if a post already exists for a given date and editor.
 * Looks for files matching the pattern YYYY-MM-DD-HH-00-00-* in the posts directory.
 */
async function postExistsForDateEditor(dateString: string, editorId: number): Promise<boolean> {
  const [year, month, day] = dateString.split('-');
  const hour = String((editorId - 1) % 24).padStart(2, '0');
  const prefix = `${year}-${month}-${day}-${hour}-00-00-`;

  const isProd = process.env.NODE_ENV === 'production';
  const dirsToCheck = isProd
    ? [
        path.resolve(process.cwd(), `dist/data/posts/${year}/${month}/${day}`),
        path.resolve(process.cwd(), `server/data/posts/${year}/${month}/${day}`),
      ]
    : [path.resolve(process.cwd(), `server/data/posts/${year}/${month}/${day}`)];

  for (const dir of dirsToCheck) {
    try {
      const files = await fs.readdir(dir);
      if (files.some((f) => f.startsWith(prefix) && f.endsWith('.json'))) {
        return true;
      }
    } catch {
      // Directory doesn't exist yet, no duplicates possible
    }
  }

  return false;
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

const DRAFT_ATTEMPTS = 2;
/** With a single source the post drifts off topic: the search matched only loosely. */
const MIN_ARTICLES_PER_POST = 2;
const POST_MAX_TOKENS = 32000;

/**
 * Asks the model for a post, once more if the reply is not a usable post. The whole
 * reply is logged because a refusal arrives as ordinary text.
 */
export async function draftPost(editor: any, systemPrompt: string, userPrompt: string, dateString: string) {
  const client = getOpenAIClient();
  for (let attempt = 1; attempt <= DRAFT_ATTEMPTS; attempt++) {
    const response = await client.chat.completions.create({
      ...chatOptions(getAiModel('ai_model_site_content'), {
        temperature: randomBetween(editor.min_temperature, editor.max_temperature),
        top_p: randomBetween(editor.min_top_p, editor.max_top_p),
        maxTokens: POST_MAX_TOKENS,
      }),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });
    const choice = response.choices[0];
    const content = (choice?.message?.content ?? '').replace(/```json\s*|\s*```/g, '').trim();
    try {
      const post = JSON.parse(content);
      if (post.translations?.en?.content?.length && post.translations?.es?.content?.length) {
        return { post, usage: response.usage };
      }
    } catch {
      // Reported below with the rest of the unusable replies.
    }
    console.error(
      `❌ Unusable reply for ${editor.name} on ${dateString} (attempt ${attempt}/${DRAFT_ATTEMPTS}): ` +
        `finish=${choice?.finish_reason} refusal=${choice?.message?.refusal ?? 'none'} text=${content.slice(0, 500)}`
    );
  }
  return null;
}

export interface GenResult { newsCount: number; tokensUsed: number; skipped?: string }

export async function generateHistoricalPosts(
  targetDate?: string,
  targetEditorId?: number,
  startDateOpc: string = '2025-04-30'
): Promise<GenResult | null> {
  const startDate = new Date(startDateOpc);
  const today = new Date();

  const editorsPath = path.resolve(process.cwd(), 'server/data/editors.json');
  const editorsData = JSON.parse(await fs.readFile(editorsPath, 'utf-8'));
  const editors = editorsData.editors;

  let failed = false;
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
      // Skip if a post already exists for this date-editor combination
      const alreadyExists = await postExistsForDateEditor(dateString, editor.id);
      if (alreadyExists) {
        console.log(`⏭️  Post already exists for ${editor.name} on ${dateString}. Skipping.`);
        return { newsCount: 0, tokensUsed: 0, skipped: 'already_exists' };
        continue;
      }

      const recentTopics = await listRecentTopics(dateString);
      const news = await searchEditorNews([editor.specialty, ...(editor.extraNewsQueries ?? [])], dateString);

      if (news.length < MIN_ARTICLES_PER_POST) {
        console.warn(`⚠️ No news found for ${editor.name} on ${dateString}. Skipping.`);
        return { newsCount: 0, tokensUsed: 0, skipped: 'no_news' };
        continue;
      }

      const compactedNews = news.map((article) => {
        // console.log('Processing article Title:', article.title); // Log the article being processed
        // console.log('Processing article URL:', article.url); // Log the article URL
        // console.log('Article Content:', article.content); // Log the length of the article content
        // console.log('Article Content length:', article.content.length); // Log the length of the article content
        // console.log('Article Live length:', article.liveContent.length); // Log the length of the article content
        return {
          articleId: article.articleId,
          title: article.title,
          source: article.source,
          content:
            article.liveContent && article.liveContent.length > article.content.length
              ? article.liveContent
              : article.content,
        };
      });

      const { systemPrompt, userPrompt } = buildPostPrompt(
        editor,
        compactedNews,
        recentTopics
      );

      try {
        const draft = await draftPost(editor, systemPrompt, userPrompt, dateString);
        if (!draft) {
          failed = true;
          continue;
        }
        const { post, usage } = draft;

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
          post.sources = post.sources.map(
            (source: { articleId: number; title: string; source: string }) => {
              const matchedArticle = news.find((a) => a.articleId === source.articleId);
              if (matchedArticle) {
                return {
                  ...source,
                  url: matchedArticle.url,
                  urlToImage: matchedArticle.urlToImage,
                };
              }
              return source;
            }
          );
        }

        post.stats = {
          prompt_tokens: usage?.prompt_tokens || 0,
          completion_tokens: usage?.completion_tokens || 0,
          total_tokens: usage?.total_tokens || 0,
        };

        await savePost(post, dateString);
        // Update consolidated sitemap with both EN and ES slugs
        if (post.translations?.en?.slug && post.translations?.es?.slug) {
          await updateSitemap(post.translations.en.slug, post.translations.es.slug, dateString);
        }

        console.log(`✅ Post generated for ${editor.name} on ${datePrefix}`);
        return { newsCount: news.length, tokensUsed: post.stats.total_tokens };
      } catch (error) {
        console.error(`❌ Error generating post for ${editor.name} on ${dateString}:`, error);
        failed = true;
      }
    }
  }
  return failed ? { newsCount: 0, tokensUsed: 0, skipped: 'generation_failed' } : null;
}

// // Capturar argumentos
// const args = process.argv.slice(2);
// const targetDate = args[0]; // formato YYYY-MM-DD
// const targetEditorId = args[1] ? parseInt(args[1], 10) : undefined;

// // Llamar función principal
// generateHistoricalPosts(targetDate, targetEditorId);
