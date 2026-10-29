import { Router } from 'express';
import nodemailer from 'nodemailer';
import { insertContactSchema } from '../shared/schema.js';
import { fromZodError } from 'zod-validation-error';
import { getEmailSettings } from './services/emailSettings.js';
import db from './db.js';
import { attributionSource, normalizeAttribution } from '../shared/attribution.js';
import { normalizeClaritySession } from '../shared/clarity.js';
import { PUBLIC_CONTACT } from '../shared/publicContent.js';
import { allowContactInfoEmail, sendContactInfoEmail } from './services/contactInfoEmail.js';
import enLocale from '../src/i18n/locales/en/translation.json';
import esLocale from '../src/i18n/locales/es/translation.json';

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
  const now = new Date().toISOString();
  const attribution = normalizeAttribution(data.attribution, req.get('host'));
  const claritySession = normalizeClaritySession(data.clarity);
  const attributionLines = attribution
    ? [
        `Source: ${attributionSource(attribution) ?? 'Unknown'}`,
        ...Object.entries(attribution.params ?? {}).map(([key, value]) => `${key}: ${value}`),
        ...(attribution.landingPage ? [`Landing page: ${attribution.landingPage}`] : []),
        ...(attribution.referrer ? [`Referrer: ${attribution.referrer}`] : []),
      ]
    : [];

  // 1. Persist the contact submission in the database FIRST so the lead is never lost
  let submissionId: number | bigint | undefined;
  try {
    const insertStmt = db.prepare(`
      INSERT INTO contact_submissions (name, email, phone, company, subject, message, newsletter, attribution, clarity_session, email_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    const insertResult = insertStmt.run(
      data.name,
      data.email,
      data.phone || null,
      data.company || null,
      data.subject,
      data.message,
      data.newsletter ? 1 : 0,
      attribution ? JSON.stringify(attribution) : null,
      claritySession ? JSON.stringify(claritySession) : null,
      now
    );
    submissionId = insertResult.lastInsertRowid;
  } catch (dbError) {
    console.error('Failed to save contact submission to database', dbError);
  }

  // 2. Check email settings
  const emailSettings = getEmailSettings();
  if (!emailSettings) {
    if (submissionId) {
      try {
        db.prepare(
          "UPDATE contact_submissions SET email_status = 'not_configured', updated_at = ? WHERE id = ?"
        ).run(new Date().toISOString(), submissionId);
      } catch (e) {
        console.error('Failed to update contact submission status', e);
      }
    }
    console.error('Contact email is not configured');
    res.status(503).json({ success: false, error: 'Contact email is not configured' });
    return;
  }

  // 3. Attempt email delivery
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
        ...(attributionLines.length ? ['', 'Attribution:', ...attributionLines] : []),
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
        ${attributionLines.length ? `<p><strong>Attribution:</strong><br>${attributionLines.map(escapeHtml).join('<br>')}</p>` : ''}
      `,
    });

    if (submissionId) {
      try {
        db.prepare(
          "UPDATE contact_submissions SET email_status = 'sent', updated_at = ? WHERE id = ?"
        ).run(new Date().toISOString(), submissionId);
      } catch (e) {
        console.error('Failed to update contact submission status', e);
      }
    }

    // The lead is already delivered; the visitor's copy is best-effort and never blocks the reply.
    if (data.sendInfo && allowContactInfoEmail(data.email, req.ip ?? 'unknown')) {
      try {
        const locale = data.locale ?? 'es';
        const goals: Record<string, string> = (locale === 'en' ? enLocale : esLocale).contact.goals;
        const booking = db.prepare("SELECT value FROM settings WHERE key = 'booking_url'").get() as { value: string | null } | undefined;
        void sendContactInfoEmail({
          to: data.email,
          name: data.name,
          goal: data.goal ? goals[data.goal] : undefined,
          locale,
          bookingUrl: booking?.value && /^https?:\/\//i.test(booking.value) ? booking.value : PUBLIC_CONTACT.bookingUrl,
        }).catch(error => console.error('Contact info email could not be sent', error?.code ?? error?.name ?? error));
      } catch (error) {
        console.error('Contact info email could not be prepared', error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully',
      ...(submissionId ? { leadId: Number(submissionId) } : {}),
    });
  } catch (error) {
    const details = error && typeof error === 'object'
      ? {
          name: 'name' in error ? error.name : undefined,
          code: 'code' in error ? error.code : undefined,
          responseCode: 'responseCode' in error ? error.responseCode : undefined,
          command: 'command' in error ? error.command : undefined,
        }
      : { name: 'UnknownError' };

    if (submissionId) {
      try {
        const errorCode = details.code ? String(details.code) : (details.name ? String(details.name) : 'UnknownError');
        db.prepare(
          "UPDATE contact_submissions SET email_status = 'failed', email_error = ?, updated_at = ? WHERE id = ?"
        ).run(errorCode, new Date().toISOString(), submissionId);
      } catch (e) {
        console.error('Failed to update contact submission status', e);
      }
    }

    console.error('Contact email could not be sent', details);
    res.status(500).json({ success: false, error: 'An unexpected error occurred' });
  }
});

// Contact inquiries are delivered by mail, not exposed through a public inbox.
router.get('/', (_req, res) => {
  res.status(404).json({ success: false, error: 'Not Implemented' });
});

export default router;
