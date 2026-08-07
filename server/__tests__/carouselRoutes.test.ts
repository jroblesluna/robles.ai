import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';

// Mock auth middleware to bypass authentication
vi.mock('../auth.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => {
    _req.adminUser = { userId: 1, email: 'test@example.com' };
    next();
  },
  generateToken: vi.fn().mockReturnValue('fake-token'),
  verifyToken: vi.fn().mockReturnValue({ userId: 1, email: 'test@example.com' }),
}));

// Mock DB
const mockGet = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({
  get: mockGet,
  all: mockAll,
  run: mockRun,
}));

vi.mock('../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

// Mock carousel services
const mockGenerateCarousel = vi.fn();
const mockRegenerateSlide = vi.fn();
vi.mock('../services/carouselGenerator.js', () => ({
  generateCarousel: (...args: any[]) => mockGenerateCarousel(...args),
  regenerateSlide: (...args: any[]) => mockRegenerateSlide(...args),
}));

const mockExportCarouselPdf = vi.fn();
vi.mock('../services/pdfExporter.js', () => ({
  exportCarouselPdf: (...args: any[]) => mockExportCarouselPdf(...args),
}));

const mockComposeArticleSlide = vi.fn();
vi.mock('../services/slideCompositor.js', () => ({
  composeArticleSlide: (...args: any[]) => mockComposeArticleSlide(...args),
}));

// Mock LinkedIn service
vi.mock('../services/linkedin.js', () => ({
  publishPost: vi.fn().mockResolvedValue('post-id'),
}));

// Mock generateDominical
vi.mock('../jobs/generateDominical.js', () => ({
  generateDominicalReport: vi.fn().mockResolvedValue({ reportId: 1 }),
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    createReadStream: vi.fn().mockReturnValue({
      pipe: vi.fn((res: any) => {
        res.end(Buffer.from('fake-png-data'));
      }),
    }),
  },
}));

// Build the app after mocking
let app: express.Express;

beforeEach(async () => {
  vi.clearAllMocks();

  // Reset mock defaults
  mockGet.mockReturnValue(undefined);
  mockAll.mockReturnValue([]);
  mockRun.mockReturnValue({ changes: 1 });

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Dynamic import to get the mocked version
  const { default: adminRouter } = await import('../adminRoutes.js');
  app.use('/api/admin', adminRouter);
});

