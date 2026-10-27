import { z } from "zod";

/**
 * Ad / traffic attribution captured from the landing URL and attached to contact submissions.
 * Shared by the browser (capture) and the server (re-normalisation before storage).
 */

/** URL parameters worth keeping: UTM tags, click IDs and Google Ads ValueTrack parameters. */
export const ATTRIBUTION_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "gclid", "gbraid", "wbraid", "gad_source", "gad_campaignid", "fbclid", "msclkid", "li_fat_id", "ttclid",
  "campaignid", "adgroupid", "keyword", "matchtype", "creative", "adid", "targetid",
  "device", "network", "placement", "adposition", "loc_physical_ms", "loc_interest_ms",
  "s",
] as const;

/**
 * Parameters that often carry the same value (e.g. utm_term={keyword}&keyword={keyword}).
 * Within a group only the first parameter with a given value is kept.
 */
const ALIAS_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["utm_term", "keyword"],
  ["utm_campaign", "utm_id", "campaignid", "gad_campaignid"],
  ["utm_content", "creative", "adid"],
];

const MAX_VALUE = 200;

export const attributionSchema = z.object({
  params: z.record(z.string(), z.string()).optional(),
  landingPage: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  capturedAt: z.string().max(40).optional(),
});

export type Attribution = z.infer<typeof attributionSchema>;

const clean = (value: unknown, max = MAX_VALUE): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  // Unresolved ValueTrack placeholders ("{keyword}") carry no information.
  return trimmed && !/^\{[^}]*\}$/.test(trimmed) ? trimmed : undefined;
};

/** Keeps only known parameters, drops empty / placeholder values and same-value aliases. */
export function normalizeParams(input: Record<string, unknown> | URLSearchParams): Record<string, string> {
  const get = (key: string) => (input instanceof URLSearchParams ? input.get(key) : input[key]);
  const params: Record<string, string> = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = clean(get(key));
    if (value) params[key] = value;
  }
  for (const group of ALIAS_GROUPS) {
    const seen = new Set<string>();
    for (const key of group) {
      const value = params[key]?.toLowerCase();
      if (value === undefined) continue;
      if (seen.has(value)) delete params[key];
      else seen.add(value);
    }
  }
  return params;
}

/** Path only; the query string is already represented by `params`. */
const pathOf = (value: unknown): string | undefined => {
  const raw = clean(value, 500);
  if (!raw) return undefined;
  try {
    return new URL(raw, "https://robles.ai").pathname;
  } catch {
    return undefined;
  }
};

/** External referrer as origin + path (no query, which may hold personal data). */
const referrerOf = (value: unknown, ownHost?: string): string | undefined => {
  const raw = clean(value, 500);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol) || (ownHost && url.host === ownHost)) return undefined;
    return `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return undefined;
  }
};

/** Normalised attribution, or null when there is nothing worth storing. */
export function normalizeAttribution(input: unknown, ownHost?: string): Attribution | null {
  const parsed = attributionSchema.safeParse(input);
  if (!parsed.success) return null;
  const params = normalizeParams(parsed.data.params ?? {});
  const referrer = referrerOf(parsed.data.referrer, ownHost);
  if (!Object.keys(params).length && !referrer) return null;
  const result: Attribution = {};
  if (Object.keys(params).length) result.params = params;
  const landingPage = pathOf(parsed.data.landingPage);
  if (landingPage) result.landingPage = landingPage;
  if (referrer) result.referrer = referrer;
  const capturedAt = clean(parsed.data.capturedAt, 40);
  if (capturedAt && Number.isFinite(Date.parse(capturedAt))) result.capturedAt = new Date(capturedAt).toISOString();
  return result;
}

/** Human-readable source label, e.g. "Google Ads", "google / cpc", "Referral: linkedin.com". */
export function attributionSource(attribution: Attribution | null | undefined): string | null {
  if (!attribution) return null;
  const p = attribution.params ?? {};
  if (p.gclid || p.gbraid || p.wbraid || p.gad_source) return "Google Ads";
  if (p.fbclid) return p.utm_source ? `Meta (${p.utm_source})` : "Meta";
  if (p.msclkid) return "Microsoft Ads";
  if (p.li_fat_id) return "LinkedIn Ads";
  if (p.ttclid) return "TikTok Ads";
  if (p.utm_source) return p.utm_medium ? `${p.utm_source} / ${p.utm_medium}` : p.utm_source;
  if (attribution.referrer) {
    try {
      return `Referral: ${new URL(attribution.referrer).host.replace(/^www\./, "")}`;
    } catch {
      return "Referral";
    }
  }
  return null;
}
