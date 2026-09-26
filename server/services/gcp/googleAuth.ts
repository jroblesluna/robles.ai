import jwt from 'jsonwebtoken';

/**
 * Obtains a Google OAuth access token from a service-account JSON key using the
 * JWT bearer grant (no google SDK). Signs a short-lived assertion with the SA's
 * RS256 private key and exchanges it at the token endpoint.
 *
 * Scope is read-only (cloud-platform.read-only) — the admin portal only reads
 * Cloud Run state (v1). The token is cached until shortly before it expires.
 */
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// Cloud Run Admin API requires the full cloud-platform scope; the read-only scope
// returns ACCESS_TOKEN_SCOPE_INSUFFICIENT. Read-only is still enforced at the IAM
// level: the SA only holds roles/run.viewer, so it cannot write regardless of scope.
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

interface SaKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cache: { token: string; exp: number } | null = null;
let cacheKeyFingerprint = '';

function parseKey(raw: string): SaKey {
  const key = JSON.parse(raw) as SaKey;
  if (!key.client_email || !key.private_key) {
    throw new Error('gcp_sa_key inválida: faltan client_email o private_key');
  }
  // JSON-escaped newlines in private_key must be real newlines for RS256 signing.
  key.private_key = key.private_key.replace(/\\n/g, '\n');
  return key;
}

/**
 * Returns a valid access token for the given SA key JSON. `rawKey` is the JSON
 * string stored in settings.gcp_sa_key. Throws if the key is malformed or the
 * token exchange fails.
 */
export async function getAccessToken(rawKey: string): Promise<string> {
  const fingerprint = String(rawKey.length) + rawKey.slice(0, 24);
  const now = Math.floor(Date.now() / 1000);

  if (cache && cacheKeyFingerprint === fingerprint && cache.exp - 60 > now) {
    return cache.token;
  }

  const key = parseKey(rawKey);
  const assertion = jwt.sign(
    {
      iss: key.client_email,
      scope: SCOPE,
      aud: key.token_uri || TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    key.private_key,
    { algorithm: 'RS256' },
  );

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch(key.token_uri || TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`token exchange failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  cacheKeyFingerprint = fingerprint;
  return json.access_token;
}
