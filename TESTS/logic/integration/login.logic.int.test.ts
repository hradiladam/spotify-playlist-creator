// TESTS/logic/integration/login.logic.int.test.tsx
// @vitest-environment jsdom
// Why jsdom? These auth helpers need browser things like window.location and sessionStorage.

// What we’re testing (no React components here):
// - login(): makes a PKCE code_verifier, stores it, and "redirects" to Spotify’s /authorize
// - handleCallback(url): takes ?code from URL, calls our Netlify token endpoint, saves tokens
// - getAccessToken(): returns a valid token; if expired, refreshes it via our Netlify endpoint
// - getCurrentUser(): calls Spotify /me using the token (proves headers are correct)

import { describe, test, beforeEach, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup/setupDom';

// Helper: sets Vite env *before* importing modules (spotifyAuth reads env at import time),
// reset the module cache so imports re-run with our test env values,
// then import the real modules we’re testing.

const importAuthAndApi = async () => {
    // Constants for the endpoints we stub with MSW
	const auth = await import('@/auth/spotifyAuth'); // re-evaluates with our fake env
	const api = await import('@/api/spotify');
	return { auth, api };
};

const TOKEN_ENDPOINT = '/.netlify/functions/spotify-token';
const ME_ENDPOINT = 'https://api.spotify.com/v1/me';


describe('Login logic', () => {
	beforeEach(() => {
		// Start each test with a clean slate
		sessionStorage.clear();
	});

	// --- login() basic behavior ---
	test('login() stores PKCE verifier and redirects to Spotify /authorize', async () => {
		// In jsdom, navigating by setting window.location.href would throw an error.
		// We replace it with a writable object so we can "capture" the target URL.
		const originalLocation = window.location;
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...originalLocation, href: '' }, // this will hold the redirect URL
		});

		// Import auth with our env applied
		const auth = await import('@/auth/spotifyAuth');

		// Act: call login()
		await auth.login();

		// Assert: a PKCE verifier should be saved in this session
		const verifier = sessionStorage.getItem('spotify_pkce_code_verifier');
		expect(verifier).toBeTruthy();

		// Assert: we "redirected" to the right place with the right params
		const url = new URL(window.location.href);
		expect(url.origin).toBe('https://accounts.spotify.com');
		expect(url.pathname).toBe('/authorize');
		expect(url.searchParams.get('client_id')).toBe('test-client-id');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:8888/callback');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('code_challenge')).toBeTruthy(); // derived from verifier
		expect(url.searchParams.get('scope')).toMatch(/playlist-modify-private/);

		// Put window.location back the way it was
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: originalLocation,
		});
	});


	// --- handleCallback() happy path + call /me using saved token ---
	test('exchanges code → stores tokens → /me works', async () => {
		server.use(
			// Fake the Netlify token function returning a valid token set
			http.post(TOKEN_ENDPOINT, () =>
				HttpResponse.json({
					access_token: 'ACCESS',
					refresh_token: 'REFRESH',
					expires_in: 3600,
					token_type: 'Bearer',
					scope: 'user-read-email',
				}, { status: 200 })
			),

			// Fake Spotify /me: require Authorization: Bearer ACCESS
			http.get(ME_ENDPOINT, ({ request }) => {
				// Read the header; if missing, use '' so startsWith won't crash
				const authz = request.headers.get('authorization') || '';
				if (!authz.startsWith('Bearer ACCESS')) {
					return HttpResponse.json({ error: 'missing/bad auth' }, { status: 401 });
				}
				return HttpResponse.json({
					id: 'u1',
					display_name: 'Test User',
					email: 'test@example.com',
				});
			})
		);

		// handleCallback expects a PKCE verifier already in session (normally set by login())
		sessionStorage.setItem('spotify_pkce_code_verifier', 'verifier-123');

		const { auth, api } = await importAuthAndApi();

		// Pretend Spotify redirected us back with ?code=abc
		const ok = await auth.handleCallback('http://app.local/callback?code=abc');
		expect(ok).toBe(true);

		// Tokens should be saved by handleCallback
		expect(sessionStorage.getItem('spotify_access_token')).toBe('ACCESS');
		expect(sessionStorage.getItem('spotify_refresh_token')).toBe('REFRESH');

		// And the token should actually be used in a real API call
		const me = await api.getCurrentUser();
		expect(me.display_name).toBe('Test User');
	});


	// --- getAccessToken() refresh flow when access token is expired ---
	test('expired access token triggers refresh and uses new token', async () => {
		// Make storage look like the session is expired: old token + past expiry
		const nowSec = Math.floor(Date.now() / 1000);
		sessionStorage.setItem('spotify_access_token', 'OLD');
		sessionStorage.setItem('spotify_refresh_token', 'REFRESH');
		sessionStorage.setItem('spotify_expires_at', String(nowSec - 10)); // already expired

		// Fake the Netlify token function handling a refresh_token grant and returning a NEW token
		server.use(
			http.post(TOKEN_ENDPOINT, async ({ request }) => {
				const raw = await request.text();
				// The frontend posts JSON to our Netlify function; be tolerant and accept either JSON or form.
				const isJson = raw.trim().startsWith('{');

				const ok =
					(isJson && /"grant_type"\s*:\s*"refresh_token"/.test(raw)) ||
					(!isJson && raw.includes('grant_type=refresh_token'));
				if (!ok) {
					return HttpResponse.json({ error: 'wrong-grant' }, { status: 400 });
				}

				return HttpResponse.json({
					access_token: 'NEW',
					expires_in: 3600,
					token_type: 'Bearer',
				}, { status: 200 });
			}),

			// Spotify /me: now requires Bearer NEW
			http.get(ME_ENDPOINT, ({ request }) => {
				const authz = request.headers.get('authorization') || '';

				if (!authz.startsWith('Bearer NEW')) {
					return HttpResponse.json({ error: 'missing/bad auth' }, { status: 401 });
				}

				return HttpResponse.json({ id: 'u2', display_name: 'Refreshed User' }, { status: 200 });
			})
		);

		const { auth, api } = await importAuthAndApi();

		// Act: ask for a token. Since it's expired, code should refresh it via our stub.
		const token = await auth.getAccessToken();
		expect(token).toBe('NEW');

		// Assert: storage should contain the NEW token and a future expiry
		expect(sessionStorage.getItem('spotify_access_token')).toBe('NEW');
		const newExp = Number(sessionStorage.getItem('spotify_expires_at'));
		expect(newExp).toBeGreaterThan(nowSec);

		// And the new token should be used for API calls too
		const me = await api.getCurrentUser();
		expect(me.display_name).toBe('Refreshed User');
	});


    // --- ERROR CASE 1: no code in URL ---
	test('handleCallback() returns false if no code in URL', async () => {
		const { auth } = await importAuthAndApi();

		const wasHandled = await auth.handleCallback('http://app.local/callback');
		expect(wasHandled).toBe(false); // Nothing to do, nothing happens - minimal safe default
		expect(sessionStorage.getItem('spotify_access_token')).toBeNull();
	});


	// --- ERROR CASE 2: missing PKCE verifier ---
	test('handleCallback() throws if PKCE verifier is missing', async () => {
		const { auth } = await importAuthAndApi();

		await expect(
			auth.handleCallback('http://app.local/callback?code=abc')
		).rejects.toThrow(/Missing PKCE code_verifier/);

		expect(sessionStorage.getItem('spotify_access_token')).toBeNull();
	});


	// --- ERROR CASE 3: Spotify rejects code (invalid_grant) ---
	test('handleCallback() throws if Spotify returns invalid_grant', async () => {
		server.use(
			http.post(TOKEN_ENDPOINT, () =>
				HttpResponse.json(
					{ error: 'invalid_grant', error_description: 'Code expired' },
					{ status: 400 }
				)
			)
		);

		// Verifier is present, but the code is bad
		sessionStorage.setItem('spotify_pkce_code_verifier', 'verifier-123');

		const { auth } = await importAuthAndApi();

		await expect(
			auth.handleCallback('http://app.local/callback?code=bad')
		).rejects.toThrow(/Token request failed \(400\)/);

		// Tokens should NOT be saved
		expect(sessionStorage.getItem('spotify_access_token')).toBeNull();
	});
});


//   npm run test
//   npx vitest --project logic run TESTS/logic/integration/login.logic.int.test.ts