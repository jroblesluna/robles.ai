import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { insertContactSchema, insertQuizLeadSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import formidable, { File } from 'formidable';
import nodemailer from 'nodemailer';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { generateQuizLeadPdf } from './services/quizLeadPdf.js';
import { sendQuizVerificationEmail } from './services/quizVerificationEmail.js';
import { readdir, readFile, stat } from 'fs/promises';
import { fileURLToPath } from 'url';
import editorsData from './data/editors.json';
import { XMLBuilder } from 'fast-xml-parser';
import cron from 'node-cron';
import { generateHistoricalPosts } from '@/scripts/generateHistoricalPosts';
import { addOneDay, subtractOneDay } from '@/utils/managmentDate';
import adminRouter from './adminRoutes.js';
import analyticsRouter from './analyticsRoutes.js';
import backendRouter from './backendRoutes.js';
import publicRouter from './publicRoutes.js';
import searchRouter from './searchRoutes.js';
import chatRouter from './chatRoutes.js';
import { generateDominicalReport } from './jobs/generateDominical.js';
import { autoPublishDominical, shouldRunAutoPublishNow } from './jobs/autoPublishDominical.js';
import { generateCarousel } from './services/carouselGenerator.js';
import { generateQuizResultMessage } from './services/quizResultMessage.js';
import { getSlugIndex } from './vite.js';
import db from './db.js';
import { indexNewPosts, type PostJson } from './fts/indexer.js';
import { ensureListingTable, indexListingPosts, rebuildListingIndex, type PostJson as ListingPostJson } from './listing/indexer.js';

// Reconstruir __dirname compatible con ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());

  // Ensure the listing index table exists
  ensureListingTable(db);

  // Admin routes
  app.use('/api/admin', adminRouter);

  // Analytics routes
  app.use('/api/admin/analytics', analyticsRouter);

  // Backend management routes (DNS via Hostinger + Cloud Run read-only + health)
  app.use('/api/admin/backends', backendRouter);

  // Public routes (no auth — Meta servers need to access slide images)
  app.use('/api/public', publicRouter);

  // Search routes (mounted before catch-all /api/blog GET)
  app.use('/api/blog', searchRouter);

  // Chat routes (public chatbot widget API)
  app.use('/api/chat', chatRouter);

  // 🚀 Contact form route - SEND EMAIL instead of storage
  app.post('/api/contact', (req: Request, res: Response) => {
    (async () => {
      try {
        const validatedData = insertContactSchema.parse(req.body);

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_TO,
          subject: 'New Contact Form Submission',
          html: `
            <p><strong>Name:</strong> ${validatedData.name}</p>
            <p><strong>Email:</strong> ${validatedData.email}</p>
            ${
              validatedData.company
                ? `<p><strong>Company:</strong> ${validatedData.company}</p>`
                : ''
            }
            <p><strong>Subject:</strong> ${validatedData.subject}</p>
            <p><strong>Subscribed to Newsletter:</strong> ${
              validatedData.newsletter ? 'Yes' : 'No'
            }</p>
            <p><strong>Message:</strong></p>
            <p>${validatedData.message}</p>
          `,
        });

        console.log('✅ Contact email sent!');
        res
          .status(200)
          .json({ success: true, message: 'Contact form submitted successfully' });
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          console.error('❌ Validation error:', validationError.message);
          res.status(400).json({ success: false, error: validationError.message });
        } else if (error instanceof Error) {
          console.error('❌ Error sending contact email:', error);
          res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
      }
    })(); // Ejecutar el async inmediatamente
  });

  // (Optional) 🚫 You could remove this GET if no longer fetching submissions
  app.get('/api/contact', async (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not Implemented' });
  });

  app.get('/api/contact', async (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not Implemented' });
  });

  // 🧠 AI Diagnosis Quiz lead route — persists the lead and requires email verification
  // before the report/PDF unlock (see /api/quiz-lead/verify, /status, /resend, /pdf below).

  const QUIZ_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const QUIZ_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between resend requests

  function getRequestBaseUrl(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    let host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost';
    host = host.replace('0.0.0.0', 'localhost');
    return `${proto}://${host}`;
  }

  interface QuizLeadRow {
    id: number;
    name: string;
    email: string;
    company: string | null;
    whatsapp: string | null;
    answers: string;
    score: number;
    profile: string;
    recommended_services: string;
    locale: string;
    result_message: string | null;
    verified: number;
    created_at: string;
    verified_at: string | null;
  }

  function createQuizVerificationToken(leadId: number): { token: string; expiresAt: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QUIZ_TOKEN_TTL_MS).toISOString();
    db.prepare(
      'INSERT INTO quiz_verification_tokens (token, lead_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(token, leadId, expiresAt, now.toISOString());
    return { token, expiresAt };
  }

  function renderQuizVerifyPage(
    status: 'success' | 'expired' | 'invalid',
    locale: 'es' | 'en'
  ): string {
    const copy = {
      es: {
        success: {
          title: '¡Correo confirmado!',
          body: 'Ya puedes volver a la pestaña donde estabas completando el diagnóstico — tu reporte se desbloqueará automáticamente.',
        },
        expired: {
          title: 'Este enlace expiró',
          body: 'Los enlaces de confirmación duran 30 minutos. Vuelve a la pestaña del diagnóstico y pide que te reenviemos el correo.',
        },
        invalid: {
          title: 'Enlace inválido',
          body: 'Este enlace ya no es válido. Vuelve a la pestaña del diagnóstico e inténtalo de nuevo.',
        },
      },
      en: {
        success: {
          title: 'Email confirmed!',
          body: 'You can go back to the tab where you were completing your diagnosis — your report will unlock automatically.',
        },
        expired: {
          title: 'This link expired',
          body: 'Confirmation links last 30 minutes. Go back to the diagnosis tab and ask us to resend the email.',
        },
        invalid: {
          title: 'Invalid link',
          body: 'This link is no longer valid. Go back to the diagnosis tab and try again.',
        },
      },
    } as const;

    const c = (copy[locale] ?? copy.es)[status];
    const icon = status === 'success' ? '✅' : status === 'expired' ? '⏱️' : '⚠️';

    return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Robles.AI</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,0.08);padding:40px 32px;text-align:center;">
    <div style="height:4px;background:linear-gradient(90deg,#4F6EF5,#8B5CF6);border-radius:4px;margin:-40px -32px 24px -32px;"></div>
    <div style="font-size:40px;margin-bottom:12px;">${icon}</div>
    <h1 style="font-size:20px;color:#0F172A;margin:0 0 12px 0;">${c.title}</h1>
    <p style="font-size:14px;color:#64748B;line-height:1.6;margin:0;">${c.body}</p>
  </div>
