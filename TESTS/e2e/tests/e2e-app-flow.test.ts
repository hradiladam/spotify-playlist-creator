// TESTS/e2e/tests/e2e-app-flow.test.ts
import { test, expect } from '@playwright/test';
import { seedLoggedInSessionOnce  } from '../helpers/e2e-auth-once';
import { stubMe, stubSearchTracks, stubCreatePlaylist, stubAddTracks } from '../helpers/stubs';
import { HomePage } from '../pages/HomePage';

test('full flow: search → create → add track → save to Spotify', async ({ page }) => {
	// Set up fake API responses so tests don't hit real Spotify
	await stubMe(page);
	await stubSearchTracks(page);
	await stubCreatePlaylist(page);
	await stubAddTracks(page);

	const home = new HomePage(page);

	// Open the app’s home page
	await home.goto();

	// Pretend we’re logged in by seeding sessionStorage once
	await seedLoggedInSessionOnce (page);

	// Reload so the app re-reads the tokens and shows the logged-in UI
	await page.reload();

	// Make sure the “logged in” UI really rendered (search bar visible, etc.)
	await home.assertLoggedInUI();

	// Create a local playlist called “My new mix”
	await home.createPlaylist('My new mix');

	// Type a search; results are mocked by our stub so we expect 4 items
	await home.search('Songs');
	await expect(home.addTrackToPlaylistButtons).toHaveCount(4);

	// Click “Save” on the first result → should increase the saved count to 1
	await home.addFirstTrackToPlaylist();
	await expect.poll(() => home.savedCount()).toBe(1);

	// Try saving to Spotify → our stub returns success and triggers an alert
	const alertText = await home.saveToSpotifyAndGetAlert();
	expect(alertText.toLowerCase()).toMatch(/playlist saved to spotify/);
});


test('adding a track increments saved counter', async ({ page }) => {
	// Only need stubs for /me and /search here
	await stubMe(page);
	await stubSearchTracks(page);

	const home = new HomePage(page);

	// Open app → seed tokens → reload to show logged-in UI
	await home.goto();
	await seedLoggedInSessionOnce (page);
	await page.reload();
	await home.assertLoggedInUI();

	// Create a local playlist and add the first search result
	await home.createPlaylist('New');
	await home.searchAndWait('x'); // helper: types and waits for results to render
	await home.addFirstTrackToPlaylist();

	// Counter should be 1
	await expect.poll(() => home.savedCount()).toBe(1);
});


test('saving same track twice only counts once', async ({ page }) => {
	// Stubs for /me and /search are enough
	await stubMe(page);
	await stubSearchTracks(page);

	const home = new HomePage(page);

	// Start logged in in the UI
	await home.goto();
	await seedLoggedInSessionOnce (page);
	await page.reload();
	await home.assertLoggedInUI();

	// Create a playlist and try to save the same track twice
	await home.createPlaylist('Mix');
	await home.searchAndWait('abc');
	await home.addFirstTrackToPlaylist(); // first time → should count
	await home.addFirstTrackToPlaylist(); // second time → should be ignored

	// Still only 1 saved track (duplicate protection working)
	await expect.poll(() => home.savedCount()).toBe(1);
});


test('logout clears session and shows login screen', async ({ page }) => {
	await stubMe(page);
	const home = new HomePage(page);

	await home.goto();
	await seedLoggedInSessionOnce(page);   // ⟵ one-shot seed
	await home.assertLoggedInUI();

	await home.logout();

	await page.waitForFunction(() =>
		!sessionStorage.getItem('spotify_access_token') &&
		!sessionStorage.getItem('spotify_refresh_token') &&
		!sessionStorage.getItem('spotify_expires_at')
	);

	await page.goto('about:blank');
	await home.goto();

	await expect(page.getByRole('button', { name: /login with spotify/i })).toBeVisible();
});


test('Login button navigates to Spotify authorize', async ({ page }) => {
	let capturedUrl: string | undefined;

	// Stop the app from really going to Spotify.com.
	// Instead, we "catch" the request and save the URL so we can check it later.
	await page.route('https://accounts.spotify.com/**', async (route) => {
		capturedUrl = route.request().url(); // save the full URL the app tried to open
		await route.abort(); // block the request so browser stays on our app
	});

	// Open the app in a logged-out state (we don’t fake tokens here).
	await page.goto('./');

	// Click the "Login with Spotify" button in the app.
	await page.getByRole('button', { name: /login with spotify/i }).click();

	// After clicking, the app should try to go to Spotify’s /authorize page.
	expect(capturedUrl).toBeTruthy(); // check we actually captured a URL
	expect(capturedUrl).toMatch(/^https:\/\/accounts\.spotify\.com\/authorize\?/);

	// Break the URL apart so we can check important query parameters.
	const u = new URL(capturedUrl!);

	// Must include our Spotify app client_id (from env variable).
	expect(u.searchParams.get('client_id')).toBeTruthy();

	// Must include a redirect back to our app’s callback page.
	expect(u.searchParams.get('redirect_uri')).toMatch(/\/callback$/);

	// PKCE (security flow) basics:
	// - I should have OAuth "code" back (not a token directly)
	expect(u.searchParams.get('response_type')).toBe('code');
	// - It uses "S256" method for code challenge
	expect(u.searchParams.get('code_challenge_method')).toBe('S256');
});


// npx playwright test TESTS/e2e/tests/e2e-app-flow.test.ts --config TESTS/e2e/playwright.config.ts
