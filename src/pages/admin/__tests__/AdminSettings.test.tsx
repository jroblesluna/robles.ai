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
  expect(screen.getByLabelText('API Key')).toHaveAttribute('placeholder', expect.stringContaining('****1234'));
  expect(screen.getAllByText('Saved credential').length).toBeGreaterThan(1);
  await waitFor(() => expect(screen.getByLabelText('App Secret')).toHaveAttribute('placeholder', expect.stringContaining('****5678')));
  expect(screen.getByLabelText('App Secret')).toHaveAttribute('type', 'password');
  expect(screen.queryByText(/Enter a new value only to replace it/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Notification Email'), { target: { value: 'changed@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Dominical Preferences' }));
  await waitFor(() => expect(saved).toBeDefined());
  expect(saved).not.toHaveProperty('openai_api_key');
  expect(saved).not.toHaveProperty('email_app_password');
  expect(saved).not.toHaveProperty('meta_app_secret');
  expect(saved.notification_email).toBe('changed@example.test');
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
  expect(screen.getByText('Saved credential')).toBeInTheDocument();
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
  expect(requests[0]).toEqual({ email_user: 'new-sender@example.test' });
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
it('disables section saves until a setting changes and re-disables after reverting it', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith('/meta') ? {} : { email_user: 'sender@example.test' },
  })));
  render(<AdminSettings />);
  const save = await screen.findByRole('button', { name: 'Save Email Delivery' });
  expect(save).toBeDisabled();
  const email = screen.getByLabelText('Gmail account');
  fireEvent.change(email, { target: { value: 'other@example.test' } });
  expect(save).toBeEnabled();
  fireEvent.change(email, { target: { value: 'sender@example.test' } });
  expect(save).toBeDisabled();
});
it('shows all saved password credentials as blank inputs with a consistent masked fingerprint', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith('/meta')
      ? { meta_app_secret: true, instagram_access_token: true }
      : {
          email_app_password: '****5678',
          linkedin_client_secret: '****AB12',
          meta_app_secret: '****CDEF',
          instagram_access_token: '****9012',
          openai_api_key: '****1234',
        },
  })));
  render(<AdminSettings />);
  for (const [label, fingerprint] of [
    ['Gmail app password', '****5678'],
    ['Client Secret', '****AB12'],
    ['App Secret', '****CDEF'],
    ['Access Token', '****9012'],
    ['API Key', '****1234'],
  ]) {
    const input = await screen.findByLabelText(label);
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('placeholder', expect.stringContaining(fingerprint));
  }
});
it('shows saved Meta IDs in full while keeping Meta secrets masked', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith('/meta')
      ? { meta_app_id: true, instagram_business_account_id: true, facebook_page_id: true, meta_app_secret: true }
      : {
          meta_app_id: '123456789012345',
          instagram_business_account_id: '17841400000000000',
          facebook_page_id: '987654321098765',
          meta_app_secret: '****CDEF',
        },
  })));
  render(<AdminSettings />);
  expect(await screen.findByLabelText('Meta App ID')).toHaveValue('123456789012345');
  expect(screen.getByLabelText('Business Account ID')).toHaveValue('17841400000000000');
  expect(screen.getByLabelText('Page ID')).toHaveValue('987654321098765');
  expect(screen.getByLabelText('App Secret')).toHaveValue('');
  expect(screen.getByLabelText('App Secret')).toHaveAttribute('placeholder', expect.stringContaining('****CDEF'));
});
it('validates a saved email configuration without sending a test message', async () => {
  const requests: Array<{ url: string; method?: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: { method?: string }) => {
    requests.push({ url, method: options?.method });
    return { ok: true, json: async () => url.endsWith('/meta') ? {} : { email_user: 'sender@example.test' } };
  }));
  render(<AdminSettings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Validate Email Delivery' }));
  await waitFor(() => expect(requests.some((request) => request.url.endsWith('/settings/email/validate') && request.method === 'POST')).toBe(true));
});
it('loads and saves the configured booking URL in Calendar Booking settings', async () => {
  const requests: Array<{ url: string; body?: Record<string, string> }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: { method?: string; body?: string }) => {
    if (options?.method === 'PUT') requests.push({ url, body: JSON.parse(options.body || '{}') });
    return {
      ok: true,
      json: async () => url.endsWith('/meta') ? {} : { booking_url: 'https://booking.example.test/custom' },
    };
  }));
  render(<AdminSettings />);
  const booking = await screen.findByLabelText('Booking URL');
  expect(booking).toHaveValue('https://booking.example.test/custom');
  fireEvent.change(booking, { target: { value: 'https://booking.example.test/new' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Calendar Booking' }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].body).toEqual({ booking_url: 'https://booking.example.test/new' });
});
