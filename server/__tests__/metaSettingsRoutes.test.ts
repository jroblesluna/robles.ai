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
const mockTransaction = vi.fn((fn: Function) => fn);
const mockPrepare = vi.fn(() => ({
  get: mockGet,
  all: mockAll,
  run: mockRun,
}));

vi.mock('../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
    transaction: (fn: Function) => mockTransaction(fn),
  },
}));

// Mock LinkedIn service
vi.mock('../services/linkedin.js', () => ({
  publishPost: vi.fn().mockResolvedValue('post-id'),
  publishPostWithDocument: vi.fn().mockResolvedValue('post-id'),
}));

// Mock generateDominical
vi.mock('../jobs/generateDominical.js', () => ({
  generateDominicalReport: vi.fn().mockResolvedValue({ reportId: 1 }),
}));

// Mock carousel/pdf services
vi.mock('../services/carouselGenerator.js', () => ({
  generateCarousel: vi.fn(),
  regenerateSlide: vi.fn(),
}));
vi.mock('../services/pdfExporter.js', () => ({
  exportCarouselPdf: vi.fn(),
}));
vi.mock('../services/slideCompositor.js', () => ({
  composeArticleSlide: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    createReadStream: vi.fn(),
  },
}));

// Mock platform adapters
const mockInstagramValidate = vi.fn();
const mockFacebookValidate = vi.fn();

vi.mock('../services/platforms/instagramAdapter.js', () => ({
  InstagramAdapter: class {
    readonly platform = 'instagram';
    hasCredentials() { return true; }
    validateCredentials() { return mockInstagramValidate(); }
    async publish() { return { success: true, platformPostId: 'ig-123' }; }
  },
}));

vi.mock('../services/platforms/facebookAdapter.js', () => ({
  FacebookAdapter: class {
    readonly platform = 'facebook';
    hasCredentials() { return true; }
    validateCredentials() { return mockFacebookValidate(); }
    async publish() { return { success: true, platformPostId: 'fb-123' }; }
  },
}));

vi.mock('../services/platforms/linkedinAdapter.js', () => ({
  LinkedInAdapter: class {
    readonly platform = 'linkedin';
    hasCredentials() { return true; }
    validateCredentials() { return Promise.resolve({ valid: true }); }
    async publish() { return { success: true, platformPostId: 'li-123' }; }
  },
}));

vi.mock('../services/platforms/publishingEngine.js', () => ({
  PublishingEngine: class {
    constructor() {}
    initializeStatuses() {}
    getStatuses() { return []; }
    publishToPlatform() { return Promise.resolve({ success: true }); }
    publishToAll() { return Promise.resolve(new Map()); }
  },
}));

let app: express.Express;

beforeEach(async () => {
  vi.clearAllMocks();

  mockGet.mockReturnValue(undefined);
  mockAll.mockReturnValue([]);
  mockRun.mockReturnValue({ changes: 1 });
  // Make transaction return a function that calls the inner fn
  mockTransaction.mockImplementation((fn: Function) => (...args: any[]) => fn(...args));

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: adminRouter } = await import('../adminRoutes.js');
  app.use('/api/admin', adminRouter);
});

