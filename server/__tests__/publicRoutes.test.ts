import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock DB
const mockGet = vi.fn();
const mockPrepare = vi.fn(() => ({
  get: mockGet,
}));

vi.mock('../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    createReadStream: vi.fn().mockReturnValue({
      pipe: vi.fn((res: any) => {
        res.end(Buffer.from('fake-png-data'));
      }),
    }),
  },
}));

let app: express.Express;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGet.mockReturnValue(undefined);

  app = express();
  app.use(express.json());

  const { default: publicRouter } = await import('../publicRoutes.js');
  app.use('/api/public', publicRouter);
});

describe('Public Slides Endpoint', () => {
  describe('GET /api/public/slides/:reportId/:position', () => {
    it('returns 400 for invalid report ID', async () => {
      const res = await request(app)
        .get('/api/public/slides/abc/1')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid report ID');
    });

    it('returns 400 for report ID less than 1', async () => {
      const res = await request(app)
        .get('/api/public/slides/0/1')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid report ID');
    });

    it('returns 400 for invalid slide position', async () => {
      const res = await request(app)
        .get('/api/public/slides/1/abc')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid slide position');
    });

    it('returns 400 for position less than 1', async () => {
      const res = await request(app)
        .get('/api/public/slides/1/0')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid slide position');
    });

    it('returns 404 when slide does not exist in DB', async () => {
      mockGet.mockReturnValueOnce(undefined);

      const res = await request(app)
        .get('/api/public/slides/999/1')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Slide not found');
    });

    it('returns 404 when slide is not generated yet', async () => {
      mockGet.mockReturnValueOnce({
        composite_image_path: null,
        status: 'pending',
      });

      const res = await request(app)
        .get('/api/public/slides/1/1')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Slide image not available');
    });

    it('returns 404 when slide file does not exist on disk', async () => {
      mockGet.mockReturnValueOnce({
        composite_image_path: '/path/to/slide.png',
        status: 'generated',
      });

      const fs = await import('fs');
      vi.mocked(fs.default.existsSync).mockReturnValueOnce(false);

      const res = await request(app)
        .get('/api/public/slides/1/1')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Slide image file not found on disk');
    });

    it('serves PNG with correct headers for valid generated slide', async () => {
      mockGet.mockReturnValueOnce({
        composite_image_path: '/path/to/slide.png',
        status: 'generated',
      });

      const res = await request(app)
        .get('/api/public/slides/1/2')
        .send();

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
      expect(res.headers['cache-control']).toBe('public, max-age=86400');
      expect(res.headers['content-disposition']).toContain('slide-2.png');
    });

    it('does NOT require authentication', async () => {
      mockGet.mockReturnValueOnce({
        composite_image_path: '/path/to/slide.png',
        status: 'generated',
      });

      // No auth headers/cookies — should still work
      const res = await request(app)
        .get('/api/public/slides/1/1')
        .send();

      expect(res.status).toBe(200);
    });

    it('queries the correct table with report ID and position', async () => {
      mockGet.mockReturnValueOnce({
        composite_image_path: '/path/to/slide.png',
        status: 'generated',
      });

      await request(app)
        .get('/api/public/slides/42/3')
        .send();

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT composite_image_path, status FROM carousel_slides WHERE report_id = ? AND position = ?'
      );
      expect(mockGet).toHaveBeenCalledWith(42, 3);
    });
  });
});
