import { attributionSource } from '@shared/attribution';
import { getAttribution } from '@/lib/attribution';
import { normalizeClaritySession, validClarityProjectId, type ClaritySession } from '@shared/clarity';

// Browser-only SDKs are loaded only when the existing configuration needs them.
let ReactGA: typeof import('react-ga4').default;
let ReactPixel: typeof import('react-facebook-pixel');

let gaInitialized = false;
let fbInitialized = false;
let gtmInitialized = false;
let analyticsReady = false;
type TrackingParams = Record<string, string>;
type QueuedEvent = { ga: string; pixel: string; params: TrackingParams };

// Conversions fired before the trackers finish loading, replayed once on direct GA4/Pixel.
let pendingEvents: QueuedEvent[] = [];

const contactLeadParams = { form_id: 'contact', method: 'contact_form' } as const;
const quizLeadParams = { form_id: 'quiz', method: 'quiz' } as const;

function sendDirect({ ga, pixel, params }: QueuedEvent): void {
  // Tracking failures must never turn an accepted inquiry into a form error.
  try { if (gaInitialized) ReactGA.event(ga, params); } catch { /* non-critical */ }
  try { if (fbInitialized) ReactPixel.track(pixel, params); } catch { /* non-critical */ }
}

function canTrack(): boolean {
  return typeof window !== 'undefined' && import.meta.env.PROD && !window.location.pathname.startsWith('/admin');
}

/**
 * Push a conversion to the dataLayer (GTM) and, without GTM, to GA4 + Meta Pixel directly.
 * Queued until initAnalytics() finishes so early events are not lost or duplicated.
 */
function trackConversion(event: QueuedEvent): void {
  if (!canTrack()) return;
  try {
    // Queue before GTM loads too; GTM consumes the existing dataLayer on startup.
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: event.ga, ...event.params });
  } catch { /* non-critical */ }
  if (!analyticsReady) pendingEvents.push(event);
  else if (!gtmInitialized) sendDirect(event);
}

/** Call once after the contact API confirms success. Never include form values. */
export function trackContactLead(): void {
  trackConversion({ ga: 'generate_lead', pixel: 'Lead', params: { ...contactLeadParams } });
}

/** Call once after the quiz lead is saved by the API. Never include form values. */
export function trackQuizLead(): void {
  trackConversion({ ga: 'generate_lead', pixel: 'Lead', params: { ...quizLeadParams } });
}

export type ContactChannel = 'whatsapp' | 'email' | 'phone' | 'calendar';

/**
 * A click on a WhatsApp / email / phone link. Intent only (the message may never be sent),
 * so import it in Google Ads as a *secondary* conversion. Meta receives the standard "Contact" event.
 */
export function trackContactClick(channel: ContactChannel, location: string): void {
  trackConversion({ ga: 'contact_click', pixel: 'Contact', params: { contact_method: channel, link_location: location } });
}

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
let clarityInitialized = false;

/** Official Clarity bootstrap: calls made before the script loads are queued in `clarity.q`. */
function loadClarity(projectId: string): void {
  const w = window as unknown as { clarity?: ClarityFn };
  if (w.clarity) return;
  const queue: ClarityFn = (...args: unknown[]) => { (queue.q = queue.q || []).push(args); };
  w.clarity = queue;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
  clarityInitialized = true;
}

function clarity(...args: unknown[]): void {
  if (!clarityInitialized) return;
  try { (window as unknown as { clarity?: ClarityFn }).clarity?.(...args); } catch { /* non-critical */ }
}

/** Custom tags let the Clarity dashboard filter recordings (e.g. by campaign or lead). Never pass personal data. */
export function tagClaritySession(tags: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(tags)) if (value) clarity('set', key, value.slice(0, 100));
}

/**
 * Marks the current recording as a lead: tags it (`lead_id = contact-42`) and asks Clarity to keep it
 * even when sampling. Called after the API accepted the submission.
 */
export function tagClarityLead(kind: 'contact' | 'quiz', id: number | string | undefined): void {
  if (id === undefined || id === null || id === '') return;
  tagClaritySession({ lead_id: `${kind}-${id}`, lead_type: kind });
  clarity('upgrade', `${kind}_lead`);
}

/** Clarity user/session IDs from its first-party cookies, to link a lead to its recording. */
export function getClaritySession(): ClaritySession | undefined {
  if (!clarityInitialized || typeof document === 'undefined') return undefined;
  const cookie = (name: string) => document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
  const first = (value?: string) => (value ? decodeURIComponent(value).split('|')[0] : undefined);
  return normalizeClaritySession({ userId: first(cookie('_clck')), sessionId: first(cookie('_clsk')) }) ?? undefined;
}

