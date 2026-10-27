import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ ga: { initialize: vi.fn(), send: vi.fn(), event: vi.fn() }, pixel: { init: vi.fn(), pageView: vi.fn(), track: vi.fn() } }));
vi.mock('react-ga4', () => ({ default: sdk.ga }));
vi.mock('react-facebook-pixel', () => ({ default: sdk.pixel }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv('PROD', true); window.history.replaceState(null, '', '/'); (window as any).dataLayer = []; });
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

it('queues a non-personal contact lead before GTM loads without duplicate direct tracking', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ gtm: 'GTM-TEST123', ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  analytics.trackContactLead();
  await analytics.initAnalytics();
  expect((window as any).dataLayer).toEqual([{ event: 'generate_lead', form_id: 'contact', method: 'contact_form' }]);
  expect(sdk.ga.event).not.toHaveBeenCalled();
  expect(sdk.pixel.track).not.toHaveBeenCalled();
});
it('flushes a contact once when direct trackers initialize after submission', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  analytics.trackContactLead();
  await analytics.initAnalytics();
  expect(sdk.ga.event).toHaveBeenCalledExactlyOnceWith('generate_lead', { form_id: 'contact', method: 'contact_form' });
  expect(sdk.pixel.track).toHaveBeenCalledExactlyOnceWith('Lead', { form_id: 'contact', method: 'contact_form' });
});
it('never lets tracker failures break an accepted contact', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  sdk.ga.event.mockImplementationOnce(() => { throw new Error('Blocked'); });
  expect(() => analytics.trackContactLead()).not.toThrow();
  expect(sdk.pixel.track).toHaveBeenCalledWith('Lead', expect.any(Object));
});
it('counts a quiz lead as generate_lead with method quiz', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  analytics.trackQuizLead();
  expect((window as any).dataLayer).toContainEqual({ event: 'generate_lead', form_id: 'quiz', method: 'quiz' });
  expect(sdk.ga.event).toHaveBeenCalledExactlyOnceWith('generate_lead', { form_id: 'quiz', method: 'quiz' });
  expect(sdk.pixel.track).toHaveBeenCalledExactlyOnceWith('Lead', { form_id: 'quiz', method: 'quiz' });
});
it('tracks contact link clicks as contact_click (GTM) without sending a lead', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ gtm: 'GTM-TEST123' }) })));
  const analytics = await import('../analytics');
  analytics.trackContactClick('whatsapp', 'landing_cta');
  await analytics.initAnalytics();
  analytics.trackContactClick('email', 'landing_contact');
  expect((window as any).dataLayer.filter((e: any) => e.event === 'contact_click')).toEqual([
    { event: 'contact_click', contact_method: 'whatsapp', link_location: 'landing_cta' },
    { event: 'contact_click', contact_method: 'email', link_location: 'landing_contact' },
  ]);
  expect((window as any).dataLayer.some((e: any) => e.event === 'generate_lead')).toBe(false);
  expect(sdk.ga.event).not.toHaveBeenCalled();
});
it('sends contact clicks to direct trackers as GA4 contact_click and Meta Contact', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ga4: 'G-TEST', metaPixel: '123' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  analytics.trackContactClick('phone', 'home_contact');
  expect(sdk.ga.event).toHaveBeenCalledExactlyOnceWith('contact_click', { contact_method: 'phone', link_location: 'home_contact' });
  expect(sdk.pixel.track).toHaveBeenCalledExactlyOnceWith('Contact', { contact_method: 'phone', link_location: 'home_contact' });
});

it('loads Clarity alongside GTM and tags leads without personal data', async () => {
  delete (window as any).clarity;
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ gtm: 'GTM-TEST123', clarity: 'abcd1234ef' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  expect(document.querySelector('script[src="https://www.clarity.ms/tag/abcd1234ef"]')).not.toBeNull();
  analytics.tagClarityLead('contact', 42);
  expect((window as any).clarity.q).toEqual(expect.arrayContaining([
    ['set', 'lead_id', 'contact-42'], ['set', 'lead_type', 'contact'], ['upgrade', 'contact_lead'],
  ]));
  document.cookie = '_clck=user123x%7C2%7Cfq1%7C0%7C1; path=/';
  document.cookie = '_clsk=sess456y%7C1700000000000%7C2%7C1; path=/';
  expect(analytics.getClaritySession()).toEqual({ userId: 'user123x', sessionId: 'sess456y' });
});
it('ignores an invalid Clarity project id', async () => {
  delete (window as any).clarity;
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ clarity: 'bad"><script>' }) })));
  const analytics = await import('../analytics');
  await analytics.initAnalytics();
  expect(document.querySelector('script[src*="clarity.ms"]')).toBeNull();
  analytics.tagClarityLead('quiz', 1);
  expect((window as any).clarity).toBeUndefined();
});
