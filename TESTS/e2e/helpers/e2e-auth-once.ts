// TESTS/e2e/helpers/e2e-auth-once.ts
import type { Page } from '@playwright/test';

/** Seed sessionStorage once and reload so the app sees the tokens. */
export async function seedLoggedInSessionOnce(
	page: Page,
	opts: { access?: string; refresh?: string; expiresInSeconds?: number } = {}
) {
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = String(now + (opts.expiresInSeconds ?? 3600));

	// Assumes you're already on your app origin (e.g. after home.goto()).
	await page.evaluate(({ access, refresh, expiresAt }) => {
		sessionStorage.setItem('spotify_access_token', access ?? 'e2e-access');
		sessionStorage.setItem('spotify_refresh_token', refresh ?? 'e2e-refresh');
		sessionStorage.setItem('spotify_expires_at', expiresAt);
	}, { access: opts.access, refresh: opts.refresh, expiresAt });

	// Make the app re-read tokens on mount.
	await page.reload();
}