describe('Carousel API Routes', () => {
  describe('POST /api/admin/dominical/:id/generate-carousel', () => {
    it('returns 409 if generation is already in progress', async () => {
      // Mock report exists
      mockGet.mockReturnValueOnce({ id: 1 });

      // Mock concurrency check: slides already generating
      mockGet.mockReturnValueOnce({ count: 1 });

      const res = await request(app)
        .post('/api/admin/dominical/1/generate-carousel')
        .send();

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Carousel generation already in progress for this report');
    });

    it('returns 404 if report does not exist', async () => {
      // Mock report not found
      mockGet.mockReturnValueOnce(undefined);

      const res = await request(app)
        .post('/api/admin/dominical/999/generate-carousel')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Report not found');
    });

    it('returns 200 with generating status on success (fire-and-forget)', async () => {
      // Mock report exists
      mockGet.mockReturnValueOnce({ id: 1 });

      // Mock concurrency check: no slides generating
      mockGet.mockReturnValueOnce({ count: 0 });

      mockGenerateCarousel.mockResolvedValueOnce({ reportId: 1, slides: [], errors: [] });

      const res = await request(app)
        .post('/api/admin/dominical/1/generate-carousel')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('generating');
      expect(res.body.reportId).toBe(1);
    });
  });

  describe('GET /api/admin/dominical/:id/carousel/pdf', () => {
    it('returns correct Content-Type application/pdf', async () => {
      // Mock report exists
      mockGet.mockReturnValueOnce({ id: 1 });

      // Mock slides query returns generated slides
      mockAll.mockReturnValueOnce([
        { composite_image_path: '/path/to/slide1.png' },
        { composite_image_path: '/path/to/slide2.png' },
      ]);

      // Mock PDF export returns a buffer
      const fakePdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');
      mockExportCarouselPdf.mockResolvedValueOnce({
        pdfBuffer: fakePdfBuffer,
        pageCount: 2,
        warnings: [],
      });

      const res = await request(app)
        .get('/api/admin/dominical/1/carousel/pdf')
        .send();

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('carousel-report-1.pdf');
    });

    it('returns 400 when no valid slides are available', async () => {
      // Mock report exists
      mockGet.mockReturnValueOnce({ id: 1 });

      // Mock no slides
      mockAll.mockReturnValueOnce([]);

      const res = await request(app)
        .get('/api/admin/dominical/1/carousel/pdf')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No valid slides available for PDF export');
    });
  });

  describe('GET /api/admin/dominical/:id/carousel/slides/:position/image', () => {
    it('returns 404 for invalid position (slide not found)', async () => {
      // Mock slide not found in DB
      mockGet.mockReturnValueOnce(undefined);

      const res = await request(app)
        .get('/api/admin/dominical/1/carousel/slides/99/image')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Slide not found');
    });

    it('returns 400 for invalid position parameter', async () => {
      const res = await request(app)
        .get('/api/admin/dominical/1/carousel/slides/-1/image')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid slide position');
    });

    it('returns 400 when slide is not generated yet', async () => {
      // Mock slide exists but status is pending
      mockGet.mockReturnValueOnce({
        composite_image_path: null,
        status: 'pending',
      });

      const res = await request(app)
        .get('/api/admin/dominical/1/carousel/slides/1/image')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Slide image not available');
    });

    it('returns image/png content-type for valid generated slide', async () => {
      // Mock slide exists and is generated
      mockGet.mockReturnValueOnce({
        composite_image_path: '/path/to/slide.png',
        status: 'generated',
      });

      const res = await request(app)
        .get('/api/admin/dominical/1/carousel/slides/1/image')
        .send();

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
    });
  });

  describe('PUT /api/admin/dominical/:id/carousel/slides/:position/text', () => {
    it('re-composes slide with updated text', async () => {
      // Mock existing slide in DB
      mockGet.mockReturnValueOnce({
        id: 1,
        report_id: 1,
        position: 2,
        slide_type: 'article',
        article_slug: 'test-article',
        title_text: 'Original Title',
        engagement_phrase: 'Original Phrase',
        background_image_path: '/path/to/bg.png',
        composite_image_path: '/path/to/composite.png',
        status: 'generated',
        error_message: null,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: null,
      });

      mockComposeArticleSlide.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .put('/api/admin/dominical/1/carousel/slides/2/text')
        .send({
          titleText: 'Updated Title',
          engagementPhrase: 'Updated engagement phrase',
        });

      expect(res.status).toBe(200);
      expect(res.body.titleText).toBe('Updated Title');
      expect(res.body.engagementPhrase).toBe('Updated engagement phrase');
      expect(res.body.status).toBe('generated');

      // Verify composeArticleSlide was called with updated text
      expect(mockComposeArticleSlide).toHaveBeenCalledOnce();
      const callArgs = mockComposeArticleSlide.mock.calls[0][0];
      expect(callArgs.titleText).toBe('Updated Title');
      expect(callArgs.engagementPhrase).toBe('Updated engagement phrase');
      expect(callArgs.backgroundImagePath).toBe('/path/to/bg.png');
    });

    it('returns 404 when slide does not exist', async () => {
      // Mock slide not found
      mockGet.mockReturnValueOnce(undefined);

      const res = await request(app)
        .put('/api/admin/dominical/1/carousel/slides/99/text')
        .send({ titleText: 'New Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Slide not found');
    });

    it('returns 400 when no text fields are provided', async () => {
      const res = await request(app)
        .put('/api/admin/dominical/1/carousel/slides/1/text')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('At least one of titleText or engagementPhrase');
    });

    it('returns 400 when background image is not available', async () => {
      // Mock existing slide but with missing background
      mockGet.mockReturnValueOnce({
        id: 1,
        report_id: 1,
        position: 2,
        slide_type: 'article',
        article_slug: 'test-article',
        title_text: 'Original Title',
        engagement_phrase: 'Original Phrase',
        background_image_path: null,
        composite_image_path: '/path/to/composite.png',
        status: 'generated',
        error_message: null,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: null,
      });

      const res = await request(app)
        .put('/api/admin/dominical/1/carousel/slides/2/text')
        .send({ titleText: 'Updated Title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Background image not available for re-composition');
    });
  });
});
