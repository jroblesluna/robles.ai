import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminSettings from '../AdminSettings';
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows masked saved fingerprints, hides replacement secrets and never resaves masked placeholders', async () => {
  let saved: any;
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: any) => {
    if (options?.method === 'PUT') { saved = JSON.parse(options.body); return { ok: true, json: async () => ({ success: true }) }; }
    return { ok: true, json: async () => url.endsWith('/ga4-status') ? { hasCredentials: true } : url.endsWith('/meta') ? { meta_app_secret: true, instagram_access_token: true } : { openai_api_key: '••••••••1234', meta_app_secret: '••••••••5678', instagram_access_token: '••••••••9012', notification_email: 'fixture@example.test' } };
  }));
  render(<AdminSettings />);
  await screen.findByLabelText('API Key');
  expect(screen.getByText(/Saved: ••••••••1234/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('App Secret')).toHaveAttribute('placeholder', expect.stringContaining('••••••••5678')));
  expect(screen.getByLabelText('App Secret')).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
  await waitFor(() => expect(saved).toBeDefined());
  expect(saved).not.toHaveProperty('openai_api_key');
  expect(saved).not.toHaveProperty('meta_app_secret');
  expect(saved.notification_email).toBe('fixture@example.test');
});
it('blocks general saving after settings fail to load', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  render(<AdminSettings />);
  expect(await screen.findByRole('button', { name: 'Save Settings' })).toBeDisabled();
  expect(screen.getByText(/Settings could not be loaded/)).toBeInTheDocument();
});
