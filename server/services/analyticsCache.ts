import db from '../db.js';

/**
 * Analytics cache layer backed by SQLite.
 * Stores API responses with a TTL to avoid excessive external API calls.
 */

/**
 * Retrieve a cached value by key.
 * Returns the parsed JSON data if the entry exists and is within its TTL,
 * or null if expired/missing.
 */
export function get<T = unknown>(key: string): T | null {
  const row = db.prepare(
    'SELECT response_json, fetched_at, ttl_seconds FROM analytics_cache WHERE cache_key = ?'
  ).get(key) as { response_json: string; fetched_at: string; ttl_seconds: number } | undefined;

  if (!row) return null;

  const fetchedAt = new Date(row.fetched_at).getTime();
  const now = Date.now();
  const ageSeconds = (now - fetchedAt) / 1000;

  if (ageSeconds >= row.ttl_seconds) {
    // Entry has expired — clean it up and return null
    db.prepare('DELETE FROM analytics_cache WHERE cache_key = ?').run(key);
    return null;
  }

  try {
    return JSON.parse(row.response_json) as T;
  } catch {
    // Corrupted JSON — remove and return null
    db.prepare('DELETE FROM analytics_cache WHERE cache_key = ?').run(key);
    return null;
  }
}

/**
 * Store a value in the cache with the given TTL in seconds.
 * Uses INSERT OR REPLACE to upsert.
 */
export function set(key: string, data: unknown, ttlSeconds: number): void {
  const responseJson = JSON.stringify(data);
  const fetchedAt = new Date().toISOString();

  db.prepare(
    `INSERT OR REPLACE INTO analytics_cache (cache_key, response_json, fetched_at, ttl_seconds)
     VALUES (?, ?, ?, ?)`
  ).run(key, responseJson, fetchedAt, ttlSeconds);
}

/**
 * Clear cache entries.
 * If keyPattern is provided, deletes entries whose cache_key matches the pattern (SQL LIKE).
 * If no pattern is provided, deletes all cache entries.
 */
export function clear(keyPattern?: string): void {
  if (keyPattern) {
    db.prepare('DELETE FROM analytics_cache WHERE cache_key LIKE ?').run(keyPattern);
  } else {
    db.prepare('DELETE FROM analytics_cache').run();
  }
}

/** Predefined TTL constants (in seconds) */
export const TTL = {
  REALTIME: 30,       // 30 seconds for real-time data
  TODAY: 300,         // 5 minutes for today's data
  HISTORICAL: 3600,   // 1 hour for historical data
  META: 1800,         // 30 minutes for Meta data
} as const;
