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

export type ContactChannel = 'whatsapp' | 'email' | 'phone';

/**
 * A click on a WhatsApp / email / phone link. Intent only (the message may never be sent),
 * so import it in Google Ads as a *secondary* conversion. Meta receives the standard "Contact" event.
 */
export function trackContactClick(channel: ContactChannel, location: string): void {
  trackConversion({ ga: 'contact_click', pixel: 'Contact', params: { contact_method: channel, link_location: location } });
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

/** Funnel events for the AI demos lab (see DEMOS_PLAN.md §2.7). */
export type DemoEvent = 'demo_start' | 'demo_complete' | 'roi_calculated' | 'demo_cta_click';

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
