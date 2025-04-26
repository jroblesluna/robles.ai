import ReactGA from 'react-ga4';
import ReactPixel from 'react-facebook-pixel';

const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
const fbPixelId = import.meta.env.VITE_FACEBOOK_PIXEL_ID;

/**
 * Initialize Google Analytics and Facebook Pixel
 * Only in production environment
 */
export const initAnalytics = () => {
  if (!import.meta.env.PROD) {
    console.log("Analytics disabled in development");
    return;
  }

  if (gaMeasurementId) {
    ReactGA.initialize(gaMeasurementId);
    ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    console.log("✅ Google Analytics initialized");
  } else {
    console.warn("⚠️ GA Measurement ID missing");
  }

  if (fbPixelId) {
    ReactPixel.init(fbPixelId);
    ReactPixel.pageView();
    console.log("✅ Facebook Pixel initialized");
  } else {
    console.warn("⚠️ Facebook Pixel ID missing");
  }
};

/**
 * Optional: Track custom events
 */
export const trackEvent = (category: string, action: string, label?: string) => {
  if (gaMeasurementId) {
    ReactGA.event({ category, action, label });
  }
  if (fbPixelId) {
    ReactPixel.track(action, { label });
  }
};