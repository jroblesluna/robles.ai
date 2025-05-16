import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { insertContactSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import formidable, { File } from 'formidable';
import nodemailer from 'nodemailer';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import { fileURLToPath } from 'url'; // <- Nuevo import
import editorsData from './data/editors.json'; // Importa el JSON directamente
import { XMLBuilder } from 'fast-xml-parser';
import cron from 'node-cron';
import { generateHistoricalPosts } from '@/scripts/generateHistoricalPosts';
import { addOneDay, subtractOneDay } from '@/utils/managmentDate';

// Reconstruir __dirname compatible con ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());

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

  app.get('/api/test', async (_req: Request, res: Response) => {
    console.log('__dirname:', __dirname);
    console.log('process.cwd():', process.cwd());
    res.status(200).json({ success: true, error: 'api test' });
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
    '2 10 * * *',
    async () => {
      try {
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

        // Use the current hour as the editor ID (as per your logic)
        const editorId = zonedDate.getHours();

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

        console.log('[CRON] Scheduled task completed.');
      } catch (error) {
        console.error('[CRON] Error executing scheduled task:', error);
      }
    },
    {
      timezone: timeZone,
    }
  );

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

  app.get('/api/blog', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const editorId = req.query.editorId ? parseInt(req.query.editorId as string) : null;
      const offset = (page - 1) * limit;

      const postsRoot = path.resolve(__dirname, './data/posts');
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

      res.json({ posts: paginated, total: filtered.length });
    } catch (err) {
      console.error('❌ Error loading nested posts:', err);
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
      const sitemapFiles = await fs.promises.readdir(sitemapFolder);

      const sitemapUrls = [
        'https://robles.ai/static-pages.xml',
        ...sitemapFiles
          .filter((f) => f.endsWith('.xml'))
          .map((f) => `https://robles.ai/sitemaps/${f}`),
      ];

      const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
      const sitemapIndex = {
        sitemapindex: {
          '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
          sitemap: sitemapUrls.map((url) => ({
            loc: url,
            // Optionally, add lastmod with fs.statSync if needed
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
  return httpServer;
}
