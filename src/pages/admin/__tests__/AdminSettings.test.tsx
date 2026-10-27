import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminSettings from '../AdminSettings';
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows masked saved fingerprints, hides replacement secrets and never resaves masked placeholders', async () => {
  let saved: any;
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: any) => {
    if (options?.method === 'PUT') { saved = JSON.parse(options.body); return { ok: true, json: async () => ({ success: true }) }; }
    return { ok: true, json: async () => url.endsWith('/ga4-status') ? { hasCredentials: true } : url.endsWith('/meta') ? { meta_app_secret: true, instagram_access_token: true } : { openai_api_key: '****1234', email_user: 'sender@example.test', email_app_password: '****5678', email_to: 'team@example.test', linkedin_client_id: 'linkedin-client-id', linkedin_client_secret: '****AB12', meta_app_secret: '****5678', instagram_access_token: '****9012', notification_email: 'fixture@example.test' } };
  }));
  render(<AdminSettings />);
  await screen.findByLabelText('API Key');
  expect(screen.getByText(/Saved: \*\*\*\*1234/)).toBeInTheDocument();
  expect(screen.getByText(/Saved: \*\*\*\*5678/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('App Secret')).toHaveAttribute('placeholder', expect.stringContaining('****5678')));
  expect(screen.getByLabelText('App Secret')).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Save Dominical Preferences' }));
  await waitFor(() => expect(saved).toBeDefined());
  expect(saved).not.toHaveProperty('openai_api_key');
  expect(saved).not.toHaveProperty('email_app_password');
  expect(saved).not.toHaveProperty('meta_app_secret');
  expect(saved.notification_email).toBe('fixture@example.test');
  expect(saved).not.toHaveProperty('email_to');
  expect(saved).not.toHaveProperty('linkedin_client_id');
  expect(saved).not.toHaveProperty('booking_url');
});
it('shows LinkedIn client secret fingerprint without pre-filling a secret value', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith('/meta') ? {} : { linkedin_client_secret: '****AB12' },
  })));
  render(<AdminSettings />);
  const secret = await screen.findByLabelText('Client Secret');
  expect(secret).toHaveValue('');
  expect(secret).toHaveAttribute('placeholder', expect.stringContaining('****AB12'));
  expect(screen.getByText(/Saved: \*\*\*\*AB12/)).toBeInTheDocument();
});
it('saves only email delivery settings from the email section button', async () => {
  const requests: Array<Record<string, string>> = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method === 'PUT') requests.push(JSON.parse(options.body || '{}'));
    return { ok: true, json: async () => ({ email_user: 'sender@example.test', email_app_password: '****5678', email_to: 'team@example.test', booking_url: 'https://example.test/book' }) };
  }));
  render(<AdminSettings />);
  const email = await screen.findByLabelText('Gmail account');
  fireEvent.change(email, { target: { value: 'new-sender@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Email Delivery' }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toEqual({
    email_user: 'new-sender@example.test',
    email_to: 'team@example.test',
  });
});
it('saves LinkedIn credentials only from the LinkedIn section and preserves the masked secret', async () => {
  const requests: Array<Record<string, string>> = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method === 'PUT') requests.push(JSON.parse(options.body || '{}'));
    return { ok: true, json: async () => ({ linkedin_client_id: 'existing-id', linkedin_client_secret: '****AB12' }) };
  }));
  render(<AdminSettings />);
  const clientId = await screen.findByLabelText('Client ID');
  fireEvent.change(clientId, { target: { value: 'updated-id' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save LinkedIn' }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toEqual({ linkedin_client_id: 'updated-id' });
});
it('blocks section saves after settings fail to load', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  render(<AdminSettings />);
  expect(await screen.findByRole('button', { name: 'Save Email Delivery' })).toBeDisabled();
  expect(screen.getByText(/Settings could not be loaded/)).toBeInTheDocument();
});
