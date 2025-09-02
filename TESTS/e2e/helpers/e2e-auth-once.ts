// TESTS/e2e/helpers/e2e-auth-once.ts
import type { Page } from '@playwright/test';

export async function seedLoggedInSession(
  page: Page,
  { access, refresh, expiresInSeconds }: { access?: string; refresh?: string; expiresInSeconds?: number } = {}
) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = String(now + (expiresInSeconds ?? 3600));

  // assumes a document already exists
  await page.evaluate(({ access, refresh, expiresAt }) => {
    sessionStorage.setItem('spotify_access_token', access ?? 'e2e-access');
    sessionStorage.setItem('spotify_refresh_token', refresh ?? 'e2e-refresh');
    sessionStorage.setItem('spotify_expires_at', expiresAt);
  }, { access, refresh, expiresAt });
}