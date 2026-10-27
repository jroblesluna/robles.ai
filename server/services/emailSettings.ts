import db from '../db.js';

export interface EmailSettings {
  user: string;
  appPassword: string;
  recipient: string;
}

const SETTING_KEYS = ['email_user', 'email_app_password', 'email_to'] as const;
type EmailSettingKey = (typeof SETTING_KEYS)[number];
type EmailSettingRows = Partial<Record<EmailSettingKey, string>>;
type EmailEnvironment = Partial<Record<'EMAIL_USER' | 'EMAIL_PASS' | 'EMAIL_TO', string>>;

export function resolveEmailSettings(
  settings: EmailSettingRows,
  environment: EmailEnvironment = process.env,
  nodeEnv = process.env.NODE_ENV,
): EmailSettings | null {
  const configured = (key: EmailSettingKey, envKey: keyof EmailEnvironment): string | undefined => {
    const savedValue = settings[key]?.trim();
    if (savedValue) return savedValue;
    return nodeEnv === 'development' || nodeEnv === 'test'
      ? environment[envKey]?.trim() || undefined
      : undefined;
  };

  const user = configured('email_user', 'EMAIL_USER');
  const appPassword = configured('email_app_password', 'EMAIL_PASS');
  const recipient = configured('email_to', 'EMAIL_TO');
  return user && appPassword && recipient ? { user, appPassword, recipient } : null;
}

export function getEmailSettings(): EmailSettings | null {
  const placeholders = SETTING_KEYS.map(() => '?').join(', ');
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...SETTING_KEYS) as
    Array<{ key: EmailSettingKey; value: string | null }>;
  const settings: EmailSettingRows = {};
  for (const row of rows) {
    if (row.value) settings[row.key] = row.value;
  }
  return resolveEmailSettings(settings);
}