/**
 * Initialize Google Analytics and Facebook Pixel.
 * Fetches IDs dynamically from the admin settings API so they can be
 * configured from the admin panel without redeploying.
 * Only activates in production environment.
 */
export const initAnalytics = async () => {
  if (typeof window === 'undefined' || !import.meta.env.PROD) {
    console.log('Analytics disabled in development');
    return;
  }

  // Don't inject analytics on admin pages
  if (window.location.pathname.startsWith('/admin')) return;

  try {
    const res = await fetch('/api/public/analytics-config');
    if (!res.ok) return;
    const config = await res.json();

    // Clarity is independent of GTM / GA4: it only records sessions, so it never duplicates conversions.
    const clarityId = validClarityProjectId(config.clarity);
    if (clarityId) {
      loadClarity(clarityId);
      // Same de-duplicated attribution the contact form stores, so recordings filter by campaign/keyword.
      const attribution = getAttribution();
      const params = attribution?.params ?? {};
      tagClaritySession({
        traffic_source: attributionSource(attribution) ?? undefined,
        campaign: params.utm_campaign ?? params.campaignid,
        keyword: params.utm_term ?? params.keyword,
        landing_variant: params.s,
      });
    }

    // If GTM is configured, it handles ALL tracking (GA4, Meta Pixel, etc.)
    // Don't inject individual trackers to avoid duplicate events.
    if (config.gtm && /^GTM-[A-Z0-9]+$/.test(config.gtm)) {
      // Inject GTM script into <head>
      const gtmScript = document.createElement('script');
      gtmScript.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${config.gtm}');`;
      document.head.insertBefore(gtmScript, document.head.firstChild);

      // Inject noscript iframe into <body>
      const noscript = document.createElement('noscript');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${config.gtm}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);

      gtmInitialized = true;
      console.log('✅ Google Tag Manager initialized (manages all tracking):', config.gtm);
      return; // GTM handles everything — stop here
    }

    // Fallback: No GTM configured — use direct GA4 and Meta Pixel injection
    if (config.ga4) {
      ReactGA = (await import('react-ga4')).default;
      ReactGA.initialize(config.ga4);
      ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
      gaInitialized = true;
      console.log('✅ Google Analytics initialized (direct)');
    }

    if (config.metaPixel) {
      ReactPixel = (await import('react-facebook-pixel')).default;
      ReactPixel.init(config.metaPixel);
      ReactPixel.pageView();
      fbInitialized = true;
      console.log('✅ Facebook Pixel initialized (direct)');
    }
  } catch {
    // Silently fail — analytics are non-critical
  } finally {
    analyticsReady = true;
    if (!gtmInitialized) {
      for (const event of pendingEvents) sendDirect(event);
    }
    pendingEvents = [];
  }
};

/**
 * Track custom events in both GA4 and Meta Pixel.
 */
export const trackEvent = (category: string, action: string, label?: string) => {
  if (gaInitialized) {
    ReactGA.event({ category, action, label });
  }
  if (fbInitialized) {
    ReactPixel.track(action, { label });
  }
};

/**
 * Track a page view (for SPA navigation).
 */
export const trackPageView = (url: string): void => {
  if (gaInitialized) {
    ReactGA.send({ hitType: 'pageview', page: url });
  }
  if (fbInitialized) {
    ReactPixel.pageView();
  }
};

/** Funnel events for the AI demos lab (see docs/DEMOS_PLAN.md §2.7). */
export type DemoEvent =
  | 'demo_start'
  | 'demo_complete'
  | 'roi_calculated'
  | 'demo_cta_click'
  | 'tutorial_play'
  | 'tutorial_complete'
  | 'spot_sound_on'
  | 'spot_complete';

/**
 * Track a demo funnel event with a `demo_id` parameter.
 *
 * Unlike `trackEvent`, this also works when GTM owns tracking: it pushes to the
 * dataLayer (create a GA4 event tag on these event names in GTM). With direct
 * GA4 it sends a GA4 custom event, and with Meta Pixel a custom event.
 */
export const trackDemoEvent = (
  event: DemoEvent,
  demoId: string,
  params: Record<string, string | number> = {},
): void => {
  const payload = { demo_id: demoId, ...params };
  if (gtmInitialized) {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...payload });
  }
  if (gaInitialized) {
    ReactGA.event(event, payload);
  }
  if (fbInitialized) {
    ReactPixel.trackCustom(event, payload);
  }
};
