import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const settings = new Map<string, string | null>();
  const keys: any[] = [];
  const prepare = (sql: string) => ({
    get: (...args: any[]) => {
      if (sql.includes('FROM settings')) {
        return settings.has(args[0]) ? { value: settings.get(args[0]) } : undefined;
      }
      if (sql.includes('WHERE id = ?')) return keys.find(k => k.id === args[0] && !k.revoked_at);
      return keys.find(k => k.api_id === args[0] && k.key_hash === args[1] && !k.revoked_at);
    },
    all: () => keys,
    run: (...args: any[]) => {
      if (sql.includes('INTO settings')) settings.set(args[0], args[1]);
      else if (sql.includes('INTO api_keys')) {
        keys.push({ id: keys.length + 1, api_id: args[0], name: args[1], key_hash: args[2], prefix: args[3] });
        return { lastInsertRowid: keys.length };
      } else if (sql.includes('revoked_at =')) keys.find(k => k.id === args[1]).revoked_at = args[0];
      return {};
    },
  });
  return { settings, keys, prepare };
});
vi.mock('../db.js', () => ({ default: { prepare: db.prepare } }));

import publicRouter from '../publicRoutes.js';
import {
  createApiKey,
  issueDemoToken,
  revokeApiKey,
  setApiKeysRequired,
  setDemoKey,
  verifyApiCredential,
} from '../services/apiKeys.js';
import { BACKENDS } from '../services/backends/registry.js';

beforeEach(() => {
  db.settings.clear();
  db.keys.length = 0;
  vi.useRealTimers();
});

describe('API keys', () => {
  it('stores only a hash and accepts the key for its own API', () => {
    const { key } = createApiKey('rag', 'Client');
    expect(JSON.stringify(db.keys)).not.toContain(key);
    expect(verifyApiCredential('rag', key)).toBe(true);
    expect(verifyApiCredential('tts', key)).toBe(false);
    expect(verifyApiCredential('rag', `${key}x`)).toBe(false);
  });

  it('rejects a revoked key and removes it from the demos', () => {
    const { id, key } = createApiKey('rag', 'Demo');
    expect(setDemoKey('rag', key)).toBe(true);
    expect(revokeApiKey(id)).toBe(true);
    expect(verifyApiCredential('rag', key)).toBe(false);
    expect(issueDemoToken('rag')).toBeNull();
  });

  it('only accepts an active key of that API as demo key', () => {
    const { key } = createApiKey('tts', 'Other');
    expect(setDemoKey('rag', key)).toBe(false);
  });

  it('issues demo tokens tied to one API that expire', () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00Z') });
    setDemoKey('rag', createApiKey('rag', 'Demo').key);
    const { token } = issueDemoToken('rag')!;
    expect(verifyApiCredential('rag', token)).toBe(true);
    expect(verifyApiCredential('tts', token)).toBe(false);
    expect(verifyApiCredential('rag', `${token.slice(0, -1)}0`)).toBe(token.endsWith('0'));
    vi.setSystemTime(new Date('2026-10-31T12:16:00Z'));
    expect(verifyApiCredential('rag', token)).toBe(false);
  });

  it('refuses to require keys while a demo has none', () => {
    expect(setApiKeysRequired(true).ok).toBe(false);
    for (const backend of BACKENDS) setDemoKey(backend.id, createApiKey(backend.id, 'Demo').key);
    expect(setApiKeysRequired(true).ok).toBe(true);
  });

  it('answers the backends and exposes only the enforcement flag', async () => {
    const { key } = createApiKey('rag', 'Client');
    const app = express().use(express.json()).use('/api/public', publicRouter);
    const verify = (body: object) => request(app).post('/api/public/api-keys/verify').send(body);
    expect((await verify({ api: 'rag', key })).body).toEqual({ valid: true });
    expect((await verify({ api: 'rag', key: 'nope' })).body).toEqual({ valid: false });
    expect((await verify({ api: 'unknown', key })).body).toEqual({ valid: false });
    const config = await request(app).get('/api/public/ai-models');
    expect(config.body.apiKeysRequired).toBe(false);
  });
});