describe('Meta Credential Settings Endpoints', () => {
  describe('POST /api/admin/settings/meta', () => {
    it('saves provided credentials and returns success', async () => {
      const res = await request(app)
        .post('/api/admin/settings/meta')
        .send({
          meta_app_id: '123456',
          meta_app_secret: 'secret-value',
          instagram_business_account_id: 'ig-biz-123',
          instagram_access_token: 'ig-token-abc',
          facebook_page_id: 'fb-page-456',
          facebook_page_access_token: 'fb-token-xyz',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      // Verify db.prepare was called for upsert operations
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('does not overwrite values with empty strings', async () => {
      const res = await request(app)
        .post('/api/admin/settings/meta')
        .send({
          meta_app_id: '123456',
          meta_app_secret: '', // empty - should not overwrite
          instagram_business_account_id: '   ', // whitespace only - should not overwrite
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('ignores null and undefined values', async () => {
      const res = await request(app)
        .post('/api/admin/settings/meta')
        .send({
          meta_app_id: null,
          facebook_page_id: 'fb-page-789',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });
  });

  describe('GET /api/admin/settings/meta', () => {
    it('returns boolean status for each credential key', async () => {
      // Mock: meta_app_id is configured, others are not
      mockGet.mockImplementation((..._args: any[]) => {
        // The first call to prepare returns the statement, then .get() is called
        return undefined;
      });

      // Need to mock per-call since each key calls prepare().get()
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        // Simulate some keys configured, some not
        if (callCount === 1) return { value: '123456' }; // meta_app_id
        if (callCount === 2) return { value: 'secret' }; // meta_app_secret
        if (callCount === 3) return { value: 'ig-biz' }; // instagram_business_account_id
        if (callCount === 4) return undefined; // instagram_access_token - not set
        if (callCount === 5) return { value: 'fb-page' }; // facebook_page_id
        if (callCount === 6) return { value: 'fb-token' }; // facebook_page_access_token
        return undefined;
      });

      const res = await request(app).get('/api/admin/settings/meta');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        meta_app_id: true,
        meta_app_secret: true,
        instagram_business_account_id: true,
        instagram_access_token: false,
        facebook_page_id: true,
        facebook_page_access_token: true,
      });
    });

    it('returns all false when no credentials are configured', async () => {
      mockGet.mockReturnValue(undefined);

      const res = await request(app).get('/api/admin/settings/meta');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        meta_app_id: false,
        meta_app_secret: false,
        instagram_business_account_id: false,
        instagram_access_token: false,
        facebook_page_id: false,
        facebook_page_access_token: false,
      });
    });

    it('does not expose actual secret values in response', async () => {
      mockGet.mockReturnValue({ value: 'super-secret-value' });

      const res = await request(app).get('/api/admin/settings/meta');

      expect(res.status).toBe(200);
      // Values should be booleans, not the actual secrets
      for (const val of Object.values(res.body)) {
        expect(typeof val).toBe('boolean');
      }
    });
  });

  describe('POST /api/admin/settings/meta/validate', () => {
    it('returns validation results for both Instagram and Facebook', async () => {
      mockInstagramValidate.mockResolvedValue({ valid: true });
      mockFacebookValidate.mockResolvedValue({ valid: true });

      const res = await request(app)
        .post('/api/admin/settings/meta/validate')
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        instagram: { valid: true },
        facebook: { valid: true },
      });
    });

    it('returns error details when Instagram credentials are invalid', async () => {
      mockInstagramValidate.mockResolvedValue({
        valid: false,
        error: 'Instagram access token is invalid or expired. Please reconnect in Settings.',
      });
      mockFacebookValidate.mockResolvedValue({ valid: true });

      const res = await request(app)
        .post('/api/admin/settings/meta/validate')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.instagram.valid).toBe(false);
      expect(res.body.instagram.error).toContain('invalid or expired');
      expect(res.body.facebook.valid).toBe(true);
    });

    it('returns error details when Facebook credentials are invalid', async () => {
      mockInstagramValidate.mockResolvedValue({ valid: true });
      mockFacebookValidate.mockResolvedValue({
        valid: false,
        error: 'Facebook page access token is invalid or expired. Please reconnect in Settings.',
      });

      const res = await request(app)
        .post('/api/admin/settings/meta/validate')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.instagram.valid).toBe(true);
      expect(res.body.facebook.valid).toBe(false);
      expect(res.body.facebook.error).toContain('invalid or expired');
    });

    it('returns errors for both when neither are configured', async () => {
      mockInstagramValidate.mockResolvedValue({
        valid: false,
        error: 'Instagram credentials not configured.',
      });
      mockFacebookValidate.mockResolvedValue({
        valid: false,
        error: 'Facebook Page ID or access token not configured.',
      });

      const res = await request(app)
        .post('/api/admin/settings/meta/validate')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.instagram.valid).toBe(false);
      expect(res.body.facebook.valid).toBe(false);
    });
  });
});

