import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ ga: { initialize: vi.fn(), send: vi.fn(), event: vi.fn() }, pixel: { init: vi.fn(), pageView: vi.fn(), track: vi.fn() } }));
vi.mock('react-ga4', () => ({ default: sdk.ga }));
vi.mock('react-facebook-pixel', () => ({ default: sdk.pixel }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv('PROD', true); window.history.replaceState(null, '', '/'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); document.querySelectorAll('script').forEach(node => node.remove()); document.querySelectorAll('noscript').forEach(node => node.remove()); });
it('preserves GTM as the sole tracker when configured, without duplicate SDK initialization', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ gtm: 'GTM-TEST123', ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  expect(document.head.textContent).toContain('GTM-TEST123');
  expect(sdk.ga.initialize).not.toHaveBeenCalled();
  expect(sdk.pixel.init).not.toHaveBeenCalled();
});
it('loads existing direct trackers when configured and preserves page/event behavior', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  expect(sdk.ga.initialize).toHaveBeenCalledWith('G-TEST');
  expect(sdk.pixel.init).toHaveBeenCalledWith('123');
  expect(sdk.pixel.pageView).toHaveBeenCalledTimes(1);
  analytics.trackPageView('/demos'); analytics.trackEvent('demo', 'start', 'rag');
  expect(sdk.ga.send).toHaveBeenLastCalledWith({ hitType: 'pageview', page: '/demos' });
  expect(sdk.pixel.track).toHaveBeenCalledWith('start', { label: 'rag' });
});
it('never requests tracking configuration on an admin page', async () => {
  window.history.replaceState(null, '', '/admin');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await (await import('../analytics')).initAnalytics();
  expect(fetcher).not.toHaveBeenCalled();
});
