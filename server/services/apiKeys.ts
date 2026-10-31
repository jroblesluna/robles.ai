import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import db from '../db.js';
import { BACKENDS } from './backends/registry.js';

/**
 * API keys for the demo backends. Keys are stored only as hashes, so a key is
 * shown once at creation. The browser demos never receive a key: each API has a
 * demo key kept on this server, and visitors get short-lived tokens signed with it.
 */

const DEMO_TOKEN_SECONDS = 15 * 60;

export interface ApiKeyRow {
  id: number;
  api_id: string;
  name: string;
  prefix: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export const isApiId = (id: unknown): id is string => BACKENDS.some(backend => backend.id === id);

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
const demoSetting = (apiId: string) => `demo_api_key_${apiId}`;

function readSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string | null } | undefined;
  return row?.value ?? null;
}

function writeSetting(key: string, value: string | null) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
    .run(key, value, new Date().toISOString());
}

export function listApiKeys(): ApiKeyRow[] {
  return db.prepare(
    'SELECT id, api_id, name, prefix, created_at, revoked_at, last_used_at FROM api_keys ORDER BY created_at DESC'
  ).all() as ApiKeyRow[];
}

export function createApiKey(apiId: string, name: string): { id: number; key: string } {
  const key = `rbk_${apiId}_${randomBytes(24).toString('hex')}`;
  const result = db.prepare(
    'INSERT INTO api_keys (api_id, name, key_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(apiId, name, hashKey(key), key.slice(0, apiId.length + 13), new Date().toISOString());
  return { id: Number(result.lastInsertRowid), key };
}

export function revokeApiKey(id: number): boolean {
  const row = db.prepare('SELECT api_id, key_hash FROM api_keys WHERE id = ? AND revoked_at IS NULL')
    .get(id) as { api_id: string; key_hash: string } | undefined;
  if (!row) return false;
  db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  const demoKey = readSetting(demoSetting(row.api_id));
  if (demoKey && hashKey(demoKey) === row.key_hash) writeSetting(demoSetting(row.api_id), null);
  return true;
}

function isActiveKey(apiId: string, key: string): boolean {
  const row = db.prepare('SELECT id FROM api_keys WHERE api_id = ? AND key_hash = ? AND revoked_at IS NULL')
    .get(apiId, hashKey(key)) as { id: number } | undefined;
  if (!row) return false;
  db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  return true;
}

/** Saves the key the demos use; it must be an active key of that API. */
export function setDemoKey(apiId: string, key: string): boolean {
  if (!isActiveKey(apiId, key)) return false;
  writeSetting(demoSetting(apiId), key);
  return true;
}

export const clearDemoKey = (apiId: string) => writeSetting(demoSetting(apiId), null);

export function demoKeyStatus(): Record<string, boolean> {
  return Object.fromEntries(BACKENDS.map(backend => [backend.id, Boolean(readSetting(demoSetting(backend.id)))]));
}

const sign = (demoKey: string, payload: string) => createHmac('sha256', demoKey).update(payload).digest('hex');

export function issueDemoToken(apiId: string): { token: string; expiresAt: number } | null {
  const demoKey = readSetting(demoSetting(apiId));
  if (!demoKey) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + DEMO_TOKEN_SECONDS;
  const payload = `${apiId}.${expiresAt}`;
  return { token: `rbt.${payload}.${sign(demoKey, payload)}`, expiresAt };
}

function isValidDemoToken(apiId: string, token: string): boolean {
  const [prefix, tokenApi, expires, signature] = token.split('.');
  if (prefix !== 'rbt' || tokenApi !== apiId || !signature) return false;
  if (!(Number(expires) > Date.now() / 1000)) return false;
  const demoKey = readSetting(demoSetting(apiId));
  if (!demoKey) return false;
  const expected = Buffer.from(sign(demoKey, `${apiId}.${expires}`));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** What the API backends ask: may this key or demo token call this API? */
export const verifyApiCredential = (apiId: string, credential: string): boolean =>
  credential.startsWith('rbt.') ? isValidDemoToken(apiId, credential) : isActiveKey(apiId, credential);

export const apiKeysRequired = () => readSetting('api_keys_required') === 'true';

/** Turning enforcement on is refused while a demo would be left without a key. */
export function setApiKeysRequired(required: boolean): { ok: boolean; missing: string[] } {
  const missing = Object.entries(demoKeyStatus()).filter(([, configured]) => !configured).map(([id]) => id);
  if (required && missing.length) return { ok: false, missing };
  writeSetting('api_keys_required', String(required));
  return { ok: true, missing: [] };
}
