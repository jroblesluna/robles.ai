import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import db from '../db.js';
import { getRecentPosts, scorePostsWithGPT, type PostSummary, type ScoredPost } from '../services/dominicalScoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads the excerpt and first content sections for a given article slug.
 * Returns a brief summary with specific details (companies, figures, quotes).
 */
function getArticleContentSummary(slug: string): string {
  // Slug format: YYYY-MM-DD-HH-mm-ss-rest-of-slug
  const match = slug.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';

  const [, year, month, day] = match;
  const postsDir = path.resolve(process.cwd(), 'server/data/posts');
  const dayDir = path.join(postsDir, year, month, day);

  if (!fs.existsSync(dayDir)) return '';

  // Find the JSON file matching this slug
  const files = fs.readdirSync(dayDir).filter(f => f.endsWith('.json'));
  const matchingFile = files.find(f => {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(dayDir, f), 'utf-8'));
      return content.translations?.en?.slug === slug || content.translations?.es?.slug === slug;
    } catch { return false; }
  });

  if (!matchingFile) return '';

  try {
    const content = JSON.parse(fs.readFileSync(path.join(dayDir, matchingFile), 'utf-8'));
    const esTranslation = content.translations?.es;
    const enTranslation = content.translations?.en;
    const translation = esTranslation || enTranslation;
    if (!translation) return '';

    const excerpt = translation.excerpt || '';
    // Get first 2 content sections for specific details
    const sections = (translation.content || []).slice(0, 2);
    const sectionBodies = sections
      .map((s: { body: string }) => s.body)
      .join(' ')
      .slice(0, 800); // Limit to 800 chars to fit in prompt

    return `Excerpt: ${excerpt}\n   Key details: ${sectionBodies}`;
  } catch {
    return '';
  }
}

/**
 * Generates a LinkedIn post draft using GPT-4o.
 * Format: attention hook → 1-2 opinion lines per selected news → closing with hashtags.
 * Max 2800 chars, Spanish language, temperature 0.7.
 */
