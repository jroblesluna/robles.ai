import { normalizeAttribution, normalizeParams, type Attribution } from "@shared/attribution";

/**
 * Remembers how the visitor arrived (UTM tags, ad click IDs, ValueTrack parameters, external
 * referrer) so the contact form can attach it. A new tagged visit replaces the previous touch;
 * untagged navigation keeps it. Stored per browser for 90 days; storage failures are ignored.
 */

const STORAGE_KEY = "robles_attribution";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function read(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = normalizeAttribution(JSON.parse(raw));
    const age = stored?.capturedAt ? Date.now() - Date.parse(stored.capturedAt) : Infinity;
    return stored && age < MAX_AGE_MS ? stored : null;
  } catch {
    return null;
  }
}

function write(value: Attribution): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: attribution is best-effort.
  }
}

let current: Attribution | null = null;

/** Call once on startup, before the router rewrites the URL. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const params = normalizeParams(new URLSearchParams(window.location.search));
  // `?s=` alone is the landing variant, not a traffic source.
  const tagged = Object.keys(params).some((key) => key !== "s");
  const stored = read();
  const incoming = normalizeAttribution(
    { params, landingPage: window.location.pathname, referrer: document.referrer, capturedAt: new Date().toISOString() },
    window.location.host,
  );
  if (incoming && (tagged || (!stored && incoming.referrer))) {
    current = incoming;
    write(incoming);
  } else {
    current = stored;
  }
}

/** Attribution to send with a lead, or undefined when the visit is untracked/direct. */
export function getAttribution(): Attribution | undefined {
  if (typeof window === "undefined") return undefined;
  return (current ?? read()) || undefined;
}
