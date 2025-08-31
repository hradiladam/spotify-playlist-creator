// TESTS/e2e/helpers/stubs.ts
import type { Page, Route } from '@playwright/test';

const API = 'https://api.spotify.com/v1';

// helper to build a JSON response (no type collisions)
function makeJson(body: unknown, status = 200) {
	return {
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	};
}

// --- Current user profile ---
// Fake the GET /v1/me call
// The app asks Spotify "who am I?" after login
// We intercept it and return a fixed user object
export const stubMe = async (page: Page) => {
	// Catch requests to /me
	await page.route(`${API}/me`, async (route: Route) => {
		// Reply with fake user data instead of hitting Spotify
		await route.fulfill(
			makeJson({
				id: 'u1',
				display_name: 'Test User',
				email: 'test@example.com', // optional
			})
		);
	});
}


// --- Search tracks ---
// Fake GET /v1/search requests
// NOTE: use "**" so it matches /search plus any query params (?q=...&type=track)
export const stubSearchTracks = async (page: Page) => {
    await page.route(`${API}/search**`, async (route: Route) => {
        await route.fulfill(
            makeJson({
                tracks: {
                    items: [
                        { id: 't1', uri: 'spotify:track:t1', name: 'Song 1', duration_ms: 123000, artists: [{ name: 'A' }] },
						{ id: 't2', uri: 'spotify:track:t2', name: 'Song 2', duration_ms: 156000, artists: [{ name: 'B' }] },
						{ id: 't3', uri: 'spotify:track:t3', name: 'Song 3', duration_ms: 181000, artists: [{ name: 'C' }] },
						{ id: 't4', uri: 'spotify:track:t4', name: 'Song 4', duration_ms: 200000, artists: [{ name: 'D' }] },
                    ]
                }
            })
        )
    })
}


// --- Create playlist ---
// Intercepts POST /v1/users/:id/playlists
export async function stubCreatePlaylist(page: Page, playlistId = 'pl1') {
	await page.route(`${API}/users/**/playlists`, async (route: Route) => {
		await route.fulfill(makeJson({ id: playlistId }, 201));     // POST /users/{user_id}/playlists → 201 Created on success
    })
}


// --- Add tracks to the playlist ---
// Intercepts POST /v1/playlists/:id/tracks
export const stubAddTracks = async (page: Page) => {
	await page.route(`${API}/playlists/**/tracks`, async (route: Route) => {
		await route.fulfill({ status: 201, body: '' });
    })
}


// --- Error: Create playlist failed ---
export async function stubCreatePlaylistFail(page: Page) {
	await page.route(`${API}/users/**/playlists`, async (route: Route) => {
		await route.fulfill({ status: 400, body: 'bad name' });
	});
}


// --- Error: Add tracks to the playlist failed ---
export async function stubAddTracksFail(page: Page) {
	await page.route(`${API}/playlists/**/tracks`, async (route: Route) => {
		await route.fulfill({ status: 400, body: 'could not add tracks' });
	});
}