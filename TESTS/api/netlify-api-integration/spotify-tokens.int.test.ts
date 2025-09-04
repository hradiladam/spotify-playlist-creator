// TESTS/api/netlify-api-integration/spotify-tokens.int.test.ts
// @vitest-enironment node

// Integration tests for the Netlify Function that handles Spotify token exchange
//
// What we are testing:
//   - The Netlify function is our backend "bridge" between frontend and Spotify.
//   - It parses JSON input, builds form-urlencoded data, adds Authorization headers,
//     forwards the request to Spotify’s /api/token, and then returns Spotify’s response.
//
// Why integration (not unit) test:
//   - We don’t just test one helper, but the whole flow inside the function.
//   - Still: we don’t want to hit the real Spotify API in tests.
//   - Instead we use MSW (Mock Service Worker) in Node mode to “fake” Spotify.


import { beforeEach, describe, expect, test } from "vitest";
import { server } from '../../setup/setupApi';
import { http, HttpResponse } from "msw";

// Import the Netlify function handler directly
import { handler } from '../../../netlify/functions/spotify-token';


// Helper to invoke the function as Netlify would
async function callHandler(body: any) {
    const event = {
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    } as any;
    return handler(event, {} as any) as any;
}

// Save original env vars to restore after each test
const ORIGINAL_ENV = { ...process.env };


beforeEach(() => {
    // Ensure env vars are always set (otherwise handler returns 500)
    process.env.SPOTIFY_CLIENT_ID = "test_client_id";
    process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
});


afterEach(() => {
    // Reset env back to what it was before the test
    process.env = { ...ORIGINAL_ENV };
})


describe("Netlify Function: /api/spotify-token", () => {
    test("Exchanges authorization code for tokens (happy path)", async () => {
        // Stub Spotify’s /api/token endpoint
        server.use(
            http.post('https://accounts.spotify.com/api/token', async ({ request }) => {

                const text = await request.text();
                const params = new URLSearchParams(text);

                // Check that our handler forwarded the right fields
                expect(params.get('grant_type')).toBe('authorization_code');
                expect(params.get('code')).toBe('abc123');
                expect(params.get('redirect_uri')).toBe('http://localhost/callback'); // matches your handler
                expect(params.get('code_verifier')).toBe('verifier1');

                // Return fake spotify response
                // https://developer.spotify.com/documentation/web-api/tutorials/code-flow?utm_source=chatgpt.com
                // {
                //     "access_token": "NgCXRKc...MzYjw",
                //     "token_type": "Bearer",
                //     "scope": "user-read-private user-read-email",
                //     "expires_in": 3600,
                //     "refresh_token": "NgAagA...Um_SHo"
                // }
                return HttpResponse.json({
                    access_token: 'at-123',
                    refresh_token: 'rt-456',
                    expires_in: 3600,
                    token_type: 'Bearer',
                    scope: 'playlist-modify-public',
                });
            })
        );

        const response = await callHandler({   
            grant_type: 'authorization_code',
            code: 'abc123',
            redirect_uri: 'http://localhost/callback',
            code_verifier: 'verifier1',
        });

        if (response.statusCode !== 200) {
            console.error('Handler error:', response.body);
        }

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.access_token).toBe('at-123');
        expect(body.refresh_token).toBe('rt-456');
        expect(body.expires_in).toBe(3600);
        expect(body.token_type).toBe('Bearer');
        expect(body.scope).toBe('playlist-modify-public');
    });

    test('exchanges refresh_token for new access_token', async () => {
        server.use(
            http.post('https://accounts.spotify.com/api/token', async ({ request }) => {
                const params = new URLSearchParams(await request.text());
                expect(params.get('grant_type')).toBe('refresh_token');
                expect(params.get('refresh_token')).toBe('old-refresh');

                return HttpResponse.json({
                    access_token: 'at-NEW',
                    token_type: 'Bearer',
                    expires_in: 3600,
                });
            })
        );

        const response = await callHandler({
            grant_type: 'refresh_token',
            refresh_token: 'old-refresh',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.access_token).toBe('at-NEW');
    });

    test('returns 400 on invalid grant_type', async () => {
		const res = await callHandler({ grant_type: 'invalid_type' });
		expect(res.statusCode).toBe(400);
		expect(res.body).toMatch(/Invalid grant type/);
	});

    test('returns 400 when required fields are missing in authorization_code flow', async () => {
        const res = await callHandler({
            grant_type: 'authorization_code',
            code: 'abc123',
            // redirect_uri missing
            code_verifier: 'verifier1',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toMatch(/Missing code, redirect_uri, or code_verifier/);
    });

    test('returns 500 if env vars are missing', async () => {
		delete process.env.SPOTIFY_CLIENT_ID;
		delete process.env.SPOTIFY_CLIENT_SECRET;

		const res = await callHandler({
			grant_type: 'refresh_token',
			refresh_token: 'rt1',
		});

		expect(res.statusCode).toBe(500);
		expect(res.body).toMatch(/Missing client ID or secret/);
	});
});

// npm run tests
// npx vitest --project api run TESTS/api/netlify-api-integration/spotify-tokens.int.test.ts