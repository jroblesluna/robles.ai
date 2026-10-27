import { Router } from 'express';
import nodemailer from 'nodemailer';
import { insertContactSchema } from '../shared/schema.js';
import { fromZodError } from 'zod-validation-error';
import { getEmailSettings } from './services/emailSettings.js';

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
  const emailSettings = getEmailSettings();
  if (!emailSettings) {
    console.error('Contact email is not configured');
    res.status(503).json({ success: false, error: 'Contact email is not configured' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: emailSettings.user, pass: emailSettings.appPassword },
    });
    await transporter.sendMail({
      from: emailSettings.user,
      to: emailSettings.recipient,
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
  } catch (error) {
    const details = error && typeof error === 'object'
      ? {
          name: 'name' in error ? error.name : undefined,
          code: 'code' in error ? error.code : undefined,
          responseCode: 'responseCode' in error ? error.responseCode : undefined,
          command: 'command' in error ? error.command : undefined,
        }
      : { name: 'UnknownError' };
    console.error('Contact email could not be sent', details);
    res.status(500).json({ success: false, error: 'An unexpected error occurred' });
  }
});

// Contact inquiries are delivered by mail, not exposed through a public inbox.
router.get('/', (_req, res) => {
  res.status(404).json({ success: false, error: 'Not Implemented' });
});

export default router;
