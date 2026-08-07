import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlatformPublishStatus from '../PlatformPublishStatus';

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

// Mock apiRequest
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Helper to create a test QueryClient with controlled data
function createTestQueryClient(options?: {
  statuses?: Array<{
    reportId: number;
    platform: 'linkedin' | 'instagram' | 'facebook';
    status: 'not_published' | 'publishing' | 'published' | 'failed';
    platformPostId: string | null;
    errorMessage: string | null;
    publishedAt: string | null;
  }>;
  credentials?: {
    meta_app_id: boolean;
    meta_app_secret: boolean;
    instagram_business_account_id: boolean;
    instagram_access_token: boolean;
    facebook_page_id: boolean;
    facebook_page_access_token: boolean;
  };
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const statuses = options?.statuses ?? [];
  const credentials = options?.credentials ?? {
    meta_app_id: true,
    meta_app_secret: true,
    instagram_business_account_id: true,
    instagram_access_token: true,
    facebook_page_id: true,
    facebook_page_access_token: true,
  };

  // Pre-populate query cache
  queryClient.setQueryData(['/api/admin/dominical/1/publish-status'], statuses);
  queryClient.setQueryData(['/api/admin/settings/meta'], credentials);

  return queryClient;
}

function renderWithClient(
  queryClient: QueryClient,
  reportId: number = 1
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformPublishStatus reportId={reportId} />
    </QueryClientProvider>
  );
}

describe('PlatformPublishStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('not_published state', () => {
    it('renders "Not Published" badge and "Publish" button for platforms', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'linkedin', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'facebook', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
      });

      renderWithClient(queryClient);

      // Should show "Not Published" badges
      const badges = screen.getAllByText('Not Published');
      expect(badges).toHaveLength(3);

      // Should show "Publish" buttons
      const publishButtons = screen.getAllByRole('button', { name: /Publish/i });
      // 3 individual + 1 "Publish to All"
      expect(publishButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('shows enabled Publish buttons when credentials are configured', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
        credentials: {
          meta_app_id: true,
          meta_app_secret: true,
          instagram_business_account_id: true,
          instagram_access_token: true,
          facebook_page_id: true,
          facebook_page_access_token: true,
        },
      });

      renderWithClient(queryClient);

      // Instagram Publish button should be enabled
      const publishButtons = screen.getAllByRole('button', { name: /^Publish$/i });
      const instagramPublishBtn = publishButtons.find(btn => !btn.hasAttribute('disabled'));
      expect(instagramPublishBtn).toBeDefined();
    });
  });

  describe('publishing state', () => {
    it('renders "Publishing..." badge and disables publish button', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'linkedin', status: 'publishing', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'facebook', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
      });

      renderWithClient(queryClient);

      // Should show "Publishing..." badge for linkedin
      const publishingBadges = screen.getAllByText('Publishing...');
      expect(publishingBadges.length).toBeGreaterThanOrEqual(1);

      // The LinkedIn row has a disabled "Publishing..." button
      const publishingButtons = screen.getAllByRole('button', { name: /Publishing.../i });
      expect(publishingButtons.length).toBeGreaterThanOrEqual(1);
      publishingButtons.forEach(btn => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('published state', () => {
    it('renders "Published" badge and "Done" indicator with timestamp', () => {
      const publishedAt = '2025-01-15T10:30:00Z';
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'linkedin', status: 'published', platformPostId: 'urn:li:share:123', errorMessage: null, publishedAt },
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'facebook', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
      });

      renderWithClient(queryClient);

      // Should show "Published" badge
      expect(screen.getByText('Published')).toBeInTheDocument();

      // Should show "Done" indicator
      expect(screen.getByText('Done')).toBeInTheDocument();

      // Should show timestamp
      const formattedDate = new Date(publishedAt).toLocaleString();
      expect(screen.getByText(`Published ${formattedDate}`)).toBeInTheDocument();
    });

    it('renders platform post ID when available', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'linkedin', status: 'published', platformPostId: 'urn:li:share:123456', errorMessage: null, publishedAt: '2025-01-15T10:30:00Z' },
        ],
      });

      renderWithClient(queryClient);

      expect(screen.getByText('ID: urn:li:share:123456')).toBeInTheDocument();
    });
  });

  describe('failed state', () => {
    it('renders "Failed" badge, error message, and "Retry" button', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'instagram', status: 'failed', platformPostId: null, errorMessage: 'Token expired', publishedAt: null },
          { reportId: 1, platform: 'linkedin', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'facebook', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
      });

      renderWithClient(queryClient);

      // Should show "Failed" badge
      expect(screen.getByText('Failed')).toBeInTheDocument();

      // Should show error message
      expect(screen.getByText('Token expired')).toBeInTheDocument();

      // Should show "Retry" button
      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toBeDisabled();
    });
  });

  describe('credentials not configured', () => {
    it('disables Publish button when platform credentials are missing', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'facebook', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'linkedin', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
        credentials: {
          meta_app_id: false,
          meta_app_secret: false,
          instagram_business_account_id: false,
          instagram_access_token: false,
          facebook_page_id: false,
          facebook_page_access_token: false,
        },
      });

      renderWithClient(queryClient);

      // All publish buttons for instagram and facebook should be disabled (no credentials)
      const publishButtons = screen.getAllByRole('button', { name: /^Publish$/i });
      // Instagram and Facebook buttons should be disabled
      const disabledButtons = publishButtons.filter(btn => btn.hasAttribute('disabled'));
      expect(disabledButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('shows tooltip-like title when credentials are not configured', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
        credentials: {
          meta_app_id: false,
          meta_app_secret: false,
          instagram_business_account_id: false,
          instagram_access_token: false,
          facebook_page_id: false,
          facebook_page_access_token: false,
        },
      });

      renderWithClient(queryClient);

      // The disabled button should have a title attribute with credential hint
      const publishButtons = screen.getAllByRole('button', { name: /^Publish$/i });
      const disabledBtn = publishButtons.find(btn => btn.hasAttribute('disabled'));
      expect(disabledBtn).toBeDefined();
      expect(disabledBtn!.getAttribute('title')).toContain('Credentials not configured');
    });
  });

  describe('Publish to All button', () => {
    it('renders "Publish to All" button when eligible platforms exist', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'linkedin', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'instagram', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
          { reportId: 1, platform: 'facebook', status: 'not_published', platformPostId: null, errorMessage: null, publishedAt: null },
        ],
      });

      renderWithClient(queryClient);

      const publishAllBtn = screen.getByRole('button', { name: /Publish to All/i });
      expect(publishAllBtn).toBeInTheDocument();
      expect(publishAllBtn).not.toBeDisabled();
    });

    it('disables "Publish to All" when no eligible platforms exist', () => {
      const queryClient = createTestQueryClient({
        statuses: [
          { reportId: 1, platform: 'linkedin', status: 'published', platformPostId: 'id1', errorMessage: null, publishedAt: '2025-01-01T00:00:00Z' },
          { reportId: 1, platform: 'instagram', status: 'published', platformPostId: 'id2', errorMessage: null, publishedAt: '2025-01-01T00:00:00Z' },
          { reportId: 1, platform: 'facebook', status: 'published', platformPostId: 'id3', errorMessage: null, publishedAt: '2025-01-01T00:00:00Z' },
        ],
      });

      renderWithClient(queryClient);

      const publishAllBtn = screen.getByRole('button', { name: /Publish to All/i });
      expect(publishAllBtn).toBeDisabled();
    });
  });
});
