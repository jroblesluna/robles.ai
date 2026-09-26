import { Router, type Request, type Response } from 'express';
import { requireAuth } from './auth.js';
import { BACKENDS, getBackend } from './services/backends/registry.js';
import {
  getSetting,
  setSetting,
  hasSetting,
  getDnsDomain,
  getCnameTarget,
} from './services/backends/settingsStore.js';
import { HostingerDnsProvider } from './services/dns/HostingerDnsProvider.js';
import { DnsError, type DnsRecord } from './services/dns/DnsProvider.js';
import { getServiceStatus } from './services/gcp/cloudRunClient.js';
import { pingHealth } from './services/backends/health.js';

/**
 * Admin portal for backend management (spec: .kiro/specs/admin-backend-management).
 * v1 = read state (DNS via Hostinger + Cloud Run read-only + health) + publish CNAMEs.
 * No destructive actions. All routes require the admin JWT.
 *
 * Credentials live in `settings` (BD) and are NEVER returned to the client — the
 * status endpoints report presence only; the PUT is write-only.
 */
const backendRouter = Router();
backendRouter.use(requireAuth);

const dnsProvider = () => {
  const token = getSetting('hostinger_api_key');
  return token ? new HostingerDnsProvider(token) : null;
};

/** GET /connections — presence of credentials, never their values. */
backendRouter.get('/connections', (_req: Request, res: Response) => {
  res.json({
    hostinger: { connected: hasSetting('hostinger_api_key'), domain: getDnsDomain() },
    gcp: { connected: hasSetting('gcp_sa_key') },
    dnsCnameTarget: getCnameTarget(),
  });
});

/** PUT /connections — write-only for secrets; optional Hostinger validation. */
backendRouter.put('/connections', async (req: Request, res: Response) => {
  const { hostinger_api_key, gcp_sa_key, hostinger_domain, dns_cname_target } = req.body ?? {};

  if (typeof hostinger_api_key === 'string' && hostinger_api_key.trim()) {
    setSetting('hostinger_api_key', hostinger_api_key.trim());
  }
  if (typeof gcp_sa_key === 'string' && gcp_sa_key.trim()) {
    // Validate it parses as SA JSON before storing (fail fast, no value echoed).
    try {
      const k = JSON.parse(gcp_sa_key);
      if (!k.client_email || !k.private_key) throw new Error('missing fields');
    } catch {
      res.status(400).json({ error: { code: 'invalid_gcp_key', message: 'El JSON de la service account no es válido.' } });
      return;
    }
    setSetting('gcp_sa_key', gcp_sa_key.trim());
  }
  if (typeof hostinger_domain === 'string' && hostinger_domain.trim()) {
    setSetting('hostinger_domain', hostinger_domain.trim());
  }
  if (typeof dns_cname_target === 'string' && dns_cname_target.trim()) {
    setSetting('dns_cname_target', dns_cname_target.trim());
  }

  // Optional live validation of the Hostinger token (does not echo it).
  let hostingerValid: boolean | undefined;
  const provider = dnsProvider();
  if (provider) {
    try {
      await provider.getRecords(getDnsDomain());
      hostingerValid = true;
    } catch {
      hostingerValid = false;
    }
  }

  res.json({
    hostinger: { connected: hasSetting('hostinger_api_key'), valid: hostingerValid },
    gcp: { connected: hasSetting('gcp_sa_key') },
  });
});

function classifyDns(
  records: DnsRecord[] | null,
  subdomain: string,
  expectedTarget: string,
): { dnsStatus: string; currentTarget: string | null } {
  if (!records) return { dnsStatus: 'unknown', currentTarget: null };
  const cname = records.find(
    (r) => r.type?.toUpperCase() === 'CNAME' && r.name === subdomain,
  );
  if (!cname) return { dnsStatus: 'missing', currentTarget: null };
  const norm = (s: string) => s.replace(/\.$/, '').toLowerCase();
  const ok = norm(cname.target) === norm(expectedTarget);
  return { dnsStatus: ok ? 'ok' : 'mismatch', currentTarget: cname.target };
}

/** GET / — list backends with DNS status, health and Cloud Run state. */
backendRouter.get('/', async (_req: Request, res: Response) => {
  const domain = getDnsDomain();
  const defaultTarget = getCnameTarget();
  const gcpKey = getSetting('gcp_sa_key');
  const provider = dnsProvider();

  // Read the whole zone once (not per-backend) to compute DNS status.
  let records: DnsRecord[] | null = null;
  if (provider) {
    try {
      records = await provider.getRecords(domain);
    } catch {
      records = null; // unknown for all
    }
  }

  const items = await Promise.all(
    BACKENDS.map(async (b) => {
      const expected = b.cnameTarget || defaultTarget;
      const dns = classifyDns(records, b.subdomain, expected);
      const [health, cloudRun] = await Promise.all([
        pingHealth(b.publicUrl),
        getServiceStatus(gcpKey, b.cloudRunProject, b.region, b.cloudRunService),
      ]);
      return {
        id: b.id,
        label: b.label,
        subdomain: b.subdomain,
        publicUrl: b.publicUrl,
        expectedTarget: expected,
        ...dns,
        health,
        cloudRun,
      };
    }),
  );

  res.json({ hostingerConnected: Boolean(provider), gcpConnected: Boolean(gcpKey), domain, items });
});

/** POST /:id/dns — create/update the backend's CNAME (idempotent). */
backendRouter.post('/:id/dns', async (req: Request, res: Response) => {
  const def = getBackend(String(req.params.id));
  if (!def) {
    res.status(400).json({ error: { code: 'unknown_backend', message: 'Backend desconocido.' } });
    return;
  }
  const provider = dnsProvider();
  if (!provider) {
    res.status(400).json({ error: { code: 'hostinger_not_connected', message: 'Conecta Hostinger primero.' } });
    return;
  }
  const domain = getDnsDomain();
  const target = def.cnameTarget || getCnameTarget();

  try {
    // name/target come from the server-side registry, never from the client (R4.3).
    await provider.upsertCname(domain, def.subdomain, target);
    // Audit log without secrets (R7).
    console.log(
      `[admin/backends] ${req.adminUser?.email ?? 'admin'} published CNAME ${def.subdomain} → ${target} in ${domain}`,
    );
    // Re-read to report the resulting state.
    let records: DnsRecord[] | null = null;
    try {
      records = await provider.getRecords(domain);
    } catch {
      records = null;
    }
    const dns = classifyDns(records, def.subdomain, target);
    res.json({ id: def.id, ...dns });
  } catch (e) {
    if (e instanceof DnsError) {
      res.status(e.code === 'rate_limited' ? 429 : 502).json({
        error: { code: e.code, message: e.message },
        ...(e.retryAfter ? { retryAfter: e.retryAfter } : {}),
      });
      return;
    }
    res.status(500).json({ error: { code: 'internal_error', message: 'Error inesperado.' } });
  }
});

/** GET /:id/cloudrun — Cloud Run read-only state of one backend. */
backendRouter.get('/:id/cloudrun', async (req: Request, res: Response) => {
  const def = getBackend(String(req.params.id));
  if (!def) {
    res.status(400).json({ error: { code: 'unknown_backend', message: 'Backend desconocido.' } });
    return;
  }
  const status = await getServiceStatus(
    getSetting('gcp_sa_key'),
    def.cloudRunProject,
    def.region,
    def.cloudRunService,
  );
  res.json(status);
});

export default backendRouter;
