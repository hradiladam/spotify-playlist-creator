// TESTS/logic/unit/api/spotify.unit.test.ts
// @vitest-environment node

// Unit tests for src/api/spotify.ts (pure unit: mock getAccessToken + fetch; no MSW/DOM)

import {
  describe, test, expect, beforeEach, afterEach, vi, type Mock
} from 'vitest';
import { makeFetchResponse } from '../../../helpers/http';

// --- Mock dependencies BEFORE importing SUT ---
vi.mock('@/auth/spotifyAuth', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token'),
}));

import * as api from '@/api/spotify';
import { getAccessToken } from '@/auth/spotifyAuth';

let fetchSpy: any; // Vitest doesn't export SpyInstance type; keep it simple

describe('api/spotify.ts (unit, node)', () => {
    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch');
        fetchSpy.mockReset();
        vi.clearAllMocks();
        (getAccessToken as unknown as Mock).mockResolvedValue('fake-token');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    // -------- searchTracksTop4 --------
    describe('searchTracksTop4', () => {
        test('returns [] for empty/whitespace query (no fetch)', async () => {
            await expect(api.searchTracksTop4('')).resolves.toEqual([]);
            await expect(api.searchTracksTop4('   ')).resolves.toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        test('trims query, calls /search', async () => {
            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({ ok: true, json: { tracks: { items: [] } } })
            );

            await api.searchTracksTop4('  hello  ');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        test('builds correct search URL and authorization header', async () => {
            fetchSpy.mockResolvedValueOnce (
                makeFetchResponse({
                    ok: true,
                    json: {
                        tracks: {
                            items: [
                                { id: 't1', uri: 'spotify:track:t1', name: 'Song A', artists: [{ name: 'Adela' }], duration_ms: 1000 },
                            ]
                        }
                    }
                })
            );

            const response = await api.searchTracksTop4('My Song & Artist');

            // URL should include type, limit, and encoded query
            // encodeURIComponent("My Song & Artist") → "My%20Song%20%26%20Artist"
            const [url, init] = fetchSpy.mock.calls[0];
            expect(url).toBe('https://api.spotify.com/v1/search?type=track&limit=10&q=My%20Song%20%26%20Artist');

            // Authorization header should include Bearer token from getAccessToken()
            expect(init.headers.Authorization).toBe('Bearer fake-token');

            // Response should be shaped into TrackSummary[]
            expect(response).toEqual([
                { id: 't1', uri: 'spotify:track:t1', name: 'Song A', artists: 'Adela', duration_ms: 1000 },
            ]);
        })
    });


    // ---------- createPlaylist ----------
    describe('createPlaylist', () => {
        test('POSTs to /users/:id/playlists with JSON body and auth; returns {id,name}', async () => {  // ':' is convention for placeholder in test names
            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({ ok: true, json: { id: 'pl1', name: 'My Mix' } })
            );

            const out = await api.createPlaylist('user 123', 'My Mix');

            // URL-encoding of user id
            const [url, init] = fetchSpy.mock.calls[0];
            expect(url).toBe('https://api.spotify.com/v1/users/user%20123/playlists');
            expect(init.method).toBe('POST');
            expect(init.headers.Authorization).toMatch(/^Bearer /); // Includes token: don’t care what the token is, just that the header has the right format
            expect(init.headers['Content-Type']).toBe('application/json');
            expect(JSON.parse(init.body)).toEqual({ name: 'My Mix', public: false });

            expect(out).toEqual({ id: 'pl1', name: 'My Mix' });
        });

        test('non-OK throws error', async () => {
                fetchSpy.mockResolvedValueOnce(
                    makeFetchResponse({ ok: false, status: 400, statusText: 'Bad Request', text: 'invalid name' })
                );
            await expect(api.createPlaylist('x', 'y')).rejects.toThrow(/Failed to create playlist/);
        });
    });


    // ---------- getCurrentUser ----------
    describe('getCurrentUser', () => {
        test('GET /me; returns zod-validated minimal profile', async () => {
            const payload = {
                id: "id",
                display_name: 'Me',
                email: 'me@example.com',
                images: [{ url: 'https://img' }],
            };
            fetchSpy.mockResolvedValueOnce(makeFetchResponse({ ok: true, json: payload }));

            const me = await api.getCurrentUser();
            const [url, init] = fetchSpy.mock.calls[0];
            expect(url).toBe('https://api.spotify.com/v1/me');
            expect(init.headers.Authorization).toMatch(/^Bearer /);
            expect(me).toEqual(payload);
        });

        test('bad shape fails zod parse', async () => {
            fetchSpy.mockResolvedValueOnce(makeFetchResponse({ ok: true, json: { id: 123 } })); 
            await expect(api.getCurrentUser()).rejects.toThrow(); // zod error - Id must be a string to pass, number should throw
        });
    });

    // ---------- addTracksToPlaylist ----------
    describe('addTracksToPlaylist', () => {
        test('no-operation when uris is empty (no fetch)', async () => {
            await api.addTracksToPlaylist('pl', []);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        test('POSTs /playlists/:id/tracks with {uris}; auth + content-type', async () => {
            fetchSpy.mockResolvedValueOnce(makeFetchResponse({ ok: true, json: {} }));
            await api.addTracksToPlaylist('pl id', ['u1', 'u2']);

            const [url, init] = fetchSpy.mock.calls[0];
            expect(url).toBe('https://api.spotify.com/v1/playlists/pl%20id/tracks');
            expect(init.method).toBe('POST');
            expect(init.headers.Authorization).toMatch(/^Bearer /);
            expect(init.headers['Content-Type']).toBe('application/json');
            expect(JSON.parse(init.body)).toEqual({ uris: ['u1', 'u2'] });
        });

        test('non-OK includes status and body text in error', async () => {
            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({ ok: false, status: 400, statusText: 'Bad Request', text: 'bad uris' })
            );

            await expect(api.addTracksToPlaylist('pl', ['u1']))
                .rejects.toThrow(/Failed to add tracks: Bad Request — bad uris/);
        });
    });

    // ---------- auth header edge ----------
    describe('auth header edge cases', () => {
        test('missing token → throws error ', async () => {
            (getAccessToken as unknown as Mock).mockResolvedValueOnce(null);
            await expect(api.searchTracksTop4('x'))
                .rejects.toThrow(/Missing or invalid Spotify access token/);
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });
});


// npm run test
// npx vitest run TESTS/logic/unit/api/spotify.unit.test.ts

