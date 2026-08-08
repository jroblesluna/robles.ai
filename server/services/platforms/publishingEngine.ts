// server/services/platforms/publishingEngine.ts

import type Database from 'better-sqlite3';
import type { PlatformName, PlatformStatus, PlatformAdapter, PublishRequest, PublishResult } from './types.js';
import { formatForPlatform } from './contentFormatter.js';

export interface PlatformPublishStatus {
  reportId: number;
  platform: PlatformName;
  status: PlatformStatus;
  platformPostId: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
}

const ALL_PLATFORMS: PlatformName[] = ['linkedin', 'instagram', 'facebook'];

/** Delay helper — resolves after the given number of milliseconds */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class PublishingEngine {
  private db: Database.Database;
  private adapters: Map<PlatformName, PlatformAdapter>;
  private baseUrl: string;

  constructor(
    db: Database.Database,
    adapters?: Map<PlatformName, PlatformAdapter>,
    baseUrl?: string
  ) {
    this.db = db;
    this.adapters = adapters ?? new Map();
    this.baseUrl = baseUrl ?? process.env.BASE_URL ?? 'https://robles.ai';
  }

  /**
   * Initialize platform publish statuses for a new report.
   * Inserts one row per platform with status 'not_published'.
   */
  initializeStatuses(reportId: number): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO platform_publish_status
        (report_id, platform, status, platform_post_id, error_message, published_at, created_at, updated_at)
      VALUES (?, ?, 'not_published', NULL, NULL, NULL, ?, NULL)
    `);

    for (const platform of ALL_PLATFORMS) {
      stmt.run(reportId, platform, now);
    }
  }

  /**
   * Get current status for all platforms for a report.
   */
  getStatuses(reportId: number): PlatformPublishStatus[] {
    const rows = this.db.prepare(`
      SELECT report_id, platform, status, platform_post_id, error_message, published_at
      FROM platform_publish_status
      WHERE report_id = ?
    `).all(reportId) as Array<{
      report_id: number;
      platform: PlatformName;
      status: PlatformStatus;
      platform_post_id: string | null;
      error_message: string | null;
      published_at: string | null;
    }>;

    return rows.map(row => ({
      reportId: row.report_id,
      platform: row.platform,
      status: row.status,
      platformPostId: row.platform_post_id,
      errorMessage: row.error_message,
      publishedAt: row.published_at,
    }));
  }

  /**
   * Publish to a single platform.
   *
   * Flow:
   * 1. Set status to 'publishing'
   * 2. Build PublishRequest from the dominical_reports + carousel_slides data
   * 3. Call the adapter's publish() method
   * 4. On success: update status to 'published', store platformPostId and publishedAt
   * 5. On failure: update status to 'failed', store error message
   */
  async publishToPlatform(reportId: number, platform: PlatformName): Promise<PublishResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      const error = `No adapter registered for platform: ${platform}`;
      this.updateStatus(reportId, platform, 'failed', null, error);
      return { success: false, error };
    }

    if (!adapter.hasCredentials()) {
      const error = `No credentials configured for ${platform}. Please configure them in Settings.`;
      this.updateStatus(reportId, platform, 'failed', null, error);
      return { success: false, error };
    }

    // Set status to 'publishing'
    this.updateStatus(reportId, platform, 'publishing', null, null);

    try {
      // Build the raw PublishRequest from the report data
      const rawRequest = this.buildPublishRequest(reportId);

      // Determine if we should skip the content formatter
      // Skip when: platform-specific pre-formatted text exists, or for Facebook (post_text is already well-formatted)
      const useRawText = (platform === 'instagram' && rawRequest.postTextInstagram)
        || platform === 'facebook';

      let finalText: string;
      if (platform === 'instagram' && rawRequest.postTextInstagram) {
        // Instagram has its own pre-formatted caption
        finalText = rawRequest.postTextInstagram;
      } else if (platform === 'facebook') {
        // Facebook: use post_text as-is (well under 63K char limit, already formatted with links)
        finalText = rawRequest.text;
      } else {
        // LinkedIn and others: format content (truncates text, preserves hashtags)
        const formatted = formatForPlatform(
          platform,
          rawRequest.text,
          rawRequest.slideImageUrls,
          rawRequest.pdfBuffer,
          rawRequest.coverImageUrl
        );
        finalText = formatted.text;
      }

      // Build the final request
      const request: PublishRequest = {
        ...rawRequest,
        text: finalText,
      };

      // Call the adapter
      const result = await adapter.publish(request);

      if (result.success) {
        const now = new Date().toISOString();
        this.db.prepare(`
          UPDATE platform_publish_status
          SET status = 'published',
              platform_post_id = ?,
              error_message = NULL,
              published_at = ?,
              updated_at = ?
          WHERE report_id = ? AND platform = ?
        `).run(result.platformPostId ?? null, now, now, reportId, platform);
      } else {
        const errorMsg = result.error ?? 'Unknown publishing error';
        this.updateStatus(reportId, platform, 'failed', null, errorMsg);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.updateStatus(reportId, platform, 'failed', null, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Publish to all eligible platforms.
   *
   * Eligible = adapter.hasCredentials() === true AND status === 'not_published'
   * Publishes sequentially with a 5-second delay between attempts.
   * Each platform is wrapped in try/catch for failure isolation.
   */
  async publishToAll(reportId: number): Promise<Map<PlatformName, PublishResult>> {
    const results = new Map<PlatformName, PublishResult>();
    const statuses = this.getStatuses(reportId);

    // Filter to eligible platforms
    const eligible: PlatformName[] = [];
    for (const status of statuses) {
      if (status.status !== 'not_published') continue;
      const adapter = this.adapters.get(status.platform);
      if (adapter && adapter.hasCredentials()) {
        eligible.push(status.platform);
      }
    }

    for (let i = 0; i < eligible.length; i++) {
      const platform = eligible[i];

      // 5-second delay between attempts (not before the first one)
      if (i > 0) {
        await delay(5000);
      }

      try {
        const result = await this.publishToPlatform(reportId, platform);
        results.set(platform, result);
      } catch (err) {
        // Failure isolation: catch unexpected errors and continue
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.set(platform, { success: false, error: errorMessage });
      }
    }

    return results;
  }

  /**
   * Build a PublishRequest by fetching report data and slide image URLs from the database.
   */
  private buildPublishRequest(reportId: number): PublishRequest {
    // Fetch report data
    const report = this.db.prepare(
      'SELECT id, post_text, post_text_instagram, image_url FROM dominical_reports WHERE id = ?'
    ).get(reportId) as { id: number; post_text: string | null; post_text_instagram: string | null; image_url: string | null } | undefined;

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (!report.post_text) {
      throw new Error(`Report #${reportId} has no post_text. Cannot publish an empty post.`);
    }

    // Fetch generated carousel slides (ordered by position)
    const slides = this.db.prepare(
      `SELECT position FROM carousel_slides
       WHERE report_id = ? AND status = 'generated'
       ORDER BY position ASC`
    ).all(reportId) as Array<{ position: number }>;

    // Construct publicly accessible URLs for each slide
    const slideImageUrls = slides.map(
      slide => `${this.baseUrl}/api/public/slides/${reportId}/${slide.position}.png`
    );

    // Cover image URL (fallback)
    const coverImageUrl = report.image_url
      ? (report.image_url.startsWith('http') ? report.image_url : `${this.baseUrl}${report.image_url}`)
      : undefined;

    return {
      reportId,
      text: report.post_text,
      postTextInstagram: report.post_text_instagram,
      slideImageUrls,
      coverImageUrl,
    };
  }

  /**
   * Helper to update a platform's status in the database.
   */
  private updateStatus(
    reportId: number,
    platform: PlatformName,
    status: PlatformStatus,
    platformPostId: string | null,
    errorMessage: string | null
  ): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE platform_publish_status
      SET status = ?, platform_post_id = ?, error_message = ?, updated_at = ?
      WHERE report_id = ? AND platform = ?
    `).run(status, platformPostId, errorMessage, now, reportId, platform);
  }
}
