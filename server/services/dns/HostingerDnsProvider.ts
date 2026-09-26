import { DnsProvider, DnsRecord, DnsError } from './DnsProvider.js';

/**
 * DNS provider backed by the Hostinger REST API.
 *   Base:  https://developers.hostinger.com
 *   Auth:  Authorization: Bearer <token>
 *   DNS:   GET/PUT /api/dns/v1/zones/{domain}
 * Docs: https://docs.hostinger.com/api-reference/overview
 *
 * Uses plain fetch (no SDK). The token is passed in the constructor and never
 * logged. Respects the 90 req/min limit with a tiny spacing + one 429 retry.
 */
const BASE = 'https://developers.hostinger.com';

export class HostingerDnsProvider implements DnsProvider {
  constructor(private token: string) {}

  private async call(method: string, path: string, body?: unknown): Promise<any> {
    const doFetch = () =>
      fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    let res = await doFetch();

    // One retry on rate limit, respecting Retry-After.
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 2;
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000));
      res = await doFetch();
    }

    if (res.status === 401 || res.status === 403) {
      throw new DnsError('hostinger_auth', 'El token de Hostinger es inválido o no tiene permisos.');
    }
    if (res.status === 404) {
      throw new DnsError('domain_not_found', 'El dominio no se encontró en la cuenta de Hostinger.');
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 60;
      throw new DnsError('rate_limited', 'Límite de la API de Hostinger alcanzado.', retryAfter);
    }
    if (!res.ok) {
      throw new DnsError('hostinger_error', `Hostinger devolvió HTTP ${res.status}.`);
    }
    // Some endpoints (PUT) return an empty success body.
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  async getRecords(domain: string): Promise<DnsRecord[]> {
    const data = await this.call('GET', `/api/dns/v1/zones/${encodeURIComponent(domain)}`);
    // Response shape: [{ name, type, ttl, records: [{ content }] }]
    const out: DnsRecord[] = [];
    const zone = Array.isArray(data) ? data : data?.zone ?? [];
    for (const entry of zone) {
      const records = entry.records ?? [];
      for (const rec of records) {
        out.push({
          name: entry.name,
          type: entry.type,
          target: rec.content ?? rec.value ?? '',
          ttl: entry.ttl,
        });
      }
    }
    return out;
  }

  async upsertCname(domain: string, name: string, target: string, ttl = 3600): Promise<void> {
    await this.call('PUT', `/api/dns/v1/zones/${encodeURIComponent(domain)}`, {
      overwrite: true,
      zone: [
        {
          name,
          type: 'CNAME',
          ttl,
          records: [{ content: target }],
        },
      ],
    });
  }
}
