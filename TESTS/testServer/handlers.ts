// TESTS/setup/testServer/handlers.ts

/**
 * Fake Spotify API endpoints for tests.
 * - Each handler defines what data to return when a specific API call is made.
 * - Lets us test features without calling the real Spotify servers.
 * - Used by msw.server.ts to respond to fetch() requests in Vitest.
 */


import { http, HttpResponse } from 'msw';

export const handlers = [
	// --- Search (default: 4 items) ---
	http.get('https://api.spotify.com/v1/search', () =>
		HttpResponse.json({
		tracks: {
			items: [
				{ id: 't1', uri: 'spotify:track:1', name: 'Song 1', artists: [{ name: 'Abc' }], duration_ms: 123000 },
				{ id: 't2', uri: 'spotify:track:2', name: 'Song 2', artists: [{ name: 'Bcd' }], duration_ms: 156000 },
				{ id: 't3', uri: 'spotify:track:3', name: 'Song 3', artists: [{ name: 'Cde' }], duration_ms: 181000 },
				{ id: 't4', uri: 'spotify:track:4', name: 'Song 4', artists: [{ name: 'Def' }], duration_ms: 200000 },
			],
		},
		})
	),

	// --- Current user (/me) ---
	http.get('https://api.spotify.com/v1/me', () =>
		HttpResponse.json({
			id: 'u1',
			display_name: 'Test User',
			email: 'user@example.com',
		})
	),

	// --- Create playlist ---
	http.post('https://api.spotify.com/v1/users/:id/playlists', ({ params }) => {
		const { id } = params as { id: string };
		if (id !== 'u1') return HttpResponse.text('wrong user', { status: 400 });
		return HttpResponse.json({ id: 'pl1', name: 'My Mix' }, { status: 201 });
	}),

	// --- Add tracks to playlist ---
	http.post('https://api.spotify.com/v1/playlists/:id/tracks', ({ params }) => {
		const { id } = params as { id: string };
		if (id !== 'pl1') return HttpResponse.text('not found', { status: 404 });
		return HttpResponse.json({ snapshot_id: 'snap-1' }, { status: 201 });
	}),
];