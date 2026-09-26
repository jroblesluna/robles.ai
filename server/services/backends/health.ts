/**
 * Public health-check of a backend: pings GET {url}/health (fallback GET {url}/)
 * with a short timeout. No credentials — works even when GCP/Hostinger are not
 * connected (R5.5). Latency hints warm vs cold (Cloud Run scales to zero).
 */
export interface HealthStatus {
  alive: boolean;
  ms: number | null;
  warm?: boolean;
}

export async function pingHealth(publicUrl: string, timeoutMs = 4000): Promise<HealthStatus> {
  const base = publicUrl.replace(/\/+$/, '');
  const started = Date.now();

  const tryOne = async (path: string): Promise<boolean> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  let alive = await tryOne('/health');
  if (!alive) alive = await tryOne('/');

  const ms = alive ? Date.now() - started : null;
  return { alive, ms, warm: alive && ms !== null ? ms < 2500 : undefined };
}
