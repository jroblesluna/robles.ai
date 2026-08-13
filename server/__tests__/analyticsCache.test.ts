import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({
  get: mockGet,
  run: mockRun,
}));

vi.mock('../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

import { get, set, clear, TTL } from '../services/analyticsCache.js';

describe('analyticsCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get()', () => {
    it('returns null when key does not exist', () => {
      mockGet.mockReturnValue(undefined);

      const result = get('nonexistent');

      expect(result).toBeNull();
      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT response_json, fetched_at, ttl_seconds FROM analytics_cache WHERE cache_key = ?'
      );
    });

    it('returns parsed data when within TTL', () => {
      const data = { users: 42, sessions: 100 };
      const now = new Date();
      mockGet.mockReturnValue({
        response_json: JSON.stringify(data),
        fetched_at: now.toISOString(),
        ttl_seconds: 300,
      });

      const result = get('overview:kpis');

      expect(result).toEqual(data);
    });

    it('returns null and deletes entry when TTL has expired', () => {
      const data = { users: 42 };
      const expiredTime = new Date(Date.now() - 400_000).toISOString(); // 400s ago
      mockGet.mockReturnValue({
        response_json: JSON.stringify(data),
        fetched_at: expiredTime,
        ttl_seconds: 300,
      });

      const result = get('overview:kpis');

      expect(result).toBeNull();
      // Should delete expired entry
      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM analytics_cache WHERE cache_key = ?'
      );
      expect(mockRun).toHaveBeenCalledWith('overview:kpis');
    });

    it('returns null and deletes entry when JSON is corrupted', () => {
      mockGet.mockReturnValue({
        response_json: '{invalid json!!!',
        fetched_at: new Date().toISOString(),
        ttl_seconds: 300,
      });

      const result = get('corrupted');

      expect(result).toBeNull();
      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM analytics_cache WHERE cache_key = ?'
      );
      expect(mockRun).toHaveBeenCalledWith('corrupted');
    });
  });

  describe('set()', () => {
    it('upserts cache entry with current timestamp', () => {
      const data = { active: 5 };

      set('realtime:active', data, 30);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO analytics_cache')
      );
      expect(mockRun).toHaveBeenCalledWith(
        'realtime:active',
        JSON.stringify(data),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO timestamp
        30
      );
    });
  });

  describe('clear()', () => {
    it('deletes all entries when no pattern is provided', () => {
      clear();

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM analytics_cache');
      expect(mockRun).toHaveBeenCalled();
    });

    it('deletes matching entries when a pattern is provided', () => {
      clear('overview:%');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM analytics_cache WHERE cache_key LIKE ?'
      );
      expect(mockRun).toHaveBeenCalledWith('overview:%');
    });
  });

  describe('TTL constants', () => {
    it('has correct TTL values', () => {
      expect(TTL.REALTIME).toBe(30);
      expect(TTL.TODAY).toBe(300);
      expect(TTL.HISTORICAL).toBe(3600);
      expect(TTL.META).toBe(1800);
    });
  });
});
