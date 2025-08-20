// netlify/functions/spotify-token.ts
import type { Handler } from "@netlify/functions";

// Spotify endpoint that exchanges auth codes or refresh tokens for access tokens
const TOKEN_URL = "https://accounts.spotify.com/api/token";

// --- Main Netlify Function ---
// This function acts as a "middleman" between our frontend and Spotify,
// because the frontend cannot safely hold the CLIENT_SECRET.
// Instead, the frontend sends us a small payload (grant_type, code, etc.),
// and this function securely forwards the request to Spotify, adds secrets,
// and returns the tokens back to the frontend.
const handler: Handler = async (event) => {
	// Read env at request time, not at module load time
	// These must stay on the backend. Never expose CLIENT_SECRET to the browser.
	const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

	console.log("ENV CHECK (fn)", {
		hasId: !!SPOTIFY_CLIENT_ID,
		hasSecret: !!SPOTIFY_CLIENT_SECRET,
	});

	try {
		// Step 1: Parse the request body from frontend (JSON → JS object)
		// Example: { grant_type: "authorization_code", code: "...", redirect_uri: "...", code_verifier: "..." }
		// Or:      { grant_type: "refresh_token", refresh_token: "..." }
		const body = JSON.parse(event.body || "{}");

		// Step 2: Make sure backend secrets are loaded.
		// Without these, Spotify will reject our request.
		if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
			return { statusCode: 500, body: "Missing client ID or secret" };
		}

		// Step 3: Validate the grant_type is one of the two we support
		// - "authorization_code" (first-time login)
		// - "refresh_token" (renew access token when expired)
		const grant = body.grant_type as "authorization_code" | "refresh_token";
		if (grant !== "authorization_code" && grant !== "refresh_token") {
			return { statusCode: 400, body: "Invalid grant type" };
		}

		// Step 4: Build form data in the format Spotify expects.
		// Spotify does NOT accept JSON here, only "application/x-www-form-urlencoded".
		const params = new URLSearchParams();
		params.set("grant_type", grant);

		if (grant === "authorization_code") {
			// First-time login → exchange short-lived "code" for tokens
			if (!body.code || !body.redirect_uri || !body.code_verifier) {
				return {
					statusCode: 400,
					body: "Missing code, redirect_uri, or code_verifier",
				};
			}
			params.set("code", body.code);
			params.set("redirect_uri", body.redirect_uri);
			params.set("code_verifier", body.code_verifier);
		} else {
			// Refresh flow → use long-lived refresh_token to get a new access_token
			params.set("refresh_token", body.refresh_token);
		}

		// Step 5: Build the Authorization header.
		// Spotify requires client_id + client_secret combined into a Base64 string.
		// Example: "Basic ZTQ2...=="  (this identifies our app to Spotify)
		const basic = Buffer.from(
			`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
		).toString("base64");

		// Step 6: Send request to Spotify’s /api/token
		const res = await fetch(TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${basic}`,
			},
			body: params.toString(),
		});

		// Step 7: Parse Spotify’s JSON response.
		// Example success: { access_token, refresh_token, expires_in, token_type, scope }
		// Example error:   { error: "invalid_grant", error_description: "Code has expired" }
		const data = await res.json();

		// Step 8: Return response back to the frontend.
		// This allows the frontend to store the tokens in sessionStorage.
		return {
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		};
	} catch (error) {
		// If anything went wrong (bad JSON, network error, etc.), log and return 500
		console.error("Error in Spotify token handler:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ ok: false, error: (error as Error).message }),
		};
	}
};

export { handler };

// This Netlify function handles Spotify token requests securely.
