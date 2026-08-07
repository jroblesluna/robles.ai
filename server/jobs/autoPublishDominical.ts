import nodemailer from 'nodemailer';
import db from '../db.js';
import { PublishingEngine } from '../services/platforms/publishingEngine.js';
import { LinkedInAdapter } from '../services/platforms/linkedinAdapter.js';
import { InstagramAdapter } from '../services/platforms/instagramAdapter.js';
import { FacebookAdapter } from '../services/platforms/facebookAdapter.js';
import type { PlatformName, PlatformAdapter, PublishResult } from '../services/platforms/types.js';

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
 * Sends a notification email to the admin with per-platform publishing results.
 */
async function sendResultNotification(
  results: Map<PlatformName, PublishResult>,
  reportId: number,
  allFailed: boolean
): Promise<void> {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('⚠️ Email credentials not configured. Cannot send notification.');
    return;
  }

  const notificationRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('notification_email') as
    | { value: string | null }
    | undefined;

  const recipient = notificationRow?.value || process.env.EMAIL_TO;

  if (!recipient) {
    console.warn('⚠️ No notification email configured. Cannot send notification.');
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

  // Build per-platform result rows
  const platformEntries = Array.from(results.entries());
  const platformRows = platformEntries
    .map(([platform, result]) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'Publicado' : 'Fallido';
      const detail = result.success
        ? `Post ID: ${result.platformPostId || 'N/A'}`
        : `Error: ${result.error || 'Desconocido'}`;
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;">${icon} ${platform}</td>
        <td style="padding:8px;border:1px solid #ddd;">${status}</td>
        <td style="padding:8px;border:1px solid #ddd;">${detail}</td>
      </tr>`;
    })
    .join('');

  const subject = allFailed
    ? '❌ Error en la publicación automática del Dominical IA'
    : '📤 Resultados de la publicación automática del Dominical IA';

  const headerMsg = allFailed
    ? '<p>La publicación automática ha fallado en todas las plataformas:</p>'
    : '<p>La publicación automática ha finalizado. Aquí están los resultados por plataforma:</p>';

  await transporter.sendMail({
    from: emailUser,
    to: recipient,
    subject,
    html: `
      <h2>${allFailed ? '❌' : '📤'} Auto-Publish — Reporte #${reportId}</h2>
      ${headerMsg}
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <thead>
          <tr style="background:#f4f4f4;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Plataforma</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Estado</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${platformRows}
        </tbody>
      </table>
      <p>Puedes revisar el reporte en el panel de administración:</p>
      <p>
        <a href="${baseUrl}/admin/dominical" style="display:inline-block;padding:12px 24px;background:${allFailed ? '#dc2626' : '#2563eb'};color:white;text-decoration:none;border-radius:6px;">
          Ir al panel de administración
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Este email fue enviado automáticamente por El Dominical IA.</p>
    `,
  });

  console.log('✅ Notification email sent to', recipient);
}

/**
 * Sends an error notification email to the admin when auto-publish fails before reaching platform publishing.
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
 * 4. Initialize platform statuses if not yet done
 * 5. Publish to all eligible platforms via PublishingEngine
 * 6. Determine overall result:
 *    - ALL succeed: mark report as published
 *    - SOME fail: mark report as published (partial success), send notification with details
 *    - ALL fail: mark report as failed, send notification
 * 7. Maintain backward compatibility: update linkedin_post_id if LinkedIn succeeds
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

  // Log whether we're publishing edited or auto-generated version
  if (report.last_edited_at && report.last_edited_at > report.created_at) {
    console.log('📝 Publishing edited version (last_edited_at > created_at)');
  } else {
    console.log('🤖 Publishing auto-generated version (no edits)');
  }

  // 5. Set up multi-platform publishing engine
  const platformAdapters = new Map<PlatformName, PlatformAdapter>([
    ['linkedin', new LinkedInAdapter()],
    ['instagram', new InstagramAdapter()],
    ['facebook', new FacebookAdapter()],
  ]);

  const publishingEngine = new PublishingEngine(db, platformAdapters);

  // Initialize platform statuses if not yet done for this report
  const existingStatuses = publishingEngine.getStatuses(report.id);
  if (existingStatuses.length === 0) {
    publishingEngine.initializeStatuses(report.id);
  }

  // 6. Publish to all eligible platforms
  try {
    const results = await publishingEngine.publishToAll(report.id);

    if (results.size === 0) {
      console.log('ℹ️ No eligible platforms to publish to (no credentials or already published).');
      return;
    }

    // Determine overall outcome
    const allSucceeded = Array.from(results.values()).every(r => r.success);
    const allFailed = Array.from(results.values()).every(r => !r.success);

    // Log per-platform results
    for (const [platform, result] of Array.from(results.entries())) {
      if (result.success) {
        console.log(`✅ Published to ${platform}! Post ID: ${result.platformPostId || 'N/A'}`);
      } else {
        console.error(`❌ Failed to publish to ${platform}: ${result.error}`);
      }
    }

    // Backward compatibility: update linkedin_post_id if LinkedIn succeeded
    const linkedinResult = results.get('linkedin');
    if (linkedinResult?.success && linkedinResult.platformPostId) {
      db.prepare(
        'UPDATE dominical_reports SET linkedin_post_id = ? WHERE id = ?'
      ).run(linkedinResult.platformPostId, report.id);
    }

    // Update report status based on overall outcome
    const now = new Date().toISOString();
    if (allFailed) {
      // All platforms failed
      const errorSummary = Array.from(results.entries())
        .map(([platform, result]) => `${platform}: ${result.error}`)
        .join('; ');
      db.prepare(
        'UPDATE dominical_reports SET status = ?, error_log = ? WHERE id = ?'
      ).run('failed', errorSummary, report.id);
    } else {
      // At least one platform succeeded — mark as published
      db.prepare(
        'UPDATE dominical_reports SET status = ?, published_at = ? WHERE id = ?'
      ).run('published', now, report.id);
    }

    // Send notification email if there are any failures (partial or total)
    if (!allSucceeded) {
      try {
        await sendResultNotification(results, report.id, allFailed);
      } catch (emailErr) {
        console.error('⚠️ Failed to send notification email:', emailErr);
      }
    }
  } catch (error) {
    // Unexpected error in the publishing engine itself
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Auto-publish failed unexpectedly:', errorMessage);

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
