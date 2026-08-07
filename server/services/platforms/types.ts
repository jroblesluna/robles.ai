// server/services/platforms/types.ts

export type PlatformName = 'linkedin' | 'instagram' | 'facebook';

export type PlatformStatus = 'not_published' | 'publishing' | 'published' | 'failed';

export interface PublishRequest {
  reportId: number;
  text: string;
  slideImageUrls: string[];  // Publicly accessible URLs for each slide PNG
  coverImageUrl?: string;    // Fallback cover image
  pdfBuffer?: Buffer;        // Pre-generated PDF (for LinkedIn)
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;   // Platform-specific post ID/URN
  error?: string;
}

export interface PlatformAdapter {
  readonly platform: PlatformName;

  /** Check if this platform has valid credentials configured */
  hasCredentials(): boolean;

  /** Publish content to the platform */
  publish(request: PublishRequest): Promise<PublishResult>;

  /** Validate stored credentials (test API call) */
  validateCredentials(): Promise<{ valid: boolean; error?: string }>;
}