</body>
</html>`;
  }

  app.post('/api/quiz-lead', (req: Request, res: Response) => {
    (async () => {
      try {
        const validatedData = insertQuizLeadSchema.parse(req.body);
        const now = new Date().toISOString();

        const resultMessage = await generateQuizResultMessage({
          answers: validatedData.answers,
          score: validatedData.score,
          profile: validatedData.profile,
          recommendedServices: validatedData.recommendedServices,
          locale: validatedData.locale,
        });

        const insertResult = db
          .prepare(
            `INSERT INTO quiz_leads
              (name, email, company, whatsapp, answers, score, profile, recommended_services, locale, result_message, verified, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
          )
          .run(
            validatedData.name,
            validatedData.email,
            validatedData.company || null,
            validatedData.whatsapp || null,
            JSON.stringify(validatedData.answers),
            validatedData.score,
            validatedData.profile,
            JSON.stringify(validatedData.recommendedServices),
            validatedData.locale,
            resultMessage,
            now
          );

        const leadId = insertResult.lastInsertRowid as number;
        const { token } = createQuizVerificationToken(leadId);
        const verifyUrl = `${getRequestBaseUrl(req)}/api/quiz-lead/verify?token=${token}`;

        await sendQuizVerificationEmail({
          to: validatedData.email,
          name: validatedData.name,
          verifyUrl,
          locale: validatedData.locale,
        });

        // Internal notification — sent immediately so the team sees new leads right away.
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          });
          const answersHtml = Object.entries(validatedData.answers)
            .map(([question, answer]) => `<li><strong>${question}:</strong> ${answer}</li>`)
            .join('');
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO,
            subject: `New AI Diagnosis Quiz Lead — score ${validatedData.score}/100 (pending email verification)`,
            html: `
              <p><strong>Name:</strong> ${validatedData.name}</p>
              <p><strong>Email:</strong> ${validatedData.email}</p>
              ${validatedData.company ? `<p><strong>Company:</strong> ${validatedData.company}</p>` : ''}
              ${validatedData.whatsapp ? `<p><strong>WhatsApp:</strong> ${validatedData.whatsapp}</p>` : ''}
              <p><strong>Score:</strong> ${validatedData.score}/100</p>
              <p><strong>Profile:</strong> ${validatedData.profile}</p>
              <p><strong>Recommended services:</strong> ${validatedData.recommendedServices.join(', ')}</p>
              <p><strong>Answers:</strong></p>
              <ul>${answersHtml}</ul>
            `,
          });
        } catch (notifyError) {
          console.error('⚠️ Internal quiz lead notification failed (non-fatal):', notifyError);
        }

        res.status(200).json({ success: true, leadId });
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          console.error('❌ Validation error:', validationError.message);
          res.status(400).json({ success: false, error: validationError.message });
        } else if (error instanceof Error) {
          console.error('❌ Error creating quiz lead:', error);
          res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
      }
    })();
  });

  // Polled by the quiz page while the visitor waits to click the verification link.
  app.get('/api/quiz-lead/status', (req: Request, res: Response) => {
    try {
      const leadId = Number(req.query.leadId);
      if (!leadId) {
        res.status(400).json({ error: 'leadId is required' });
        return;
      }

      const lead = db.prepare('SELECT * FROM quiz_leads WHERE id = ?').get(leadId) as QuizLeadRow | undefined;
      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      if (lead.verified) {
        res.json({ verified: true, expired: false, resultMessage: lead.result_message });
        return;
      }

      const latestToken = db
        .prepare('SELECT expires_at FROM quiz_verification_tokens WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(leadId) as { expires_at: string } | undefined;

      const expired = !latestToken || new Date(latestToken.expires_at).getTime() < Date.now();

      res.json({ verified: false, expired, resultMessage: null });
    } catch (error) {
      console.error('❌ Error checking quiz lead status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Visitor clicks this from the verification email.
  app.get('/api/quiz-lead/verify', (req: Request, res: Response) => {
    try {
      const token = req.query.token as string | undefined;
      if (!token) {
        res.status(400).send(renderQuizVerifyPage('invalid', 'es'));
        return;
      }

      const tokenRow = db
        .prepare('SELECT * FROM quiz_verification_tokens WHERE token = ?')
        .get(token) as { token: string; lead_id: number; expires_at: string; used_at: string | null } | undefined;

      if (!tokenRow) {
        res.status(400).send(renderQuizVerifyPage('invalid', 'es'));
        return;
      }

      const lead = db.prepare('SELECT * FROM quiz_leads WHERE id = ?').get(tokenRow.lead_id) as
        | QuizLeadRow
        | undefined;
      const locale: 'es' | 'en' = lead?.locale === 'en' ? 'en' : 'es';

      if (lead?.verified) {
        res.send(renderQuizVerifyPage('success', locale));
        return;
      }

      if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
        res.status(410).send(renderQuizVerifyPage('expired', locale));
        return;
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE quiz_verification_tokens SET used_at = ? WHERE token = ?').run(now, token);
      db.prepare('UPDATE quiz_leads SET verified = 1, verified_at = ? WHERE id = ?').run(now, tokenRow.lead_id);

      res.send(renderQuizVerifyPage('success', locale));
    } catch (error) {
      console.error('❌ Error verifying quiz lead token:', error);
      res.status(500).send(renderQuizVerifyPage('invalid', 'es'));
    }
  });

  // Resend the verification email if the visitor's link expired.
  app.post('/api/quiz-lead/resend', (req: Request, res: Response) => {
    (async () => {
      try {
        const leadId = Number(req.body?.leadId);
        if (!leadId) {
          res.status(400).json({ error: 'leadId is required' });
          return;
        }

        const lead = db.prepare('SELECT * FROM quiz_leads WHERE id = ?').get(leadId) as QuizLeadRow | undefined;
        if (!lead) {
          res.status(404).json({ error: 'Lead not found' });
          return;
        }
        if (lead.verified) {
          res.json({ success: true, verified: true });
          return;
        }

        const latestToken = db
          .prepare('SELECT created_at FROM quiz_verification_tokens WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1')
          .get(leadId) as { created_at: string } | undefined;

        if (latestToken && Date.now() - new Date(latestToken.created_at).getTime() < QUIZ_RESEND_COOLDOWN_MS) {
          res.status(429).json({ error: 'Please wait a bit before requesting another email' });
          return;
        }

        const { token } = createQuizVerificationToken(leadId);
        const verifyUrl = `${getRequestBaseUrl(req)}/api/quiz-lead/verify?token=${token}`;
        const locale: 'es' | 'en' = lead.locale === 'en' ? 'en' : 'es';

        await sendQuizVerificationEmail({ to: lead.email, name: lead.name, verifyUrl, locale });

        res.json({ success: true, verified: false });
      } catch (error) {
        console.error('❌ Error resending quiz verification email:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    })();
  });

  // Downloadable PDF report — only served once the lead's email is verified.
  app.get('/api/quiz-lead/pdf', (req: Request, res: Response) => {
    (async () => {
      try {
        const leadId = Number(req.query.leadId);
        if (!leadId) {
          res.status(400).json({ error: 'leadId is required' });
          return;
        }

        const lead = db.prepare('SELECT * FROM quiz_leads WHERE id = ?').get(leadId) as QuizLeadRow | undefined;
        if (!lead) {
          res.status(404).json({ error: 'Lead not found' });
          return;
        }
        if (!lead.verified) {
          res.status(403).json({ error: 'Email not verified yet' });
          return;
        }

        const pdfBuffer = await generateQuizLeadPdf({
          name: lead.name,
          company: lead.company,
          score: lead.score,
          profile: lead.profile as 'starting' | 'promising' | 'ready' | 'priority',
          recommendedServices: JSON.parse(lead.recommended_services),
          resultMessage: lead.result_message,
          locale: lead.locale === 'en' ? 'en' : 'es',
          createdAt: lead.created_at,
        });

        const safeName = lead.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="diagnostico-ia-${safeName}.pdf"`);
        res.send(pdfBuffer);
      } catch (error) {
        console.error('❌ Error generating quiz lead PDF:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    })();
  });

  const timeZone = 'America/Lima';

  async function getLastPostDateByEditor(editorId: number): Promise<string | null> {
    const postsRoot = path.resolve(__dirname, './data/posts');
    const allJsonFiles = await collectJsonFiles(postsRoot);
    const matchingDates: string[] = [];

    for (const filePath of allJsonFiles) {
      const content = await readFile(filePath, 'utf-8');
      const json = JSON.parse(content);

      if (json.editorId === editorId && json.date) {
        matchingDates.push(json.date);
      }
    }

    if (matchingDates.length === 0) return null;

    return matchingDates[matchingDates.length - 1].split('-').slice(0, 3).join('-'); // YYYY-MM-DD;
  }

  // Cron job to call each hour
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        console.log('[CRON] Scheduled task started...');
        //Printing if it's production or development
        console.log(`Environment: ${process.env.NODE_ENV}`);
        // Skip execution if in development mode
        if (process.env.NODE_ENV == 'development') {
          console.log('[CRON] Skipping task in development mode.');
          return;
        }

        // Get the current date/time in the target timezone
        const zonedDateStr = new Date().toLocaleString('en-US', { timeZone });
        const zonedDate = new Date(zonedDateStr);

        // Format date components to "YYYY-MM-DD"
        const year = zonedDate.getFullYear();
        const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
        const day = String(zonedDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        if (!formattedDate) {
          console.error('Target Date is missing!');
          return;
        }

        // Use the current hour  plus 1 as the editor ID
        const editorId = zonedDate.getHours() + 1;

        if (!editorId) {
          console.error('Target Editor ID is missing!');
          return;
        }
        const targetDate = subtractOneDay(formattedDate); // subtract one day from the current date

        console.log(
          '########################################################################################'
        );
        console.log(
          `[CRON] Running task at ${zonedDateStr} for date ${targetDate} with editor ID ${editorId}`
        );
        console.log(
          '########################################################################################'
        );
        // Fetch the last post date for the editor
        const lastPostDate = await getLastPostDateByEditor(editorId);

        if (lastPostDate) {
          console.log(`Last post date for editor ${editorId} is: ${lastPostDate}`);

          await generateHistoricalPosts(targetDate, editorId, addOneDay(lastPostDate));
        } else {
          // If no last post date, use one day before the current date
          const previousDate = subtractOneDay(targetDate);
          await generateHistoricalPosts(targetDate, editorId, previousDate);
        }

        // Rebuild the SlugIndex so newly generated posts are immediately queryable
        const slugIndex = getSlugIndex();
        if (slugIndex) {
          await slugIndex.rebuild();
          console.log('[CRON] SlugIndex rebuilt with new posts.');
        }

        // Collect newly generated posts for indexing
        let posts: ListingPostJson[] = [];
        try {
          const [yyyy, mm, dd] = targetDate.split('-');
          const dayDir = path.resolve(__dirname, `./data/posts/${yyyy}/${mm}/${dd}`);
          const dayFiles = await readdir(dayDir);
          const jsonFiles = dayFiles.filter((f) => f.endsWith('.json'));

          for (const file of jsonFiles) {
            try {
              const content = await readFile(path.join(dayDir, file), 'utf-8');
              posts.push(JSON.parse(content) as ListingPostJson);
            } catch (parseErr) {
              console.warn(`[CRON] Skipped (parse error): ${file}`, parseErr);
            }
          }
        } catch (collectErr) {
          console.error('[CRON] Error collecting new posts (non-fatal):', collectErr);
        }

        // Index into FTS5 for search
        try {
          if (posts.length > 0) {
            indexNewPosts(db, posts as unknown as PostJson[]);
            console.log(`[CRON] FTS indexed ${posts.length} new posts.`);
          }
        } catch (ftsErr) {
          console.error('[CRON] FTS indexing error (non-fatal):', ftsErr);
        }

        // Index into listing index (blog_posts_index)
        try {
          if (posts.length > 0) {
            indexListingPosts(db, posts);
            console.log(`[CRON] Listing indexed ${posts.length} new posts.`);
          }
        } catch (listingErr) {
          console.error('[CRON] Listing indexing error (non-fatal):', listingErr);
        }

        console.log('[CRON] Scheduled task completed.');
      } catch (error) {
        console.error('[CRON] Error executing scheduled task:', error);
      }
    },
    {
      timezone: timeZone,
    }
  );

  // Saturday 12pm: Generate El Dominical IA weekly report + carousel
  cron.schedule(
    '0 12 * * 6',
    async () => {
      try {
        console.log('[CRON] Starting Dominical IA generation...');
        if (process.env.NODE_ENV === 'development') {
          console.log('[CRON] Skipping Dominical generation in development mode.');
          return;
        }
        const { reportId } = await generateDominicalReport();
        console.log('[CRON] Dominical IA generation completed. Report ID:', reportId);

        // Auto-generate carousel with cinematic + natural style
        console.log('[CRON] Starting carousel generation for report', reportId);
        await generateCarousel(reportId, 'natural', 'cinematic-scene');
        console.log('[CRON] Carousel generation completed for report', reportId);
      } catch (error) {
        console.error('[CRON] Error generating Dominical IA:', error);
      }
    },
    { timezone: timeZone }
  );

  // Sunday 6pm (America/Lima): Auto-publish El Dominical IA to LinkedIn
  // Auto-publish El Dominical IA. Runs every 30 minutes and only fires when the
  // current time (in the admin-configured timezone) matches the configured
  // publish slot on Sunday. The day/time/timezone are read from settings:
  //   auto_publish (on/off), auto_publish_time (e.g. "18:00"), auto_publish_timezone.
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          // Skip in development mode.
          return;
        }
        if (!shouldRunAutoPublishNow()) {
          return;
        }
        console.log('[CRON] Starting Dominical IA auto-publish (scheduled slot matched)...');
        await autoPublishDominical();
        console.log('[CRON] Dominical IA auto-publish completed.');
      } catch (error) {
        console.error('[CRON] Error auto-publishing Dominical IA:', error);
      }
    },
    { timezone: 'UTC' }
  );

  app.get('/api/generate-posts', async (req: Request, res: Response) => {
    console.log('[API] Manual post generation triggered');
    try {
      const editorId = req.query.editorId ? parseInt(req.query.editorId as string, 10) : undefined;
      const specificDate = req.query.date as string | undefined;

      if (specificDate) {
        // Direct mode: generate for a specific date, bypassing lastPostDate logic
        console.log(`[API] Generating for specific date: ${specificDate}, editor: ${editorId || 'all'}`);
        const result = await generateHistoricalPosts(specificDate, editorId, specificDate);
        console.log('[API] Specific date generation completed.');
        res.status(200).json({ success: true, data: `Generated for ${specificDate}`, stats: result });
        return;
      }

      // Default mode: use lastPostDate catch-up logic
      // Get the current date/time in the target timezone
      const zonedDateStr = new Date().toLocaleString('en-US', { timeZone });
      const zonedDate = new Date(zonedDateStr);

      // Format date components to "YYYY-MM-DD"
      const year = zonedDate.getFullYear();
      const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
      const day = String(zonedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const resolvedEditorId = editorId || 12;
      const targetDate = subtractOneDay(formattedDate);

      console.log(
        '########################################################################################'
      );
      console.log(
        `[CRON] Running task at ${zonedDateStr} for date ${targetDate} with editor ID ${resolvedEditorId}`
      );
      console.log(
        '########################################################################################'
      );

      const lastPostDate = await getLastPostDateByEditor(resolvedEditorId);

      if (lastPostDate) {
        console.log(`Last post date for editor ${resolvedEditorId} is: ${lastPostDate}`);
        await generateHistoricalPosts(targetDate, resolvedEditorId, addOneDay(lastPostDate));
      } else {
        const previousDate = subtractOneDay(targetDate);
        await generateHistoricalPosts(targetDate, resolvedEditorId, previousDate);
      }

      console.log('[CRON] Scheduled task completed.');
      res.status(200).json({ success: true, data: 'Task executed successfully' });
    } catch (error) {
      console.error('[API] Error executing generate-posts:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/test', async (req: Request, res: Response) => {
    console.log('testing api:');

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const editorId = 12;
      //sa
      const offset = (page - 1) * limit;

      const postsRoot = path.resolve(__dirname, './data/posts');
      console.log('postsRoot:', postsRoot);
      const allFiles = await collectJsonFiles(postsRoot);

      const filtered = [];
      for (const file of allFiles) {
        const content = await readFile(file, 'utf-8');
        const json = JSON.parse(content);
        if (!editorId || json.editorId === editorId) {
          filtered.push({
            slug: json.slug,
            date: json.date,
            editorId: json.editorId,
            translations: json.translations,
          });
        }
      }

      // Sort descending by date string in slug (assumes same timestamp format)
      filtered.sort((a, b) => b.slug.localeCompare(a.slug));
      const paginated = filtered.slice(offset, offset + limit);
      res.status(200).json({ success: true, data: paginated, editor: editorId });
    } catch (err) {
      console.error('❌ Error loading nested posts:', err);
      res.status(500).json({ success: false, error: 'Failed to load posts' });
    }
  });

  // 🚀 Application form with file upload
  app.post('/api/send-application', (req: Request, res: Response) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      multiples: false,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ Error parsing form:', err);
        return res.status(500).json({ success: false, message: 'Error parsing form data' });
      }

      console.log('✅ Form parsed for Application.');
      const { name, email, phone, message, jobTitle } = fields;
      const resumeFile = (files.resume as File[])[0];

      if (!resumeFile || !name || !email || !jobTitle) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const resumeContent = fs.readFileSync(resumeFile.filepath);

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_TO,
          subject: `New Application for ${jobTitle}`,
          html: `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Message:</strong> ${message || 'N/A'}</p>`,
          attachments: [
            {
              filename: resumeFile.originalFilename || 'resume.pdf',
              content: resumeContent,
            },
          ],
        });

        console.log('✅ Application email sent!');

        fs.unlink(resumeFile.filepath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('❌ Error deleting temp file:', unlinkErr);
          } else {
            console.log('🗑️ Temp file deleted successfully.');
          }
        });

        return res
          .status(200)
          .json({ success: true, message: 'Application sent successfully' });
      } catch (error) {
        console.error('❌ Error sending application email:', error);
        return res.status(500).json({ success: false, message: 'Error sending email' });
      }
    });
  });

  // 🚀 Blog routes
  // ✅ Update to `/api/blog` to support pagination and filtering
  async function collectJsonFiles(dir: string, collected: string[] = []) {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        await collectJsonFiles(fullPath, collected);
      } else if (
        entry.endsWith('.json') &&
        !entry.startsWith('.') &&
        !entry.includes('sitemap')
      ) {
        collected.push(fullPath);
      }
    }
    return collected;
  }

  app.get('/api/blog', (req: Request, res: Response) => {
    try {
      let page = parseInt(req.query.page as string) || 1;
      let limit = parseInt(req.query.limit as string) || 9;
      if (limit > 100) limit = 100;
      if (page < 1) page = 1;
      const offset = (page - 1) * limit;

      const editorId = req.query.editorId ? parseInt(req.query.editorId as string) : null;
      const category = req.query.category as string | undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : null;

      // Build dynamic WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];

      if (editorId) {
        conditions.push('editor_id = ?');
        params.push(editorId);
      }
      if (category) {
        conditions.push("categories LIKE ?");
        params.push(`%"${category}"%`);
      }
      if (days && days > 0) {
        // date is stored as 'YYYY-MM-DD-HH-mm-ss', zero-padded so it sorts/compares lexicographically
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const cutoffStr = cutoff.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        conditions.push('date >= ?');
        params.push(cutoffStr);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Query posts
      const posts = db.prepare(`
        SELECT slug, date, editor_id, categories, title_en, excerpt_en, title_es, excerpt_es
        FROM blog_posts_index
        ${whereClause}
        ORDER BY date DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      // Query total count
      const totalRow = db.prepare(`
        SELECT COUNT(*) as total FROM blog_posts_index ${whereClause}
      `).get(...params) as { total: number };

      // Transform to match current response shape
      const transformed = (posts as any[]).map((row: any) => ({
        slug: row.slug,
        date: row.date,
        editorId: row.editor_id,
        translations: {
          en: { title: row.title_en || '', excerpt: row.excerpt_en || '' },
          es: { title: row.title_es || '', excerpt: row.excerpt_es || '' },
        },
      }));

      res.json({ posts: transformed, total: totalRow.total });
    } catch (err) {
      console.error('Error querying blog listing index:', err);
      res.status(500).json({ success: false, error: 'Failed to load posts' });
    }
  });

  app.get('/api/blog/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;
    const [yyyy, mm, dd] = slug.split('-');

    const structuredPath = path.resolve(
      __dirname,
      `./data/posts/${yyyy}/${mm}/${dd}/${slug}.json`
    );

    try {
      const data = await fs.promises.readFile(structuredPath, 'utf-8');
      const post = JSON.parse(data);
      console.log('📄 Exact match found:', structuredPath);
      res.json(post);
      return;
    } catch {
      // fallback
      try {
        const dayDir = path.resolve(__dirname, `./data/posts/${yyyy}/${mm}/${dd}`);
        const files = await fs.promises.readdir(dayDir);
        const prefix = slug.slice(0, 19); // YYYY-mm-DD-HH-MM-SS

        const match = files.find((f) => f.startsWith(prefix) && f.endsWith('.json'));

        if (match) {
          const altPath = path.join(dayDir, match);
          const data = await fs.promises.readFile(altPath, 'utf-8');
          const post = JSON.parse(data);
          console.log('🔎 Fuzzy match used:', match);
          res.json(post);
          return;
        }

        console.warn('⚠️ No matching post for:', slug);
        res.status(404).json({ success: false, error: 'Post not found' });
      } catch (err) {
        console.error('❌ Error reading fallback folder:', err);
        res.status(404).json({ success: false, error: 'Post not found' });
      }
    }
  });

  // 🚀 API para obtener los editores
  app.get('/api/editors', (_req: Request, res: Response) => {
    res.json(editorsData);
  });

  app.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const sitemapFolder = path.resolve(__dirname, './data/sitemaps');
      const staticPagesPath = path.resolve(__dirname, '../public/static-pages.xml');

      // Build sitemap entries with lastmod from file modification dates
      const sitemapEntries: { loc: string; lastmod: string }[] = [];

      // Add static-pages.xml entry
      try {
        const staticStat = await fs.promises.stat(staticPagesPath);
        sitemapEntries.push({
          loc: 'https://robles.ai/static-pages.xml',
          lastmod: staticStat.mtime.toISOString().split('T')[0],
        });
      } catch {
        // If static-pages.xml doesn't exist, include without lastmod
        sitemapEntries.push({
          loc: 'https://robles.ai/static-pages.xml',
          lastmod: new Date().toISOString().split('T')[0],
        });
      }

      // Add monthly blog sitemaps
      try {
        const sitemapFiles = await fs.promises.readdir(sitemapFolder);
        for (const f of sitemapFiles.filter((f) => f.endsWith('.xml'))) {
          const filePath = path.join(sitemapFolder, f);
          const fileStat = await fs.promises.stat(filePath);
          sitemapEntries.push({
            loc: `https://robles.ai/sitemaps/${f}`,
            lastmod: fileStat.mtime.toISOString().split('T')[0],
          });
        }
      } catch {
        // If sitemaps folder doesn't exist yet, just serve with static-pages only
      }

      const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
      const sitemapIndex = {
        sitemapindex: {
          '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
          sitemap: sitemapEntries.map((entry) => ({
            loc: entry.loc,
            lastmod: entry.lastmod,
          })),
        },
      };

      const xml = builder.build(sitemapIndex);
      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('❌ Error generating dynamic sitemap index:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  app.get('/sitemaps/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;
    const sitemapPath = path.resolve(__dirname, `./data/sitemaps/${filename}`);

    try {
      if (!filename.endsWith('.xml')) {
        res.status(400).send('Invalid sitemap file format');
        return;
      }

      const content = await fs.promises.readFile(sitemapPath, 'utf-8');
      res.setHeader('Content-Type', 'application/xml');
      res.send(content);
    } catch (err) {
      console.error(`❌ Sitemap not found: ${filename}`);
      res.status(404).send('Sitemap not found');
    }
  });

  const httpServer = createServer(app);

  // Auto-rebuild listing index if table is empty
  (async () => {
    try {
      const count = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
      if (count.c === 0) {
        console.log('[Startup] blog_posts_index is empty — running full rebuild...');
        const postsDir = path.resolve(__dirname, './data/posts');
        const result = await rebuildListingIndex(db, postsDir);
        console.log(`[Startup] Listing index rebuilt: ${result.indexed} posts indexed, ${result.skipped} skipped.`);
      } else {
        console.log(`[Startup] blog_posts_index already populated (${count.c} rows), skipping rebuild.`);
      }
    } catch (err) {
      console.error('[Startup] Error checking/rebuilding listing index:', err);
    }
  })();

  return httpServer;
}
