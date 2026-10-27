import { Router } from 'express';
import { createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { COURSE_IDS, courseWorkload, nextCourseStart } from '../shared/courseCatalog.js';
import { getEmailSettings } from './services/emailSettings.js';

const schema = z.object({ courseId: z.enum(COURSE_IDS), email: z.string().trim().max(254).email(), locale: z.enum(['en', 'es']).default('en'), website: z.string().max(300).optional().default('') });
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const router = Router();
// Bounded, process-local anti-duplicate guard. Store only hashes, never email addresses.
const recent = new Map<string, number>();
const pending = new Set<string>();
let windowStart = Date.now(), attempts = 0;
router.post('/interest', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Invalid course or email address.' }); return; }
  const data = parsed.data;
  if (data.website) { res.json({ success: true }); return; }
  const now = Date.now();
  if (now - windowStart >= 15 * 60000) { windowStart = now; attempts = 0; }
  if (++attempts > 40) { res.setHeader('Retry-After', '900'); res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' }); return; }
  for (const [key, time] of Array.from(recent.entries())) if (now - time >= 60000) recent.delete(key);
  const key = createHash('sha256').update(`${data.courseId}:${data.email.toLowerCase()}`).digest('hex');
  if (recent.has(key)) { res.json({ success: true, nextStartDate: nextCourseStart() }); return; }
  if (pending.has(key)) { res.status(429).json({ success: false, error: 'Request already in progress.' }); return; }
  pending.add(key);
  try {
    const emailSettings = getEmailSettings();
    if (!emailSettings) throw new Error('Mail unavailable');
    const course = courseWorkload(data.courseId);
    const startDate = nextCourseStart();
    const fields = [
      ['Course', course.title], ['Course ID', data.courseId], ['Visitor email', data.email], ['Language', data.locale],
      ['Next estimated start', startDate], ['Duration', `${course.weeks} weeks`], ['Estimated workload', `${course.weeklyHours} h/week, ${course.totalHours} h total`],
      ['Request', 'Notify me when enrollment opens for this course. This is not an enrollment or a payment.'],
    ];
    const transporter = nodemailer.createTransport({ service: 'gmail', connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, auth: { user: emailSettings.user, pass: emailSettings.appPassword } });
    const sent = await transporter.sendMail({ from: emailSettings.user, to: emailSettings.recipient, replyTo: data.email,
      subject: `Course enrollment notification request — ${course.title}`,
      text: fields.map(([name, value]) => `${name}: ${value}`).join('\n'),
      html: `<h2>Course enrollment notification request</h2>${fields.map(([name, value]) => `<p><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</p>`).join('')}`,
    });
    if (!Array.isArray(sent.accepted) || !sent.accepted.length) throw new Error('Mail not accepted');
    recent.set(key, now);
    res.json({ success: true, nextStartDate: startDate });
  } catch {
    console.error('Course notification request could not be sent');
    res.status(500).json({ success: false, error: 'Unable to send the notification request. Please try again.' });
  } finally { pending.delete(key); }
});
export default router;
