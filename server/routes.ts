import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { insertContactSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import formidable, { File } from "formidable";
import nodemailer from "nodemailer";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url"; // <- Nuevo import
import editorsData from "./data/editors.json"; // Importa el JSON directamente

// Reconstruir __dirname compatible con ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());

  // 🚀 Contact form route - SEND EMAIL instead of storage
  app.post("/api/contact", (req: Request, res: Response) => {
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
          subject: "New Contact Form Submission",
          html: `
            <p><strong>Name:</strong> ${validatedData.name}</p>
            <p><strong>Email:</strong> ${validatedData.email}</p>
            ${validatedData.company ? `<p><strong>Company:</strong> ${validatedData.company}</p>` : ''}
            <p><strong>Subject:</strong> ${validatedData.subject}</p>
            <p><strong>Subscribed to Newsletter:</strong> ${validatedData.newsletter ? 'Yes' : 'No'}</p>
            <p><strong>Message:</strong></p>
            <p>${validatedData.message}</p>
          `,
        });

        console.log("✅ Contact email sent!");
        res.status(200).json({ success: true, message: 'Contact form submitted successfully' });

      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          console.error("❌ Validation error:", validationError.message);
          res.status(400).json({ success: false, error: validationError.message });
        } else if (error instanceof Error) {
          console.error("❌ Error sending contact email:", error);
          res.status(500).json({ success: false, error: "An unexpected error occurred" });
        }
      }
    })(); // Ejecutar el async inmediatamente
  });

  // (Optional) 🚫 You could remove this GET if no longer fetching submissions
  app.get("/api/contact", async (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: "Not Implemented" });
  });

  // 🚀 Application form with file upload
  app.post("/api/send-application", (req: Request, res: Response) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      multiples: false,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Error parsing form:", err);
        return res.status(500).json({ success: false, message: 'Error parsing form data' });
      }

      console.log("✅ Form parsed for Application.");
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

        console.log("✅ Application email sent!");

        fs.unlink(resumeFile.filepath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("❌ Error deleting temp file:", unlinkErr);
          } else {
            console.log("🗑️ Temp file deleted successfully.");
          }
        });

        return res.status(200).json({ success: true, message: 'Application sent successfully' });

      } catch (error) {
        console.error("❌ Error sending application email:", error);
        return res.status(500).json({ success: false, message: 'Error sending email' });
      }
    });
  });

  // 🚀 Blog routes
  // ✅ Update to `/api/blog` to support pagination and filtering
  app.get("/api/blog", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const editorId = req.query.editorId ? parseInt(req.query.editorId as string) : null;
      const offset = (page - 1) * limit;

      const postsPath = path.resolve(__dirname, "./data/posts");
      const files = await fs.promises.readdir(postsPath);

      // Sort descending by filename (assumed ISO-like timestamp format)
      const postFiles = files
        .filter(file => file.endsWith('.json') && !file.startsWith('.') && !file.includes('sitemap'))
        .sort((a, b) => b.localeCompare(a));

      // Optional filter by editor
      const matchedFiles: string[] = [];
      for (const file of postFiles) {
        if (matchedFiles.length >= offset + limit) break;
        const fullPath = path.join(postsPath, file);
        const data = await fs.promises.readFile(fullPath, 'utf-8');
        const json = JSON.parse(data);
        if (!editorId || json.editorId === editorId) matchedFiles.push(file);
      }

      const paginatedFiles = matchedFiles.slice(offset, offset + limit);

      const posts = await Promise.all(
        paginatedFiles.map(async (file) => {
          const data = await fs.promises.readFile(path.join(postsPath, file), "utf-8");
          const json = JSON.parse(data);
          return {
            slug: json.slug,
            date: json.date,
            editorId: json.editorId,
            translations: json.translations,
          };
        })
      );

      res.json({ posts, total: matchedFiles.length });
    } catch (error) {
      console.error("❌ Error loading posts:", error);
      res.status(500).json({ success: false, error: "Error loading posts!" });
    }
  });

  app.get("/api/blog/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const postPath = path.resolve(__dirname, "./data/posts", `${slug}.json`);
      const data = await fs.promises.readFile(postPath, "utf-8");
      const post = JSON.parse(data);
      console.log("🚀 Post data:", post);
      res.json(post);
    } catch (error) {
      res.status(404).json({ success: false, error: "Post not found" });
    }
  });

  // 🚀 API para obtener los editores
  app.get("/api/editors", (_req: Request, res: Response) => {
    res.json(editorsData);
  });

  const httpServer = createServer(app);
  return httpServer;
}