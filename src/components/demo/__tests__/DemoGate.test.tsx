import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DemoGate } from '../DemoGate';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', resolvedLanguage: 'en' } }),
}));

const stubConfig = (response: Promise<unknown>) => vi.stubGlobal('fetch', vi.fn(() => response));
const page = <DemoGate api="rag"><p>demo page</p></DemoGate>;

describe('DemoGate', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('replaces the demo with a notice when the server marks it unavailable', async () => {
    stubConfig(Promise.resolve({ ok: true, json: async () => ({ unavailableDemos: ['rag'] }) }));
    render(page);
    expect(await screen.findByText('demoUnavailable.title')).toBeTruthy();
    expect(screen.queryByText('demo page')).toBeNull();
  });

  it('keeps the demo when another one is unavailable or the check fails', async () => {
    const other = vi.fn(async () => ({ ok: true, json: async () => ({ unavailableDemos: ['tts'] }) }));
    vi.stubGlobal('fetch', other);
    const { unmount } = render(page);
    await waitFor(() => expect(other).toHaveBeenCalled());
    expect(screen.getByText('demo page')).toBeTruthy();
    unmount();

    stubConfig(Promise.reject(new Error('offline')));
    render(page);
    await new Promise(resolve => setTimeout(resolve));
    expect(screen.getByText('demo page')).toBeTruthy();
  });
});
