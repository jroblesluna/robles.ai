import { getAccessToken } from './googleAuth.js';

/**
 * Read-only Cloud Run client. Reads a service's state via the Cloud Run Admin
 * API v2. NO write methods exist here by design (R5.4): the admin portal never
 * deploys, updates, scales or deletes.
 */
export interface CloudRunStatus {
  available: boolean; // false when no SA key is configured / auth failed
  exists?: boolean;
  url?: string;
  ready?: boolean;
  latestRevision?: string;
  region?: string;
  error?: string;
}

/**
 * @param rawKey  settings.gcp_sa_key JSON string (or null if not connected)
 */
export async function getServiceStatus(
  rawKey: string | null,
  project: string,
  region: string,
  service: string,
): Promise<CloudRunStatus> {
  if (!rawKey) return { available: false };

  let token: string;
  try {
    token = await getAccessToken(rawKey);
  } catch (e) {
    return { available: false, error: 'gcp_auth' };
  }

  const url = `https://run.googleapis.com/v2/projects/${project}/locations/${region}/services/${service}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return { available: true, exists: undefined, error: 'gcp_unreachable' };
  }

  if (res.status === 404) {
    return { available: true, exists: false, region };
  }
  if (!res.ok) {
    return { available: true, error: `gcp_http_${res.status}` };
  }

  const svc = (await res.json()) as {
    uri?: string;
    latestReadyRevision?: string;
    terminalCondition?: { type?: string; state?: string };
  };

  const ready =
    svc.terminalCondition?.type === 'Ready' && svc.terminalCondition?.state === 'CONDITION_SUCCEEDED';

  return {
    available: true,
    exists: true,
    url: svc.uri,
    ready,
    latestRevision: svc.latestReadyRevision
      ? svc.latestReadyRevision.split('/').pop()
      : undefined,
    region,
  };
}
