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

    // Google Tag Manager (must load first — it can manage other tags)
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

      console.log('✅ Google Tag Manager initialized:', config.gtm);
    }

    // Google Analytics 4
    if (config.ga4) {
      ReactGA.initialize(config.ga4);
      ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
      gaInitialized = true;
      console.log('✅ Google Analytics initialized');
    }

    // Meta Pixel
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
