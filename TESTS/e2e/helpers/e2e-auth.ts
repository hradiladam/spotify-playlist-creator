// TESTS/e2e/helpers/e2e-auth.ts

import type { Page } from '@playwright/test';

// Preloads fake Spotify auth tokens into sessionStorage
// BEFORE the app boots, so tests start in a "logged-in" state.
//
// - Skips the real PKCE login.
// - Makes your app believe there is a valid access token.
// - Keeps expiry in the same format as the real app.



export const seedLoggedInSession = async (
	page: Page,
	// optional settings, can be left empty
	{ access, refresh, expiresInSeconds }: { access?: string; refresh?: string; expiresInSeconds?: number } = {}
) => {
	// Get the current time in seconds (not milliseconds).
	// The app expects "expires_at" to be in seconds.
	const nowInSeconds = Math.floor(Date.now() / 1000);

	// Expiry time: 1 hour in the future by default.
	// Can be changed by passing expiresInSeconds.
	const expiresAt = String(nowInSeconds + (expiresInSeconds ?? 3600));

	// Add a script that runs before the app starts.
	// This script sets sessionStorage with fake tokens.
	await page.addInitScript(
		// This function runs inside the browser
		({ access, refresh, expiresAt }) => {
			window.sessionStorage.setItem('spotify_access_token', access);
			window.sessionStorage.setItem('spotify_refresh_token', refresh);
			window.sessionStorage.setItem('spotify_expires_at', expiresAt);
		},
		// These are the values we send into the function above
		{
			access: access ?? 'e2e-access',
			refresh: refresh ?? 'e2e-refresh',
			expiresAt,
		}
	);
};
