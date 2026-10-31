export type DemoApi = 'chatbot' | 'identity' | 'rag' | 'langchain' | 'transcription' | 'docextract' | 'tts';

/** Renewed this early so a token never expires in the middle of a request. */
const RENEW_MARGIN_SECONDS = 60;
const tokens = new Map<DemoApi, Promise<{ token: string; expiresAt: number } | null>>();

async function requestToken(api: DemoApi) {
  try {
    const res = await fetch('/api/public/demo-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { token: string; expiresAt: number };
  } catch {
    return null;
  }
}

/** Short-lived token for the visitor's browser; real API keys stay on the server. */
async function demoToken(api: DemoApi): Promise<string | null> {
  const cached = await tokens.get(api);
  if (cached && cached.expiresAt - RENEW_MARGIN_SECONDS > Date.now() / 1000) return cached.token;
  const request = requestToken(api);
  tokens.set(api, request);
  const issued = await request;
  if (!issued) tokens.delete(api);
  return issued?.token ?? null;
}

export async function demoFetch(api: DemoApi, url: string, init: RequestInit = {}): Promise<Response> {
  const token = await demoToken(api);
  const headers = new Headers(init.headers);
  if (token) headers.set('X-API-Key', token);
  return fetch(url, { ...init, headers });
}

/** Browsers cannot set headers on a WebSocket, so the token goes in the URL. */
export async function demoWebSocketUrl(api: DemoApi, url: string): Promise<string> {
  const token = await demoToken(api);
  return token ? `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(token)}` : url;
}
