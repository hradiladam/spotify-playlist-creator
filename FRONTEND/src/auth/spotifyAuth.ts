// FRONTEND/src/auth/spotifyAuth.ts

/**
 * Spotify Authentication Module (OAuth 2.0 with PKCE)
 *
 * This file handles logging users into Spotify and managing their tokens.
 *
 * Why PKCE?
 * - Normally, web apps would use a "client secret" to prove their identity.
 * - But in frontend apps (React, etc.), secrets can’t be hidden — users can see your code.
 * - PKCE (Proof Key for Code Exchange) solves this by replacing the secret
 *   with a random "code_verifier" that only lives in the browser session.
 *
 * Flow (step by step):
 *
 * 1. login()
 *    - Create a random code_verifier.
 *    - Hash it into a code_challenge (SHA-256 → base64url).
 *    - Redirect the user to Spotify’s login page, including our challenge.
 *
 * 2. handleCallback()
 *    - After login, Spotify redirects back to /callback with a short-lived "code".
 *    - We exchange that code (plus the verifier) for tokens via a secure backend endpoint.
 *
 * 3. getAccessToken()
 *    - Whenever we call Spotify’s API, we need a valid access token.
 *    - If the token expired, we use the refresh token to get a new one.
 *
 * 4. logout()
 *    - Clear all session tokens and redirect back to home.
 *
 * In short:
 * login → redirect to Spotify → callback with code → exchange for tokens → use tokens → logout
 */


// Spotify’s universal login page.
// This is where users go to grant permission to our app.
const AUTH_URL = "https://accounts.spotify.com/authorize";

// Our app’s client ID (safe to show — but NOT the secret).
// Defined in .env file → exposed in frontend via Vite’s VITE_ prefix.
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;

// The redirect URL Spotify should send users back to after login.
// - Development: http://127.0.0.1:5173/callback
// - Production:  https://your-site.netlify.app/callback
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string;

// Backend endpoint to exchange the login "code" for real tokens.
// Why backend? Because this step requires the CLIENT_SECRET,
// which must never be exposed to the browser.
// Example (Netlify): "/.netlify/functions/spotify-token"
const TOKEN_FN = import.meta.env.VITE_TOKEN_ENDPOINT as string;

// A list of Spotify permissions ("scopes") we request for our app.
// Each scope grants access to specific features of the Spotify Web API:
//
// - playlist-modify-private     → create/edit private playlists
// - playlist-read-private       → view user’s private playlists
// - playlist-read-collaborative → view collaborative playlists
// - user-library-read           → view saved tracks/albums
// - user-read-email             → get user’s email (Spotify often requires this)
// - user-read-private           → get profile info (country, display name, etc.)
//
// Spotify expects this as a single space-separated string.
// We keep them in an array for readability, then join into one string.
const SCOPES = [
	"playlist-modify-private",
	"playlist-read-private",
	"playlist-read-collaborative",
	"user-library-read",
	"user-read-email",
	"user-read-private"
].join(" ");

// Keys for sessionStorage so we can keep track of auth details across reloads.
// These only live in the current browser session (not permanent like localStorage).
const K = {
	codeVerifier: "spotify_pkce_code_verifier", // random secret string we generate for PKCE
	accessToken: "spotify_access_token",        // short-lived token used in API requests
	refreshToken: "spotify_refresh_token",      // lets us renew accessToken without logging in again
	expiresAt: "spotify_expires_at",            // when the accessToken will expire (unix seconds)
};


// --- Utility Functions ---

/**
 * Convert raw bytes (ArrayBuffer) into a base64url string.
 *
 * Why? Spotify requires the PKCE challenge to be base64url-encoded.
 *
 * - Standard Base64 includes +, /, and = which aren’t safe in URLs.
 * - Base64url replaces them with -, _, and removes = padding.
 */
const b64url = (buf: ArrayBuffer) => {
	const s = btoa(String.fromCharCode(...new Uint8Array(buf))); // bytes → Base64
	return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // Base64 → Base64url
}

/**
 * Turn a string (our code_verifier) into a SHA-256 hash,
 * then encode it as base64url.
 *
 * Why? Spotify requires the PKCE "code_challenge".
 *
 * Flow:
 * 1. Turn string into bytes.
 * 2. Run SHA-256 → produces raw binary hash.
 * 3. Convert binary into base64url string with b64url().
 */
const sha256 = async (s: string) => {
	const data = new TextEncoder().encode(s); // step 1: string → bytes
	const dig = await crypto.subtle.digest("SHA-256", data); // step 2: SHA-256 hash
	return b64url(dig); // step 3: binary → base64url
}

