/**
 * Local-only auth preview for development. Never enable in production builds:
 * `__DEV__` is false in release, and this must stay gated on EXPO_PUBLIC_DEV_LOGIN_BYPASS.
 *
 * Remove or stop using this path once real Supabase login is the default workflow.
 */
export const DEV_PREVIEW_USER_ID = 'dev-local-preview-user';

/** Stable mock user for local UI / split-data seeding only (no Supabase session). */
export const DEV_PREVIEW_USER = {
  id: DEV_PREVIEW_USER_ID,
  email: 'dev.preview@local.invalid',
  name: 'Dev önizleme',
} as const;

/**
 * Requires both Metro dev mode and an explicit env flag so the bypass is never accidental.
 */
export function isDevLoginBypassEnabled(): boolean {
  if (!__DEV__) return false;
  const v = process.env.EXPO_PUBLIC_DEV_LOGIN_BYPASS;
  return v === 'true' || v === '1';
}
