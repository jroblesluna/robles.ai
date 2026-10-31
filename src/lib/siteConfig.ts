import { useEffect, useState } from "react";

/** Public site settings served by GET /api/public/site-config. */
export interface SiteConfig {
  bookingUrl: string | null;
  unavailableDemos: string[];
}

const EMPTY: SiteConfig = { bookingUrl: null, unavailableDemos: [] };

function loadSiteConfig(): Promise<SiteConfig> {
  return fetch("/api/public/site-config", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : EMPTY))
    .then((data: Partial<SiteConfig>) => ({
      bookingUrl: typeof data.bookingUrl === "string" && /^https?:\/\//i.test(data.bookingUrl) ? data.bookingUrl : null,
      unavailableDemos: Array.isArray(data.unavailableDemos) ? data.unavailableDemos : [],
    }))
    .catch(() => EMPTY);
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

/** False once the server says this demo cannot run; true while loading, so a failed check never hides a demo. */
export function useDemoAvailable(api: string): boolean {
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    let active = true;
    loadSiteConfig().then((config) => {
      if (active) setAvailable(!config.unavailableDemos.includes(api));
    });
    return () => {
      active = false;
    };
  }, [api]);
  return available;
}
