// TESTS/e2e/helpers/e2e-auth-once.ts
import type { Page } from '@playwright/test';

export async function seedLoggedInSession(
	page: Page,
	{ access, refresh, expiresInSeconds }: { access?: string; refresh?: string; expiresInSeconds?: number } = {}
) {
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = String(now + (expiresInSeconds ?? 3600));

  // This script will run automatically before the page executes
	await page.addInitScript(({ access, refresh, expiresAt }) => {
		window.sessionStorage.setItem('spotify_access_token', access ?? 'e2e-access');
		window.sessionStorage.setItem('spotify_refresh_token', refresh ?? 'e2e-refresh');
		window.sessionStorage.setItem('spotify_expires_at', expiresAt);
	}, { access, refresh, expiresAt });
}
