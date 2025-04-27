import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const sendApplication = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    console.error("❌ Invalid method:", req.method);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  console.log("📩 Starting form parsing...");

  const form = new formidable.IncomingForm({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    multiples: false,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Error parsing form:", err);
      return res.status(500).json({ message: 'Error parsing form data' });
    }

    console.log("✅ Form parsed correctly.");
    console.log("FIELDS:", fields);
    console.log("FILES:", files);

    const { name, email, phone, message, jobTitle } = fields;
    const resumeFile = (files.resume as File);

    if (!resumeFile || !name || !email || !jobTitle) {
      console.error("❌ Missing required fields:", {
        hasResume: !!resumeFile,
        name,
        email,
        jobTitle
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      console.log("🚀 Sending email...");

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

      console.log("✅ Email sent!");
      return res.status(200).json({ message: 'Application sent successfully' });

    } catch (error) {
      console.error("❌ Error sending email:", error);
      return res.status(500).json({ message: 'Error sending email' });
    }
  });
};

export default sendApplication;