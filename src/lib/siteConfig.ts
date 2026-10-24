import { useEffect, useState } from "react";

/** Public site settings served by GET /api/public/site-config. */
export interface SiteConfig {
  bookingUrl: string | null;
}

let cached: Promise<SiteConfig> | null = null;

function loadSiteConfig(): Promise<SiteConfig> {
  cached ??= fetch("/api/public/site-config")
    .then((res) => (res.ok ? res.json() : { bookingUrl: null }))
    .then((data: Partial<SiteConfig>) => ({
      bookingUrl: typeof data.bookingUrl === "string" && /^https?:\/\//i.test(data.bookingUrl) ? data.bookingUrl : null,
    }))
    .catch(() => ({ bookingUrl: null }));
  return cached;
}

/** Calendar booking link set in Admin → Settings (`booking_url`), or null while loading / when unset. */
export function useBookingUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadSiteConfig().then((config) => {
      if (active) setUrl(config.bookingUrl);
    });
    return () => {
      active = false;
    };
  }, []);
  return url;
}
