import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import { generateToken, verifyToken, requireAuth } from './auth.js';
import { generateDominicalReport } from './jobs/generateDominical.js';
import { publishPost } from './services/linkedin.js';
import { generateCarousel, regenerateSlide } from './services/carouselGenerator.js';
import { exportCarouselPdf } from './services/pdfExporter.js';
import { composeArticleSlide } from './services/slideCompositor.js';

const SALT_ROUNDS = 12;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const adminRouter = Router();

/**
 * GET /api/admin/status
 * Check if any admin user exists (setup_required) and if current request is authenticated.
 */
adminRouter.get('/status', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
    const setupRequired = userCount.count === 0;

    let authenticated = false;
    const token = req.cookies?.admin_token;
    if (token) {
      try {
        verifyToken(token);
        authenticated = true;
      } catch {
        // Token invalid or expired
      }
    }

    res.json({ setup_required: setupRequired, authenticated });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/setup
 * Create the first admin user. Only works when no admin exists yet.
 */
adminRouter.post('/setup', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      res.status(400).json({ error: 'Email, password, and confirmPassword are required' });
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Check no admin exists yet
    const userCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
    if (userCount.count > 0) {
      res.status(400).json({ error: 'Admin user already exists' });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    const result = db.prepare(
      'INSERT INTO admin_users (email, password_hash, created_at) VALUES (?, ?, ?)'
    ).run(email, passwordHash, now);

    const userId = result.lastInsertRowid as number;

    // Generate JWT and set cookie
    const token = generateToken(userId, email);
    res.cookie('admin_token', token, COOKIE_OPTIONS);

    res.status(201).json({ success: true, user: { id: userId, email } });
  } catch (error) {
    console.error('Error during admin setup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/login
 * Authenticate an admin user with email and password.
 */
adminRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as
      | { id: number; email: string; password_hash: string; status: string }
      | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last_login_at
    const now = new Date().toISOString();
    db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now, user.id);

    // Generate JWT and set cookie
    const token = generateToken(user.id, user.email);
    res.cookie('admin_token', token, COOKIE_OPTIONS);

    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/logout
 * Clear the admin_token cookie. Protected endpoint.
 */
adminRouter.post('/logout', requireAuth, (_req, res) => {
  res.clearCookie('admin_token', COOKIE_OPTIONS);
  res.json({ success: true });
});

/**
 * GET /api/admin/me
 * Return current authenticated user info. Protected endpoint.
 */
adminRouter.get('/me', requireAuth, (req, res) => {
  const { userId, email } = req.adminUser!;
  res.json({ id: userId, email });
});

// --- Settings Management ---

/** Keys whose values contain secrets and should be masked in GET responses */
const SECRET_KEYS = [
  'openai_api_key',
  'linkedin_client_secret',
  'linkedin_access_token',
  'linkedin_refresh_token',
  'stability_api_key',
  'replicate_api_token',
];

/**
 * Mask a secret value, showing only the last 4 characters.
 * Example: "sk-abc123xyz" → "••••••••xyz"
 */
function maskSecret(value: string | null): string | null {
  if (!value) return value;
  if (value.length <= 4) return '••••';
  return '••••••••' + value.slice(-4);
}

/**
 * GET /api/admin/settings
 * Returns all settings as { key: value } object. Secret values are masked.
 */
adminRouter.get('/settings', requireAuth, (_req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string | null }>;

    const settings: Record<string, string | null> = {};
    for (const row of rows) {
      if (SECRET_KEYS.includes(row.key)) {
        settings[row.key] = maskSecret(row.value);
      } else {
        settings[row.key] = row.value;
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/settings
 * Batch update settings. Body: { [key]: value, ... }
 * Skips secret keys if the value still looks masked (contains ••••).
 */
adminRouter.put('/settings', requireAuth, (req, res) => {
  try {
    const updates = req.body as Record<string, string | null>;

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      res.status(400).json({ error: 'Body must be an object of key-value pairs' });
      return;
    }

    const upsert = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    );

    const now = new Date().toISOString();

    const updateMany = db.transaction((entries: Array<[string, string | null]>) => {
      for (const [key, value] of entries) {
        // Skip updating secret keys if the value is still masked
        if (SECRET_KEYS.includes(key) && value && value.includes('••••')) {
          continue;
        }
        upsert.run(key, value, now);
      }
    });

    updateMany(Object.entries(updates));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- LinkedIn OAuth ---

/**
 * GET /api/admin/linkedin/auth-url
 * Returns the LinkedIn OAuth authorization URL. Protected endpoint.
 */
adminRouter.get('/linkedin/auth-url', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('linkedin_client_id') as
      | { value: string | null }
      | undefined;

    const clientId = row?.value;
    if (!clientId) {
      res.status(400).json({ error: 'LinkedIn client_id is not configured. Please set it in Settings first.' });
      return;
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).run('linkedin_oauth_state', state, now);

    // Build redirect_uri
    // Auto-detect base URL from the request. Normalize 0.0.0.0 to localhost.
    const proto = req.headers['x-forwarded-proto'] as string || req.protocol;
    let host = req.headers['x-forwarded-host'] as string || req.get('host') || 'localhost';
    host = host.replace('0.0.0.0', 'localhost');
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/admin/linkedin/callback`;

    const authUrl =
      `https://www.linkedin.com/oauth/v2/authorization` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('w_member_social')}` +
      `&state=${encodeURIComponent(state)}`;

    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating LinkedIn auth URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/linkedin/callback
 * LinkedIn OAuth callback. NOT protected — LinkedIn redirects here directly.
 * Uses state parameter for CSRF protection.
 */
adminRouter.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError, error_description } = req.query;

    // Handle LinkedIn error response
    if (oauthError) {
      console.error('LinkedIn OAuth error:', oauthError, error_description);
      res.redirect('/admin/settings?linkedin=error&message=' + encodeURIComponent(String(error_description || oauthError)));
      return;
    }

    if (!code || !state) {
      res.redirect('/admin/settings?linkedin=error&message=' + encodeURIComponent('Missing code or state parameter'));
      return;
    }

    // Verify state matches stored value (CSRF protection)
    const storedStateRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('linkedin_oauth_state') as
      | { value: string | null }
      | undefined;

    if (!storedStateRow?.value || storedStateRow.value !== state) {
      res.redirect('/admin/settings?linkedin=error&message=' + encodeURIComponent('Invalid state parameter (CSRF check failed)'));
      return;
    }

    // Clear the stored state (one-time use)
    db.prepare('DELETE FROM settings WHERE key = ?').run('linkedin_oauth_state');

    // Read client credentials
    const clientIdRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('linkedin_client_id') as
      | { value: string | null }
      | undefined;
    const clientSecretRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('linkedin_client_secret') as
      | { value: string | null }
      | undefined;

    const clientId = clientIdRow?.value;
    const clientSecret = clientSecretRow?.value;

    if (!clientId || !clientSecret) {
      res.redirect('/admin/settings?linkedin=error&message=' + encodeURIComponent('LinkedIn client credentials not configured'));
      return;
    }

    // Build redirect_uri (must match the one used in auth-url)
    // Auto-detect base URL from the request. Normalize 0.0.0.0 to localhost.
    const proto = req.headers['x-forwarded-proto'] as string || req.protocol;
    let host = req.headers['x-forwarded-host'] as string || req.get('host') || 'localhost';
    host = host.replace('0.0.0.0', 'localhost');
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/admin/linkedin/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', tokenResponse.status, errorBody);
      res.redirect('/admin/settings?linkedin=error&message=' + encodeURIComponent('Failed to exchange code for tokens'));
      return;
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000).toISOString();
    const nowIso = now.toISOString();

    // Store tokens in settings
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    );

    const storeTokens = db.transaction(() => {
      upsert.run('linkedin_access_token', tokenData.access_token, nowIso);
      if (tokenData.refresh_token) {
        upsert.run('linkedin_refresh_token', tokenData.refresh_token, nowIso);
      }
      upsert.run('linkedin_token_expires_at', expiresAt, nowIso);
    });

    storeTokens();

    // Fetch user profile to get person ID
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (profileResponse.ok) {
        const profileData = (await profileResponse.json()) as { id?: string };
        if (profileData.id) {
          upsert.run('linkedin_person_id', profileData.id, nowIso);
        }
      } else {
        console.warn('Failed to fetch LinkedIn profile:', profileResponse.status);
      }
    } catch (profileError) {
      console.warn('Error fetching LinkedIn profile:', profileError);
      // Non-fatal: tokens are already stored
    }

    res.redirect('/admin/settings?linkedin=connected');
  } catch (error) {
    console.error('Error in LinkedIn callback:', error);
    res.redirect('/admin/settings?linkedin=error&message=' + encodeURIComponent('Internal server error'));
  }
});

// --- Dominical Reports ---

/**
 * POST /api/admin/dominical/generate
 * Manually trigger Dominical IA report generation. Protected endpoint.
 * NOTE: This must be registered before /dominical/:id to avoid route conflicts.
 */
adminRouter.post('/dominical/generate', requireAuth, async (_req, res) => {
  try {
    const { reportId } = await generateDominicalReport();
    res.json({ success: true, reportId });
  } catch (error) {
    console.error('Error generating Dominical report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/dominical
 * List all dominical reports ordered by created_at DESC.
 * Returns summary data with selected_news_count instead of full JSON.
 */
adminRouter.get('/dominical', requireAuth, (_req, res) => {
  try {
    const rows = db.prepare(
      `SELECT id, week_start, week_end, selected_news, status, created_at, last_edited_at, published_at
       FROM dominical_reports
       ORDER BY created_at DESC`
    ).all() as Array<{
      id: number;
      week_start: string;
      week_end: string;
      selected_news: string | null;
      status: string;
      created_at: string;
      last_edited_at: string | null;
      published_at: string | null;
    }>;

    const reports = rows.map((row) => {
      let selectedNewsCount = 0;
      if (row.selected_news) {
        try {
          const parsed = JSON.parse(row.selected_news);
          selectedNewsCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          // Invalid JSON, keep count as 0
        }
      }
      return {
        id: row.id,
        week_start: row.week_start,
        week_end: row.week_end,
        status: row.status,
        created_at: row.created_at,
        last_edited_at: row.last_edited_at,
        published_at: row.published_at,
        selected_news_count: selectedNewsCount,
      };
    });

    res.json({ reports });
  } catch (error) {
    console.error('Error listing dominical reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/dominical/:id
 * Get a single dominical report by ID with full data (parsed JSON fields).
 */
adminRouter.get('/dominical/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM dominical_reports WHERE id = ?').get(Number(id)) as
      | {
          id: number;
          week_start: string;
          week_end: string;
          selected_news: string | null;
          all_news: string | null;
          post_text: string | null;
          image_url: string | null;
          status: string;
          created_at: string;
          last_edited_at: string | null;
          published_at: string | null;
          linkedin_post_id: string | null;
          error_log: string | null;
        }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    let selectedNews: unknown[] = [];
    if (row.selected_news) {
      try {
        selectedNews = JSON.parse(row.selected_news);
      } catch {
        selectedNews = [];
      }
    }

    let allNews: unknown[] = [];
    if (row.all_news) {
      try {
        allNews = JSON.parse(row.all_news);
      } catch {
        allNews = [];
      }
    }

    res.json({
      id: row.id,
      week_start: row.week_start,
      week_end: row.week_end,
      selected_news: selectedNews,
      all_news: allNews,
      post_text: row.post_text,
      image_url: row.image_url,
      status: row.status,
      created_at: row.created_at,
      last_edited_at: row.last_edited_at,
      published_at: row.published_at,
      linkedin_post_id: row.linkedin_post_id,
      error_log: row.error_log,
    });
  } catch (error) {
    console.error('Error fetching dominical report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/dominical/:id
 * Update a dominical report. Accepts optional: post_text, selected_news, image_url.
 * Sets last_edited_at to current timestamp.
 * If status is 'pending_review', changes it to 'edited'.
 */
adminRouter.put('/dominical/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { post_text, selected_news, image_url } = req.body;

    // Check report exists
    const existing = db.prepare('SELECT * FROM dominical_reports WHERE id = ?').get(Number(id)) as
      | { id: number; status: string; selected_news: string | null; all_news: string | null; post_text: string | null; image_url: string | null; week_start: string; week_end: string; created_at: string; last_edited_at: string | null; published_at: string | null; linkedin_post_id: string | null; error_log: string | null }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const now = new Date().toISOString();
    const newStatus = existing.status === 'pending_review' ? 'edited' : existing.status;

    // Build update fields
    const updates: string[] = [];
    const values: unknown[] = [];

    if (post_text !== undefined) {
      updates.push('post_text = ?');
      values.push(post_text);
    }
    if (selected_news !== undefined) {
      updates.push('selected_news = ?');
      values.push(JSON.stringify(selected_news));
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(image_url);
    }

    updates.push('last_edited_at = ?');
    values.push(now);
    updates.push('status = ?');
    values.push(newStatus);

    values.push(Number(id));

    db.prepare(
      `UPDATE dominical_reports SET ${updates.join(', ')} WHERE id = ?`
    ).run(...values);

    // Return the updated report
    const updated = db.prepare('SELECT * FROM dominical_reports WHERE id = ?').get(Number(id)) as {
      id: number;
      week_start: string;
      week_end: string;
      selected_news: string | null;
      all_news: string | null;
      post_text: string | null;
      image_url: string | null;
      status: string;
      created_at: string;
      last_edited_at: string | null;
      published_at: string | null;
      linkedin_post_id: string | null;
      error_log: string | null;
    };

    let parsedSelectedNews: unknown[] = [];
    if (updated.selected_news) {
      try { parsedSelectedNews = JSON.parse(updated.selected_news); } catch { parsedSelectedNews = []; }
    }
    let parsedAllNews: unknown[] = [];
    if (updated.all_news) {
      try { parsedAllNews = JSON.parse(updated.all_news); } catch { parsedAllNews = []; }
    }

    res.json({
      id: updated.id,
      week_start: updated.week_start,
      week_end: updated.week_end,
      selected_news: parsedSelectedNews,
      all_news: parsedAllNews,
      post_text: updated.post_text,
      image_url: updated.image_url,
      status: updated.status,
      created_at: updated.created_at,
      last_edited_at: updated.last_edited_at,
      published_at: updated.published_at,
      linkedin_post_id: updated.linkedin_post_id,
      error_log: updated.error_log,
    });
  } catch (error) {
    console.error('Error updating dominical report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/dominical/:id/regenerate-post
 * Regenerate the LinkedIn post text based on manually selected news.
 * Accepts: { selected_slugs: string[] }
 */
adminRouter.post('/dominical/:id/regenerate-post', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { selected_slugs } = req.body as { selected_slugs: string[] };

    if (!selected_slugs || !Array.isArray(selected_slugs) || selected_slugs.length === 0) {
      res.status(400).json({ error: 'selected_slugs array is required' });
      return;
    }

    // Get the report
    const existing = db.prepare('SELECT * FROM dominical_reports WHERE id = ?').get(Number(id)) as
      | { id: number; all_news: string | null; selected_news: string | null }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Get all_news to find titles for selected slugs
    let allNews: Array<{ slug: string; titleEs: string; titleEn: string }> = [];
    if (existing.all_news) {
      try { allNews = JSON.parse(existing.all_news); } catch { allNews = []; }
    }

    // Get previously scored news for score/reason data
    let scoredNews: Array<{ slug: string; title: string; scores?: { novelty: number; peopleImpact: number; economicImpact: number; narrativePotential: number }; weightedScore?: number; score?: number; reason: string }> = [];
    if (existing.selected_news) {
      try { scoredNews = JSON.parse(existing.selected_news); } catch { scoredNews = []; }
    }

    // Build the selected posts list with available data
    const selectedPosts = selected_slugs.map((slug) => {
      const scored = scoredNews.find((n) => n.slug === slug);
      const news = allNews.find((n) => n.slug === slug);
      return {
        slug,
        title: scored?.title || news?.titleEs || news?.titleEn || slug,
        scores: scored?.scores || { novelty: 50, peopleImpact: 50, economicImpact: 50, narrativePotential: 50 },
        weightedScore: scored?.weightedScore || scored?.score || 50,
        reason: scored?.reason || 'Manually selected by editor',
      };
    });

    // Get OpenAI key
    const apiKeyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
      | { value: string | null }
      | undefined;
    const apiKey = apiKeyRow?.value || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    // Generate new post text using the same logic as generateDominical
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    const newsList = selectedPosts
      .map((p, i) => `${i + 1}. "${p.title}" (Score: ${p.weightedScore}/100 — ${p.reason})\n   URL: https://robles.ai/blog/${p.slug}`)
      .join('\n');

    const systemPrompt = `Eres el redactor de "El Dominical IA", un newsletter semanal en LinkedIn para profesionales de tecnología y negocios en Latinoamérica. Tu estilo es informado, opinado, cercano y profesional. Escribes en español.`;

    const userPrompt = `Escribe un post de LinkedIn en español para "El Dominical IA" de esta semana. Usa las siguientes noticias seleccionadas:

${newsList}

Formato del post:
1. Gancho de atención (1-2 líneas que capten interés)
2. Para cada noticia seleccionada: 1-2 líneas con tu opinión/análisis breve, mencionando el enlace al artículo en robles.ai
3. Cierre con reflexión y call-to-action (invitar a seguir, comentar, leer más en robles.ai)
4. Hashtags relevantes al final (máximo 5)

Reglas:
- Máximo 2800 caracteres
- Usa emojis con moderación (1-2 por sección)
- Tono profesional pero cercano
- No uses bullet points genéricos, cada opinión debe ser específica y valiosa
- El post debe fluir como una narrativa, no como una lista
- INCLUYE los enlaces a cada artículo de robles.ai en el texto de forma natural

Devuelve SOLO el texto del post, sin markdown ni explicaciones adicionales.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const postText = response.choices[0]?.message?.content?.slice(0, 2800) || '';

    // Update the report
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE dominical_reports SET post_text = ?, selected_news = ?, last_edited_at = ?, status = 'edited' WHERE id = ?`
    ).run(postText, JSON.stringify(selectedPosts), now, Number(id));

    res.json({ success: true, post_text: postText, selected_news: selectedPosts });
  } catch (error) {
    console.error('Error regenerating post:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/dominical/:id/cancel
 * Cancel a dominical report by setting its status to 'cancelled'.
 */
adminRouter.post('/dominical/:id/cancel', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM dominical_reports WHERE id = ?').get(Number(id)) as
      | { id: number }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    db.prepare('UPDATE dominical_reports SET status = ? WHERE id = ?').run('cancelled', Number(id));

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling dominical report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/dominical/:id/generate-image
 * Generate an AI image for a dominical report based on its selected news themes.
 * Uses DALL-E 3 via the OpenAI API.
 */
adminRouter.post('/dominical/:id/generate-image', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get report
    const report = db.prepare('SELECT id, selected_news FROM dominical_reports WHERE id = ?').get(Number(id)) as
      | { id: number; selected_news: string | null }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // 2. Parse selected_news for titles
    if (!report.selected_news) {
      res.status(400).json({ error: 'No selected news available to generate an image from' });
      return;
    }

    let selectedNews: Array<{ title?: string; title_en?: string; title_es?: string }>;
    try {
      selectedNews = JSON.parse(report.selected_news);
    } catch {
      res.status(400).json({ error: 'Invalid selected_news data' });
      return;
    }

    if (!Array.isArray(selectedNews) || selectedNews.length === 0) {
      res.status(400).json({ error: 'No selected news available to generate an image from' });
      return;
    }

    // Extract themes from news titles
    const themes = selectedNews
      .map((item) => item.title || item.title_en || item.title_es || '')
      .filter(Boolean)
      .join(', ');

    if (!themes) {
      res.status(400).json({ error: 'Could not extract themes from selected news' });
      return;
    }

    // 3. Read openai_api_key from settings
    const apiKeyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('openai_api_key') as
      | { value: string | null }
      | undefined;

    const apiKey = apiKeyRow?.value || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: 'OpenAI API key is not configured. Set it in Admin Settings or as OPENAI_API_KEY env var.' });
      return;
    }

    // 4. Call OpenAI Image Generation API
    const openai = new OpenAI({ apiKey });

    const prompt = `Professional LinkedIn cover image representing: ${themes}. Modern, clean, corporate style. Blue and purple tones. No text.`;

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'medium',
    });

    // gpt-image-1 returns b64_json, not a URL
    const b64Data = imageResponse.data?.[0]?.b64_json;
    const urlData = imageResponse.data?.[0]?.url;
    
    let imageUrl: string;
    
    if (urlData) {
      // If URL is provided (future-proofing)
      imageUrl = urlData;
    } else if (b64Data) {
      // Save base64 as a file in public/images and return the path
      const fs = await import('fs/promises');
      const path = await import('path');
      const filename = `dominical-${id}-${Date.now()}.png`;
      const imagePath = path.default.resolve(process.cwd(), 'dist/images', filename);
      
      // Ensure directory exists
      await fs.default.mkdir(path.default.dirname(imagePath), { recursive: true });
      
      // Write the image file
      const buffer = Buffer.from(b64Data, 'base64');
      await fs.default.writeFile(imagePath, buffer);
      
      // Also save to public/images for persistence across builds (postbuild copies public/ to dist/)
      const serverImagePath = path.default.resolve(process.cwd(), 'public/images', filename);
      await fs.default.mkdir(path.default.dirname(serverImagePath), { recursive: true });
      await fs.default.writeFile(serverImagePath, buffer);
      
      imageUrl = `/images/${filename}`;
    } else {
      res.status(500).json({ error: 'Image generation failed: no image data returned from API' });
      return;
    }

    // 5. Update report image_url in DB
    const now = new Date().toISOString();
    db.prepare('UPDATE dominical_reports SET image_url = ?, last_edited_at = ? WHERE id = ?').run(imageUrl, now, Number(id));

    // 6. Return { image_url }
    res.json({ image_url: imageUrl });
  } catch (error) {
    console.error('Error generating image for dominical report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Image generation failed: ${message}` });
  }
});

/**
 * POST /api/admin/dominical/:id/publish
 * Manually publish a dominical report to LinkedIn. Protected endpoint.
 */
adminRouter.post('/dominical/:id/publish', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get report
    const report = db.prepare('SELECT * FROM dominical_reports WHERE id = ?').get(Number(id)) as
      | { id: number; status: string; post_text: string | null; image_url: string | null }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Validate it can be published
    if (report.status === 'published') {
      res.status(400).json({ error: 'Report already published' });
      return;
    }
    if (report.status === 'cancelled') {
      res.status(400).json({ error: 'Report is cancelled' });
      return;
    }
    if (!report.post_text) {
      res.status(400).json({ error: 'Report has no post text' });
      return;
    }

    // Publish to LinkedIn
    const linkedinPostId = await publishPost(report.post_text, report.image_url || undefined);

    // Update report
    const now = new Date().toISOString();
    db.prepare('UPDATE dominical_reports SET status = ?, published_at = ?, linkedin_post_id = ? WHERE id = ?')
      .run('published', now, linkedinPostId, Number(id));

    res.json({ success: true, linkedin_post_id: linkedinPostId });
  } catch (error) {
    console.error('Error publishing dominical report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// --- Carousel Routes ---

/**
 * POST /api/admin/dominical/:id/generate-carousel
 * Triggers full carousel generation for a report. Protected endpoint.
 * Generation runs in the background — responds immediately with status 'generating'.
 */
adminRouter.post('/dominical/:id/generate-carousel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const reportId = Number(id);
    const { palette, imageStyle } = req.body || {};

    // Validate report exists
    const report = db.prepare('SELECT id FROM dominical_reports WHERE id = ?').get(reportId) as
      | { id: number }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Check for slides stuck in 'generating' status — auto-reset stale ones (>5 min)
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const staleReset = db.prepare(
      `UPDATE carousel_slides SET status = 'failed', error_message = 'Generation interrupted (server restart)', updated_at = ?
       WHERE report_id = ? AND status = 'generating' AND (updated_at IS NULL OR updated_at < ?)`
    ).run(new Date().toISOString(), reportId, staleThreshold);

    if (staleReset.changes > 0) {
      console.log(`[CarouselGenerator] Auto-reset ${staleReset.changes} stale generating slide(s) for report ${reportId}`);
    }

    // Also reset stale pending slides (they should have moved to generating by now)
    const stalePendingReset = db.prepare(
      `UPDATE carousel_slides SET status = 'failed', error_message = 'Generation interrupted (server restart)', updated_at = ?
       WHERE report_id = ? AND status = 'pending' AND (updated_at IS NULL OR updated_at < ?)`
    ).run(new Date().toISOString(), reportId, staleThreshold);

    if (stalePendingReset.changes > 0) {
      console.log(`[CarouselGenerator] Auto-reset ${stalePendingReset.changes} stale pending slide(s) for report ${reportId}`);
    }

    // Check if there are still actively generating or pending slides (updated within last 5 min)
    const activeGenerating = db.prepare(
      `SELECT COUNT(*) as count FROM carousel_slides WHERE report_id = ? AND status IN ('generating', 'pending') AND updated_at >= ?`
    ).get(reportId, staleThreshold) as { count: number };

    if (activeGenerating.count > 0) {
      res.status(409).json({ error: 'Carousel generation already in progress for this report' });
      return;
    }

    // Start generation in background (don't await)
    generateCarousel(reportId, palette, imageStyle).catch((err) => {
      console.error('[CarouselGenerator] Background generation failed:', err.message);
    });

    // Respond immediately so frontend can start polling
    res.json({ status: 'generating', reportId });
  } catch (error: any) {
    console.error('Error generating carousel:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/dominical/:id/carousel/slides/:position/regenerate
 * Regenerates a single slide at the specified position. Protected endpoint.
 */
adminRouter.post('/dominical/:id/carousel/slides/:position/regenerate', requireAuth, async (req, res) => {
  try {
    const { id, position } = req.params;
    const reportId = Number(id);
    const slidePosition = Number(position);

    if (isNaN(slidePosition) || slidePosition < 0) {
      res.status(400).json({ error: 'Invalid slide position' });
      return;
    }

    // Validate report exists
    const report = db.prepare('SELECT id FROM dominical_reports WHERE id = ?').get(reportId) as
      | { id: number }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const result = await regenerateSlide(reportId, slidePosition);
    res.json(result);
  } catch (error: any) {
    console.error('Error regenerating slide:', error);
    if (error.statusCode === 409) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error.statusCode === 400) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.statusCode === 404) {
      res.status(404).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/admin/dominical/:id/carousel/slides/:position/text
 * Updates slide text (titleText and/or engagementPhrase) and re-composes the slide.
 * Protected endpoint.
 */
adminRouter.put('/dominical/:id/carousel/slides/:position/text', requireAuth, async (req, res) => {
  try {
    const { id, position } = req.params;
    const reportId = Number(id);
    const slidePosition = Number(position);

    if (isNaN(slidePosition) || slidePosition < 0) {
      res.status(400).json({ error: 'Invalid slide position' });
      return;
    }

    const { titleText, engagementPhrase } = req.body;

    if (titleText === undefined && engagementPhrase === undefined) {
      res.status(400).json({ error: 'At least one of titleText or engagementPhrase must be provided' });
      return;
    }

    // Get existing slide from DB
    const slide = db.prepare(
      'SELECT * FROM carousel_slides WHERE report_id = ? AND position = ?'
    ).get(reportId, slidePosition) as
      | {
          id: number;
          report_id: number;
          position: number;
          slide_type: string;
          article_slug: string | null;
          title_text: string;
          engagement_phrase: string | null;
          background_image_path: string | null;
          composite_image_path: string | null;
          status: string;
          error_message: string | null;
          created_at: string;
          updated_at: string | null;
        }
      | undefined;

    if (!slide) {
      res.status(404).json({ error: 'Slide not found' });
      return;
    }

    // Determine updated text values
    const updatedTitle = titleText !== undefined ? titleText : slide.title_text;
    const updatedPhrase = engagementPhrase !== undefined ? engagementPhrase : slide.engagement_phrase;

    // Verify background image exists for re-composition
    if (!slide.background_image_path || !fs.existsSync(slide.background_image_path)) {
      res.status(400).json({ error: 'Background image not available for re-composition' });
      return;
    }

    // Re-compose the slide using the existing background image
    const compositePath = slide.composite_image_path || path.resolve(
      process.cwd(),
      'server/data/carousel',
      String(reportId),
      'composites',
      `${String(slidePosition).padStart(2, '0')}-slide.png`
    );

    // Ensure composites directory exists
    const compositesDir = path.dirname(compositePath);
    fs.mkdirSync(compositesDir, { recursive: true });

    const logoPath = path.resolve(process.cwd(), 'public/images/logo.png');

    await composeArticleSlide({
      backgroundImagePath: slide.background_image_path,
      logoPath,
      titleText: updatedTitle,
      engagementPhrase: updatedPhrase || undefined,
      slideType: slide.slide_type as 'cover' | 'article' | 'cta',
      outputPath: compositePath,
    });

    // Update DB record
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE carousel_slides SET title_text = ?, engagement_phrase = ?, composite_image_path = ?, status = 'generated', error_message = NULL, updated_at = ? WHERE report_id = ? AND position = ?`
    ).run(updatedTitle, updatedPhrase, compositePath, now, reportId, slidePosition);

    res.json({
      position: slidePosition,
      type: slide.slide_type,
      status: 'generated',
      imagePath: compositePath,
      articleSlug: slide.article_slug,
      titleText: updatedTitle,
      engagementPhrase: updatedPhrase,
    });
  } catch (error: any) {
    console.error('Error updating slide text:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/dominical/:id/carousel/pdf
 * Returns the carousel as a downloadable PDF. Protected endpoint.
 */
adminRouter.get('/dominical/:id/carousel/pdf', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const reportId = Number(id);

    // Validate report exists
    const report = db.prepare('SELECT id FROM dominical_reports WHERE id = ?').get(reportId) as
      | { id: number }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Get all generated slides ordered by position
    const slides = db.prepare(
      'SELECT composite_image_path FROM carousel_slides WHERE report_id = ? AND status = ? ORDER BY position ASC'
    ).all(reportId, 'generated') as Array<{ composite_image_path: string | null }>;

    const slidePaths = slides
      .map((s) => s.composite_image_path)
      .filter((p): p is string => p !== null);

    if (slidePaths.length === 0) {
      res.status(400).json({ error: 'No valid slides available for PDF export' });
      return;
    }

    const result = await exportCarouselPdf(reportId, slidePaths);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="carousel-report-${reportId}.pdf"`);
    res.send(result.pdfBuffer);
  } catch (error: any) {
    console.error('Error exporting carousel PDF:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/dominical/:id/carousel/slides/:position/image
 * Returns an individual slide PNG image. Protected endpoint.
 */
adminRouter.get('/dominical/:id/carousel/slides/:position/image', requireAuth, (req, res) => {
  try {
    const { id, position } = req.params;
    const reportId = Number(id);
    const slidePosition = Number(position);

    if (isNaN(slidePosition) || slidePosition < 0) {
      res.status(400).json({ error: 'Invalid slide position' });
      return;
    }

    // Get the specific slide
    const slide = db.prepare(
      'SELECT composite_image_path, status FROM carousel_slides WHERE report_id = ? AND position = ?'
    ).get(reportId, slidePosition) as
      | { composite_image_path: string | null; status: string }
      | undefined;

    if (!slide) {
      res.status(404).json({ error: 'Slide not found' });
      return;
    }

    if (slide.status !== 'generated' || !slide.composite_image_path) {
      res.status(400).json({ error: 'Slide image not available' });
      return;
    }

    if (!fs.existsSync(slide.composite_image_path)) {
      res.status(404).json({ error: 'Slide image file not found on disk' });
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="slide-${slidePosition}.png"`);
    const imageStream = fs.createReadStream(slide.composite_image_path);
    imageStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving slide image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/dominical/:id/carousel
 * Returns carousel metadata/status JSON for a report. Protected endpoint.
 */
adminRouter.get('/dominical/:id/carousel', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const reportId = Number(id);

    // Validate report exists
    const report = db.prepare('SELECT id FROM dominical_reports WHERE id = ?').get(reportId) as
      | { id: number }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Get all slides for this report ordered by position
    const slides = db.prepare(
      `SELECT id, position, slide_type, article_slug, title_text, engagement_phrase,
              background_image_path, composite_image_path, status, error_message, created_at, updated_at
       FROM carousel_slides
       WHERE report_id = ?
       ORDER BY position ASC`
    ).all(reportId) as Array<{
      id: number;
      position: number;
      slide_type: string;
      article_slug: string | null;
      title_text: string;
      engagement_phrase: string | null;
      background_image_path: string | null;
      composite_image_path: string | null;
      status: string;
      error_message: string | null;
      created_at: string;
      updated_at: string | null;
    }>;

    // Determine overall status
    let overallStatus: string;
    if (slides.length === 0) {
      overallStatus = 'not_generated';
    } else if (slides.some((s) => s.status === 'generating' || s.status === 'pending')) {
      overallStatus = 'generating';
    } else if (slides.every((s) => s.status === 'generated')) {
      overallStatus = 'completed';
    } else if (slides.some((s) => s.status === 'failed')) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'pending';
    }

    res.json({
      reportId,
      status: overallStatus,
      slideCount: slides.length,
      slides: slides.map((s) => ({
        id: s.id,
        position: s.position,
        slideType: s.slide_type,
        articleSlug: s.article_slug,
        titleText: s.title_text,
        engagementPhrase: s.engagement_phrase,
        backgroundImagePath: s.background_image_path,
        compositeImagePath: s.composite_image_path,
        status: s.status,
        errorMessage: s.error_message,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching carousel metadata:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default adminRouter;