describe('Admin persistence regressions', () => {
  it('persists selection from zero to two, removal, and empty selection through PUT then GET', async () => {
    const row = { id: 12, status: 'pending_review', week_start: '2026-10-11', week_end: '2026-10-17', selected_news: '[]', all_news: JSON.stringify([
      { slug: 'first', titleEs: 'Primera noticia', weightedScore: 0, scores: { novelty: 0 }, reason: 'Existing evaluation' },
      { slug: 'second', titleEn: 'Second article' },
    ]) };
    const { default: Database } = await import('better-sqlite3');
    const fixtureDb = new Database(':memory:');
    fixtureDb.exec(`CREATE TABLE dominical_reports (id INTEGER PRIMARY KEY, status TEXT, week_start TEXT, week_end TEXT, all_news TEXT, selected_news TEXT, post_text TEXT, post_text_instagram TEXT, image_url TEXT, created_at TEXT, last_edited_at TEXT, published_at TEXT, linkedin_post_id TEXT, error_log TEXT)`);
    fixtureDb.prepare('INSERT INTO dominical_reports (id,status,week_start,week_end,all_news,selected_news) VALUES (?,?,?,?,?,?)').run(row.id,row.status,row.week_start,row.week_end,row.all_news,row.selected_news);
    mockPrepare.mockImplementation((sql: string) => fixtureDb.prepare(sql) as any);
    try {
    for (const selected_slugs of [['first', 'second'], ['second'], []]) {
      const put = await request(app).put('/api/admin/dominical/12').send({ selected_slugs });
      expect(put.status).toBe(200);
      const get = await request(app).get('/api/admin/dominical/12');
      expect(get.body.selected_news.map((n: any) => n.slug)).toEqual(selected_slugs);
      if (selected_slugs.length === 2) {
        expect(get.body.selected_news[0].weightedScore).toBe(0);
        expect(get.body.selected_news[1].title).toBe('Second article');
        expect(get.body.selected_news[1]).not.toHaveProperty('weightedScore');
      }
    }
    } finally {
      mockPrepare.mockImplementation(() => ({ get: mockGet, all: mockAll, run: mockRun }));
      fixtureDb.close();
    }
  });
  it.each([['missing'], 'first', [null]])('rejects invalid or foreign selection without writing (%j)', async selected_slugs => {
    mockGet.mockReturnValue({ id: 12, status: 'edited', all_news: '[{"slug":"first"}]', selected_news: '[]' });
    const res = await request(app).put('/api/admin/dominical/12').send({ selected_slugs });
    expect(res.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });
  it('masks all credential families in general settings and never returns structured private keys', async () => {
    mockAll.mockReturnValue([
      { key: 'meta_app_secret', value: 'meta-secret-1234' },
      { key: 'instagram_access_token', value: 'ig-secret-5678' },
      { key: 'facebook_page_access_token', value: 'fb-secret-9012' },
      { key: 'hostinger_api_key', value: 'host-secret-3456' },
      { key: 'gcp_sa_key', value: '{"private_key":"DO-NOT-RETURN","client_email":"private@example.test"}' },
      { key: 'linkedin_token_expires_at', value: '2026-12-01' },
    ]);
    const res = await request(app).get('/api/admin/settings');
    expect(res.status).toBe(200);
    expect(res.body.meta_app_secret).toBe('••••••••1234');
    expect(res.body.hostinger_api_key).toBe('••••••••3456');
    expect(res.body.gcp_sa_key).toBe('••••••••');
    expect(res.text).not.toMatch(/DO-NOT-RETURN|private@example|meta-secret|ig-secret|fb-secret|host-secret/);
    expect(res.body.linkedin_token_expires_at).toBe('2026-12-01');
  });
  it('does not persist masked placeholders through either credential save endpoint', async () => {
    await request(app).put('/api/admin/settings').send({ openai_api_key: '••••••••1234', hostinger_api_key: '••••••••5678', gcp_sa_key: '••••••••' });
    await request(app).post('/api/admin/settings/meta').send({ meta_app_secret: '••••••••1234', instagram_access_token: '••••••••5678' });
    expect(mockRun).not.toHaveBeenCalled();
  });
});
