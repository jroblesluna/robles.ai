import { beforeEach, describe, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ all: vi.fn() }));
vi.mock('../../db.js', () => ({
  default: {
    prepare: () => ({ all: database.all }),
  },
}));
import { getEmailSettings, resolveEmailSettings } from '../emailSettings.js';

const environment = {
  EMAIL_USER: 'env-sender@example.test',
  EMAIL_PASS: 'env-app-password',
  EMAIL_TO: 'env-recipient@example.test',
};

describe('resolveEmailSettings', () => {
  it('uses admin settings in production and never falls back to environment values', () => {
    expect(resolveEmailSettings({
      email_user: 'admin-sender@example.test',
      email_app_password: 'admin-app-password',
      email_to: 'admin-recipient@example.test',
    }, environment, 'production')).toEqual({
      user: 'admin-sender@example.test',
      appPassword: 'admin-app-password',
      recipient: 'admin-recipient@example.test',
    });

    expect(resolveEmailSettings({}, environment, 'production')).toBeNull();
  });

  it('prefers saved settings and falls back to environment values outside production', () => {
    expect(resolveEmailSettings({
      email_user: 'admin-sender@example.test',
    }, environment, 'development')).toEqual({
      user: 'admin-sender@example.test',
      appPassword: 'env-app-password',
      recipient: 'env-recipient@example.test',
    });
  });

  describe('getEmailSettings', () => {
    beforeEach(() => {
      database.all.mockReset();
    });

    it('loads SMTP credentials from the admin settings table', () => {
      database.all.mockReturnValue([
        { key: 'email_user', value: 'admin-sender@example.test' },
        { key: 'email_app_password', value: 'admin-app-password' },
        { key: 'email_to', value: 'admin-recipient@example.test' },
      ]);

      expect(getEmailSettings()).toEqual({
        user: 'admin-sender@example.test',
        appPassword: 'admin-app-password',
        recipient: 'admin-recipient@example.test',
      });
    });
  });
});
