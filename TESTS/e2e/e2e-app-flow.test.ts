// TESTS/e2e/e2e-app-flow.test.ts

import { test, expect } from '@playwright/test';
import { seedLoggedInSession } from './helpers/e2e-auth';
import { stubMe, stubSearchTracks, stubCreatePlaylist, stubAddTracks } from './helpers/stubs';
import { HomePage } from './pages/HomePage';


test('full flow: search → create → add track → save to Spotify', async ({ page }) => {
    // 1) network stubs
	await stubMe(page);
	await stubSearchTracks(page);
	await stubCreatePlaylist(page);
	await stubAddTracks(page);

    // 2) fake login + open app
	await seedLoggedInSession(page);
	const home = new HomePage(page);
	await home.goto();
	await page.waitForLoadState('networkidle');
	await home.assertLoggedInUI();

	// 3) create local playlist
	await home.createPlaylist('My new mix');

    // 4) search (debounced)
	await home.search('Songs');
	await expect(home.addTrackToPlaylistButtons).toHaveCount(4);

	// 5) add first track to local playlist
	await home.addFirstTrackToPlaylist();
	await expect.poll(async () => home.savedCount()).toBe(1);

	// 6) save to Spotify (happy path)
	const alertText = await home.saveToSpotifyAndGetAlert();
	expect(alertText.toLowerCase()).toMatch(/playlist saved to spotify/);
});


// npx playwright test TESTS/e2e/e2e-app-flow.test.ts --config TESTS/e2e/playwright.config.ts
