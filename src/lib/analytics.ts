import ReactGA from 'react-ga4';
import ReactPixel from 'react-facebook-pixel';

let gaInitialized = false;
let fbInitialized = false;

/**
 * Initialize Google Analytics and Facebook Pixel.
 * Fetches IDs dynamically from the admin settings API so they can be
 * configured from the admin panel without redeploying.
 * Only activates in production environment.
 */
export const initAnalytics = async () => {
  if (!import.meta.env.PROD) {
    console.log('Analytics disabled in development');
    return;
  }

  // Don't inject analytics on admin pages
  if (window.location.pathname.startsWith('/admin')) return;

  try {
    const res = await fetch('/api/public/analytics-config');
    if (!res.ok) return;
    const config = await res.json();

    if (config.ga4) {
      ReactGA.initialize(config.ga4);
      ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
      gaInitialized = true;
      console.log('✅ Google Analytics initialized');
    }

    if (config.metaPixel) {
      ReactPixel.init(config.metaPixel);
      ReactPixel.pageView();
      fbInitialized = true;
      console.log('✅ Facebook Pixel initialized');
    }
  } catch {
    // Silently fail — analytics are non-critical
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
