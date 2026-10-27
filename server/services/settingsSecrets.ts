/** Central policy for authenticated settings responses; JSON/private keys stay fully masked. */
export function isSecretSetting(key: string): boolean {
  return /(?:oauth_state|secret|token|api_key|sa_key|private_key|password|credentials)/i.test(key) && !/(?:expires_at|expiry|enabled)$/.test(key);
}
export function maskSettingSecret(value: string | null, key = ''): string | null {
  if (!value) return value;
  if (value.length <= 4 || /(?:sa_key|private_key|credentials)/i.test(key) || value.trim().startsWith('{')) return '****';
  return '****' + value.slice(-4);
}
export function isMaskedSecret(value: unknown): boolean {
  return typeof value === 'string' && /^(?:•{4}|\*{4})/.test(value);
}