/**
 * Generate a random string to use as the PKCE code_verifier.
 * - Must be hard to guess.
 * - Spotify requires length between 43–128 chars.
 */
const genVerifier = (n = 64) => {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	let out = "";

    // Generate n random characters from the allowed set
	for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
}

/**
 * Helper to call our backend (Netlify function) to fetch tokens.
 * - Payload: includes grant_type, code, refresh_token, etc.
 * - Returns: token JSON from Spotify (access_token, refresh_token, expires_in).
 */
const tokenFetch = async (payload: Record<string, string>) => {
	const res = await fetch(TOKEN_FN, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) throw new Error(`Token error ${res.status}`);
	return res.json();
}

// --- Main Auth Functions ---

/**
 * Step 1: Start login process.
 *
 * - Generate a random PKCE verifier, store in sessionStorage.
 * - Convert it into a challenge using SHA-256.
 * - Redirect the user to Spotify’s login page with all required params.
 */
export const login = async () => {
	const verifier = genVerifier();
	sessionStorage.setItem(K.codeVerifier, verifier);
	const challenge = await sha256(verifier);

	console.log("AUTH check", { CLIENT_ID, REDIRECT_URI }); // must match dashboard

	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		response_type: "code",
		redirect_uri: REDIRECT_URI,
		code_challenge_method: "S256",
		code_challenge: challenge,
		scope: SCOPES,
	});

	const authUrl = `${AUTH_URL}?${params.toString()}`;
	console.log("AUTH URL ->", decodeURIComponent(authUrl)); // paste this in browser to compare
	window.location.href = authUrl;
};

/**
 * Step 2: Handle Spotify’s callback after login.
 *
 * - Read ?code=... from the URL.
 * - Exchange that code (and our saved verifier) for access/refresh tokens.
 * - Save tokens in sessionStorage for later use.
 */
export const handleCallback = async (url: string) => {
	const u = new URL(url);
	const code = u.searchParams.get("code");   // success case
	const error = u.searchParams.get("error"); // error case
	if (error) throw new Error(error);
	if (!code) return false; // nothing to do

	// Grab our verifier from sessionStorage (must match what we sent earlier)
	const verifier = sessionStorage.getItem(K.codeVerifier);
	if (!verifier) throw new Error("Missing PKCE code_verifier");

	// Exchange code + verifier for tokens via backend
	const t = await tokenFetch({
		grant_type: "authorization_code",
		code,
		redirect_uri: REDIRECT_URI,
		client_id: CLIENT_ID,
		code_verifier: verifier,
	});

	// Save tokens + expiry time
	const now = Math.floor(Date.now() / 1000);
	sessionStorage.setItem(K.accessToken, t.access_token);
	if (t.refresh_token) sessionStorage.setItem(K.refreshToken, t.refresh_token);
	sessionStorage.setItem(K.expiresAt, String(now + t.expires_in - 30)); // subtract buffer
	return true;
}

/**
 * Step 3: Get a valid access token.
 *
 * - If we already have one that hasn’t expired → return it.
 * - Otherwise, if we have a refresh token → request a new access token.
 * - If no tokens exist → user needs to log in again.
 */
export const getAccessToken = async (): Promise<string | null> => {
	const access = sessionStorage.getItem(K.accessToken);
	const exp = Number(sessionStorage.getItem(K.expiresAt) || 0);
	const now = Math.floor(Date.now() / 1000);

	// Case 1: Access token still valid → reuse it
	if (access && now < exp) return access;

	// Case 2: Expired, but we have a refresh token → get new access token
	const refresh = sessionStorage.getItem(K.refreshToken);
	if (!refresh) return null;

	const t = await tokenFetch({
		grant_type: "refresh_token",
		refresh_token: refresh,
		client_id: CLIENT_ID,
	});

	// Save new tokens + expiry
	const newNow = Math.floor(Date.now() / 1000);
	sessionStorage.setItem(K.accessToken, t.access_token);
	if (t.refresh_token) sessionStorage.setItem(K.refreshToken, t.refresh_token);
	sessionStorage.setItem(K.expiresAt, String(newNow + t.expires_in - 30));

	return t.access_token as string;
}

/**
 * Step 4: Logout.
 *
 * - Remove all tokens from sessionStorage.
 * - Redirect back to homepage.
 */
export const logout = () => {
	Object.values(K).forEach((key) => sessionStorage.removeItem(key));
	window.location.href = "/";
}