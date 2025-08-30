// TESTS/api/api-integration/spotify.api-int.test.ts
// @vitest-environment node
//
// Integration tests for src/api/spotify.ts (our Spotify Web API client).
// - Default MSW handlers give us happy-path responses.
// - For error/edge cases we override handlers with server.use().
// - Only getAccessToken() is mocked.
// - We call the real searchTracksTop4() function
// - It uses fetchJson() internally, which calls the real fetch()
// - MSW intercepts the fetch() and returns a fake server response
// - The zod schema runs for real and validates/parses the payload


import { describe, test, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup/setupApi';


// Mock ONLY the token supplier so we always send Authorization headers.
vi.mock('@/auth/spotifyAuth', () => ({
	getAccessToken: vi.fn().mockResolvedValue('test-token'),
}));


// Import API client functions
import {
	searchTracksTop4,
	getCurrentUser,
	createPlaylist,
	addTracksToPlaylist,
	deletePlaylist,
} from '@/api/spotify';


describe('spotify.ts integration', () => {
	// Check that searchTracksTop4 really talks to MSW,
	// parses the JSON, and gives us 4 tracks in the right shape.
	test('searchTracksTop4 returns 4 tracks with mapped fields', async () => {
		// default handler already stubs /search with 4 items
		const results = await searchTracksTop4('hello');

		expect(results).toHaveLength(4);
		expect(results[0]).toMatchObject({
			id: 't1',
			uri: 'spotify:track:1',
			name: 'Song 1',
			artists: 'Abc',
			duration_ms: 123000,
		});
	});

	// A full "happy flow": first get the user,
	// then create a playlist for that user, then add tracks into it.
	test('getCurrentUser, createPlaylist, and addTracksToPlaylist work together (happy flow)', async () => {
		// /me → should return fake user from handler
		const me = await getCurrentUser();
		expect(me).toMatchObject({ id: 'u1', display_name: 'Test User' });

		// create playlist for u1 → handler returns pl1
		const playlist = await createPlaylist(me.id, 'My Mix');
		expect(playlist).toMatchObject({ id: 'pl1', name: 'My Mix' });

		// add tracks to pl1 → handler returns snapshot; client resolves void
		await expect(
			addTracksToPlaylist(playlist.id, ['spotify:track:1', 'spotify:track:2'])
		).resolves.toBeUndefined();
	});

	// Simulate token expiration (401) and check that
	// our client surfaces it as an error instead of swallowing it.
	test('searchTracksTop4 throws when token is expired (401)', async () => {
		// override to return 401
		server.use(
			http.get('https://api.spotify.com/v1/search', () =>
				HttpResponse.json({ error: { status: 401, message: 'Token expired' } }, { status: 401 })
			)
		);

		await expect(searchTracksTop4('x')).rejects.toThrow(/401|Token expired/i);
	});

	// Give back broken JSON (id is null) and check that
	// the zod schema complains instead of letting bad data through.
	test('searchTracksTop4 throws when payload is invalid (zod rejects)', async () => {
		// override to send malformed JSON
		server.use(
			http.get('https://api.spotify.com/v1/search', () =>
				HttpResponse.json({ tracks: { items: [{ id: null }] } }, { status: 200 })
			)
		);

		await expect(searchTracksTop4('x')).rejects.toThrow(/Invalid|parse|zod/i);
	});

	// Try creating a playlist with the wrong user ID,
	// expect our client to reject with an error message.
	test('createPlaylist fails if wrong user id is used', async () => {
		// default handler rejects POST /users/:id/playlists when id !== 'u1'
		await expect(
			createPlaylist('u2', 'Other')
		).rejects.toThrow(/Failed to create playlist|Bad Request|wrong user|400/i);
	});

	// If Spotify fails while adding tracks (server error), we should reject with error.
	test('addTracksToPlaylist rejects when Spotify returns 500', async () => {
		// Make sure happy-path endpoints still work up to playlist creation
		const me = await getCurrentUser();
		expect(me.id).toBe('u1');
		const playlist = await createPlaylist(me.id, 'Temp Mix');
		expect(playlist.id).toBe('pl1');

		// Now simulate a server failure specifically on adding tracks
		server.use(
			http.post('https://api.spotify.com/v1/playlists/:id/tracks', () =>
				HttpResponse.json(
					{ error: { status: 500, message: 'Internal Server Error' } },
					{ status: 500 }
				)
			)
		);

		await expect(
			addTracksToPlaylist(playlist.id, ['spotify:track:1'])
		).rejects.toThrow(/add tracks|500|internal server error/i);
	});
});


// npm run tests
// npx vitest --project api run TESTS/api/api-integration/spotify.api-int.test.ts