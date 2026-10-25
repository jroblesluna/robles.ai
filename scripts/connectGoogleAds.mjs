// Authorize the admin's read-only Google Ads integration with a Desktop OAuth client.
// This intentionally stores a refresh token in robles.ai's protected settings.
// No secrets are written locally or printed. The operator completes Google consent.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const [clientPath, customerId = '5850899991'] = process.argv.slice(2);
if (!clientPath || !/^\d{10}$/.test(customerId)) throw new Error('Usage: node scripts/connectGoogleAds.mjs <desktop-client.json> [customer-id]');
const email = process.env.ROBLES_ADMIN_EMAIL;
const password = process.env.ROBLES_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set ROBLES_ADMIN_EMAIL and ROBLES_ADMIN_PASSWORD in the process environment.');
const client = JSON.parse(await readFile(clientPath, 'utf8')).installed;
if (!client?.client_id?.endsWith('.apps.googleusercontent.com') || !client.client_secret) throw new Error('A Google Desktop OAuth client JSON is required.');
const base = 'https://robles.ai';
const verifier = randomBytes(48).toString('base64url');
const state = randomBytes(32).toString('base64url');
let redirectUri, complete = false, timer;
async function json(url, options = {}) {
  for (let attempt = 0; attempt < 7; attempt++) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(45000) });
    // Keep credentials in memory through a short production restart.
    if ([429, 502, 503, 504].includes(response.status) && attempt < 6) {
      await response.text();
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }
    if (!response.ok) throw new Error(`Request failed (${response.status}) at ${new URL(url).hostname}. No credentials were printed.`);
    const data = await response.json();
    return { response, data };
  }
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/oauth2callback') { res.writeHead(404).end(); return; }
  if (url.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid state.'); return; }
  if (complete) { res.writeHead(409).end('Authorization already handled.'); return; }
  if (url.searchParams.get('error')) { res.writeHead(400).end('Authorization declined. Return to the chat.'); shutdown(1); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.writeHead(400).end('Missing authorization code.'); return; }
  complete = true;
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('Autorización recibida. Vuelve al chat para comprobar el resultado de la conexión del admin.');
  let cookie;
  try {
    const { data: token } = await json('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: client.client_id, client_secret: client.client_secret, redirect_uri: redirectUri, code_verifier: verifier }),
    });
    if (!token.refresh_token) throw new Error('Google did not return a refresh token. Revoke/re-authorize this client before retrying. Nothing was saved.');
    const { data: accounts } = await json('https://googleads.googleapis.com/v26/customers:listAccessibleCustomers', { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!accounts.resourceNames?.includes(`customers/${customerId}`)) throw new Error('The authorized user cannot directly access the selected Ads account. Nothing was saved.');
    const { response: login } = await json(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    if (!cookie) throw new Error('Admin login returned no session. Nothing was saved.');
    // The existing authenticated settings endpoint masks secrets and skips masked updates.
    await json(base + '/api/admin/settings', {
      method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_ads_customer_id: customerId, google_ads_client_id: client.client_id,
        google_ads_client_secret: client.client_secret, google_ads_refresh_token: token.refresh_token,
        google_ads_login_customer_id: '' }),
    });
    await json(base + '/api/admin/analytics/refresh', { method: 'POST', headers: { Cookie: cookie } });
    const { data: saved } = await json(base + '/api/admin/settings', { headers: { Cookie: cookie } });
    const masked = ['google_ads_client_secret', 'google_ads_refresh_token'].every(key => typeof saved[key] === 'string' && saved[key].startsWith('••••'));
    if (!masked) throw new Error('Settings response did not mask credentials. Review server secret handling.');
    console.log(JSON.stringify({ connectedSettingsSaved: true, customerId, secretsMasked: true, target: base }));
    shutdown(0);
  } catch (error) { console.error(error.message); shutdown(1); }
  finally { if (cookie) await fetch(base + '/api/admin/logout', { method: 'POST', headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) }).catch(() => {}); }
});
function shutdown(code) {
  clearTimeout(timer);
  server.close();
  server.closeAllConnections();
  process.exitCode = code;
}
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
redirectUri = `http://127.0.0.1:${server.address().port}/oauth2callback`;
const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authorization.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: redirectUri, response_type: 'code',
  scope: 'https://www.googleapis.com/auth/adwords', access_type: 'offline', prompt: 'consent', state,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', login_hint: email }).toString();
console.log('Authorize persistent server access; Google Ads reporting code performs read-only requests.');
console.log('AUTHORIZE_URL=' + authorization.href);
timer = setTimeout(() => { console.error('Authorization timed out; nothing saved.'); shutdown(1); }, 20 * 60 * 1000);
