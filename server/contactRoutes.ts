import { Router } from 'express';
import nodemailer from 'nodemailer';
import { insertContactSchema } from '../shared/schema.js';
import { fromZodError } from 'zod-validation-error';

const router = Router();

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

router.post('/', async (req, res) => {
  const parsed = insertContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: fromZodError(parsed.error).message });
    return;
  }

  const data = parsed.data;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      // Keep authenticated From; replies go to the validated visitor address.
      replyTo: data.email,
      subject: 'New Contact Form Submission',
      text: [
        `Name: ${data.name}`, `Email: ${data.email}`, `Phone: ${data.phone || ''}`, `Company: ${data.company || ''}`,
        `Subject: ${data.subject}`, `Subscribed to Newsletter: ${data.newsletter ? 'Yes' : 'No'}`,
        '', data.message,
      ].join('\n'),
      html: `
        <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>` : ''}
        ${data.company ? `<p><strong>Company:</strong> ${escapeHtml(data.company)}</p>` : ''}
        <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
        <p><strong>Subscribed to Newsletter:</strong> ${data.newsletter ? 'Yes' : 'No'}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
      `,
    });
    res.status(200).json({ success: true, message: 'Contact form submitted successfully' });
  } catch {
    // Do not log SMTP errors that may contain configuration or visitor data.
    console.error('Contact email could not be sent');
    res.status(500).json({ success: false, error: 'An unexpected error occurred' });
  }
});

// Contact inquiries are delivered by mail, not exposed through a public inbox.
router.get('/', (_req, res) => {
  res.status(404).json({ success: false, error: 'Not Implemented' });
});

export default router;
