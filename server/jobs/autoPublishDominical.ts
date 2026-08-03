import nodemailer from 'nodemailer';
import db from '../db.js';
import { publishPost } from '../services/linkedin.js';

interface DominicalReport {
  id: number;
  week_start: string;
  week_end: string;
  post_text: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  last_edited_at: string | null;
}

/**
 * Helper to read a setting from the database.
 */
function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

/**
 * Sends an error notification email to the admin when auto-publish fails.
 */
async function sendErrorNotification(errorMessage: string): Promise<void> {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('⚠️ Email credentials not configured. Cannot send error notification.');
    return;
  }

  const notificationRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('notification_email') as
    | { value: string | null }
    | undefined;

  const recipient = notificationRow?.value || process.env.EMAIL_TO;

  if (!recipient) {
    console.warn('⚠️ No notification email configured. Cannot send error notification.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const baseUrl = process.env.BASE_URL || 'https://robles.ai';

  await transporter.sendMail({
    from: emailUser,
    to: recipient,
    subject: '⚠️ Error en la publicación automática del Dominical IA',
    html: `
      <h2>⚠️ Error en Auto-Publish</h2>
      <p>La publicación automática del Dominical IA ha fallado con el siguiente error:</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto;">${errorMessage}</pre>
      <p>Puedes revisar el reporte y publicarlo manualmente:</p>
      <p>
        <a href="${baseUrl}/admin/dominical" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">
          Ir al panel de administración
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Este email fue enviado automáticamente por El Dominical IA.</p>
    `,
  });

  console.log('✅ Error notification email sent to', recipient);
}

/**
 * Main auto-publish function.
 *
 * Runs every Sunday at 12pm (America/Lima):
 * 1. Check if auto_publish is enabled
 * 2. Find the most recent dominical report
 * 3. Skip if status is 'cancelled' or 'published'
 * 4. Publish to LinkedIn
 * 5. On success: mark as published with timestamp and linkedin_post_id
 * 6. On failure: mark as failed, store error, send notification email
 */
export async function autoPublishDominical(): Promise<void> {
  console.log('📤 Starting Dominical IA auto-publish...');

  // 1. Check if auto_publish is enabled (default: true if not set)
  const autoPublishSetting = getSetting('auto_publish');
  if (autoPublishSetting === 'false' || autoPublishSetting === '0') {
    console.log('⏭️ Auto-publish is disabled in settings. Skipping.');
    return;
  }

  // 2. Find the most recent dominical report
  const report = db.prepare(
    'SELECT id, week_start, week_end, post_text, image_url, status, created_at, last_edited_at FROM dominical_reports ORDER BY created_at DESC LIMIT 1'
  ).get() as DominicalReport | undefined;

  if (!report) {
    console.log('ℹ️ No dominical report found. Nothing to publish.');
    return;
  }

  console.log(`📋 Found report #${report.id} (status: ${report.status}, week: ${report.week_start} - ${report.week_end})`);

  // 3. Skip if status is 'cancelled' or 'published'
  if (report.status === 'cancelled') {
    console.log('⏭️ Report is cancelled. Skipping auto-publish.');
    return;
  }

  if (report.status === 'published') {
    console.log('⏭️ Report is already published. Skipping auto-publish.');
    return;
  }

  // 4. Get post text
  const postText = report.post_text;
  if (!postText) {
    const errMsg = 'Report has no post_text. Cannot publish an empty post.';
    console.error('❌', errMsg);
    db.prepare('UPDATE dominical_reports SET status = ?, error_log = ? WHERE id = ?').run('failed', errMsg, report.id);
    try {
      await sendErrorNotification(errMsg);
    } catch (emailErr) {
      console.error('⚠️ Failed to send error notification:', emailErr);
    }
    return;
  }

  const imageUrl = report.image_url || undefined;

  // Log whether we're publishing edited or auto-generated version
  if (report.last_edited_at && report.last_edited_at > report.created_at) {
    console.log('📝 Publishing edited version (last_edited_at > created_at)');
  } else {
    console.log('🤖 Publishing auto-generated version (no edits)');
  }

  // 5. Attempt to publish
  try {
    const linkedinPostId = await publishPost(postText, imageUrl);

    // Success: update report
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE dominical_reports SET status = ?, published_at = ?, linkedin_post_id = ? WHERE id = ?'
    ).run('published', now, linkedinPostId, report.id);

    console.log(`✅ Published to LinkedIn! Post ID: ${linkedinPostId}`);
  } catch (error) {
    // Failure: mark as failed, store error, notify
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Auto-publish failed:', errorMessage);

    db.prepare(
      'UPDATE dominical_reports SET status = ?, error_log = ? WHERE id = ?'
    ).run('failed', errorMessage, report.id);

    try {
      await sendErrorNotification(errorMessage);
    } catch (emailErr) {
      console.error('⚠️ Failed to send error notification email:', emailErr);
    }
  }
}
