/**
 * DNS provider abstraction. v1 has a single implementation (Hostinger). When
 * robles.ai migrates its DNS to Cloud DNS (DEMOS_PLAN §8), add a CloudDnsProvider
 * and swap the active one — endpoints and UI stay unchanged.
 */
export interface DnsRecord {
  /** Relative name, e.g. "chatbot-api". */
  name: string;
  /** "CNAME", "A", … */
  type: string;
  /** The record's value/content, e.g. "ghs.googlehosted.com." */
  target: string;
  ttl?: number;
}

export interface DnsProvider {
  /** All records of the zone for `domain`. */
  getRecords(domain: string): Promise<DnsRecord[]>;
  /** Create or update a CNAME `name → target` in the zone (idempotent). */
  upsertCname(domain: string, name: string, target: string, ttl?: number): Promise<void>;
}

/** Typed error so the API layer can map to a machine-readable `code`. */
export class DnsError extends Error {
  constructor(public code: string, message: string, public retryAfter?: number) {
    super(message);
  }
}
