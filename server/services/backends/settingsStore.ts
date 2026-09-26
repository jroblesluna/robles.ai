import db from '../../db.js';

/**
 * Thin helpers over the `settings` key-value table for backend-management
 * credentials. Same table the rest of /admin uses (LinkedIn, Meta, OpenAI…).
 *
 * Secrets (hostinger_api_key, gcp_sa_key) are read server-side only; the API
 * layer never returns their values — see backendRoutes.
 */

export type BackendSettingKey =
  | 'hostinger_api_key'
  | 'gcp_sa_key'
  | 'hostinger_domain'
  | 'dns_cname_target';

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
  ).run(key, value, now);
}

export function hasSetting(key: string): boolean {
  const v = getSetting(key);
  return typeof v === 'string' && v.trim().length > 0;
}

/** DNS zone domain (default robles.ai). */
export function getDnsDomain(): string {
  return getSetting('hostinger_domain') || 'robles.ai';
}

/** Default CNAME target for the Cloud Run domain mappings. */
export function getCnameTarget(): string {
  return getSetting('dns_cname_target') || 'ghs.googlehosted.com.';
}