async function generateLinkedInPost(selectedPosts: ScoredPost[], apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const newsList = selectedPosts
    .map((p, i) => {
      const contentSummary = getArticleContentSummary(p.slug);
      return `${i + 1}. "${p.title}" (Score: ${p.weightedScore}/100 — ${p.reason})\n   URL: https://robles.ai/blog/${p.slug}\n   ${contentSummary}`;
    })
    .join('\n\n');

  const systemPrompt = `Eres el redactor de "El Dominical IA", un newsletter semanal publicado en LinkedIn por la cuenta de Robles.AI. Escribes en primera persona del plural ("nuestro", "exploramos", "vemos") porque los artículos son propios de robles.ai. Tu estilo es informado, opinado, cercano y profesional. Escribes en español.`;

  const userPrompt = `Escribe un post de LinkedIn en español para "El Dominical IA" de esta semana. Usa las siguientes noticias seleccionadas:

${newsList}

Formato del post:
1. Presentación breve: "Aquí el resumen de nuestro Dominical IA con las noticias más relevantes de esta semana" o similar (1-2 líneas con gancho)
2. Para cada noticia seleccionada: 1-2 líneas con opinión/análisis usando primera persona plural ("en nuestro artículo exploramos...", "como vemos en...", "analizamos cómo...")
3. Cierre con reflexión y call-to-action: "Síguenos para más insights cada semana" (NO "sigue al Dominical" porque se publica desde nuestra cuenta)
4. Hashtags relevantes al final (máximo 5)

Reglas:
- Máximo 2800 caracteres
- Usa emojis con moderación (1-2 por sección)
- Tono profesional pero cercano
- No uses bullet points genéricos, cada opinión debe ser específica y valiosa
- OBLIGATORIO: Menciona datos concretos de cada artículo (empresas, cifras, hallazgos, nombres, tecnologías específicas). NO escribas resúmenes vagos como "promete revolucionar" o "podría redefinir". Cita hechos reales del contenido proporcionado.
- Cada mención a un artículo debe incluir al menos UN dato específico (nombre de empresa, cifra, tecnología concreta, caso de uso real)
- El post debe fluir como una narrativa, no como una lista
- INCLUYE los enlaces a cada artículo de robles.ai en el texto de forma natural
- VOZ: Escribe en primera persona del plural. Los artículos son NUESTROS. NO digas "según el artículo de Robles AI" ni "el artículo menciona" — di "en nuestro artículo exploramos", "como analizamos en", "vemos que", etc.
- PRESENTACIÓN: El post es "El Dominical IA" publicado por Robles.AI. Preséntalo como tal al inicio.
- CTA: Usa "síguenos" (no "sigue a El Dominical"). Se publica desde la cuenta de Robles.AI.

Devuelve SOLO el texto del post, sin markdown ni explicaciones adicionales.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from GPT-4o post generation');
  }

  // Enforce max 2800 chars
  return content.slice(0, 2800);
}

/**
 * Sends notification email that the Dominical report is ready for review.
 */
async function sendNotificationEmail(selectedPosts: ScoredPost[]): Promise<void> {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('⚠️ Email credentials not configured. Skipping notification.');
    return;
  }

  // Get notification email from settings or fallback to EMAIL_TO env
  const notificationRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('notification_email') as
    | { value: string | null }
    | undefined;

  const recipient = notificationRow?.value || process.env.EMAIL_TO;

  if (!recipient) {
    console.warn('⚠️ No notification email configured. Skipping notification.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const newsTitles = selectedPosts.map((p) => `• ${p.title}`).join('\n');

  const baseUrl = process.env.BASE_URL || 'https://robles.ai';

  await transporter.sendMail({
    from: emailUser,
    to: recipient,
    subject: 'Tu Dominical IA de esta semana está listo para revisión',
    html: `
      <h2>🗞️ El Dominical IA está listo</h2>
      <p>Se ha generado un nuevo reporte semanal con las siguientes noticias seleccionadas:</p>
      <ul>
        ${selectedPosts.map((p) => `<li><strong>${p.title}</strong> (${p.weightedScore}/100)</li>`).join('\n        ')}
      </ul>
      <p>
        <a href="${baseUrl}/admin/dominical" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
          Revisar y editar
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Este email fue enviado automáticamente por El Dominical IA.</p>
    `,
  });

  console.log('✅ Notification email sent to', recipient);
}

/**
 * Main function: orchestrates the full Dominical IA weekly report generation.
 *
 * Steps:
 * 1. Get all posts from the last 7 days
 * 2. Score and select top N posts via GPT-4o
 * 3. Generate LinkedIn post draft via GPT-4o
 * 4. Insert report into dominical_reports table
 * 5. Send notification email
 */
export async function generateDominicalReport(): Promise<{ reportId: number }> {
  console.log('🗞️ Starting Dominical IA generation...');

  // 1. Get all recent posts (last 7 days)
  const allPosts = getRecentPosts(7);
  console.log(`📰 Found ${allPosts.length} posts from the last 7 days`);

  if (allPosts.length === 0) {
    throw new Error('No posts found in the last 7 days. Cannot generate Dominical report.');
  }

  // 2. Score posts and select top N
  // Get API key for scoring
  const apiKeyRowForScoring = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;
  const scoringApiKey = apiKeyRowForScoring?.value || process.env.OPENAI_API_KEY;
  if (!scoringApiKey) {
    throw new Error('OpenAI API key not configured.');
  }

  // Score all posts (returns all scored, sorted by score desc)
  const allScoredPosts = await scorePostsWithGPT(allPosts, scoringApiKey);
  console.log(`📊 Scored ${allScoredPosts.length} posts`);

  // Select top N
  const topNRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('dominical_top_n') as
    | { value: string | null }
    | undefined;
  const topN = topNRow?.value ? parseInt(topNRow.value, 10) : 5;
  const selectedPosts = allScoredPosts.slice(0, topN);
  console.log(`⭐ Selected top ${selectedPosts.length} posts`);

  // 3. Generate LinkedIn post draft
  const apiKeyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
    | { value: string | null }
    | undefined;

  const apiKey = apiKeyRow?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set it in Admin Settings or as OPENAI_API_KEY env var.');
  }

  const postText = await generateLinkedInPost(selectedPosts, apiKey);
  console.log(`✍️ Generated LinkedIn post (${postText.length} chars)`);

  // 4. Calculate week_start and week_end
  const now = new Date();
  const weekEnd = now.toISOString().split('T')[0]; // Today (Saturday)
  const weekStartDate = new Date(now);
  weekStartDate.setDate(weekStartDate.getDate() - 6); // 7 days ago
  const weekStart = weekStartDate.toISOString().split('T')[0];

  // 5. Insert into dominical_reports
  const stmt = db.prepare(`
    INSERT INTO dominical_reports (week_start, week_end, selected_news, all_news, post_text, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending_review', ?)
  `);

  // Store all_news with scores embedded (merge allPosts with scores)
  const allNewsWithScores = allPosts.map((post) => {
    const scored = allScoredPosts.find((s) => s.slug === post.slug);
    return {
      ...post,
      scores: scored?.scores || null,
      weightedScore: scored?.weightedScore || 0,
      reason: scored?.reason || '',
    };
  });

  const result = stmt.run(
    weekStart,
    weekEnd,
    JSON.stringify(selectedPosts),
    JSON.stringify(allNewsWithScores),
    postText,
    new Date().toISOString()
  );

  const reportId = Number(result.lastInsertRowid);
  console.log(`💾 Report saved with ID ${reportId} (status: pending_review)`);

  // 6. Send notification email
  try {
    await sendNotificationEmail(selectedPosts);
  } catch (emailError) {
    console.error('⚠️ Failed to send notification email:', emailError);
    // Don't fail the whole job for email issues
  }

  console.log('✅ Dominical IA generation complete!');
  return { reportId };
}
