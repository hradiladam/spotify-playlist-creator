// src/auth/spotifyAuth.ts
// Spotify Authentication Module (OAuth 2.0 with PKCE)
//
// This file handles logging users into Spotify and managing their tokens.
//
// Why PKCE?
// - Normally, web apps would use a "client secret" to prove their identity.
// - In frontend apps, secrets can’t be hidden — users can see your code.
// - PKCE (Proof Key for Code Exchange) solves this by using a one-time
//   "code_verifier" that lives only in the browser session.
//
// Flow overview:
// login() → create code_verifier + challenge → save verifier → redirect to Spotify /authorize
// callback (/callback) → Spotify returns ?code → handleCallback() posts to Netlify /spotify-token with verifier
// Netlify fn → adds client_secret → exchanges code for {access, refresh, expires_in} → returns JSON
// handleCallback() → store access_token, refresh_token, expires_at in sessionStorage
// getAccessToken() → return token if valid, else refresh via Netlify, else null
// API calls → use "Authorization: Bearer <access_token>" (search, /me, playlists)
// logout() → clear sessionStorage keys → redirect home


// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { TokenResponse } from "@/types/spotify-types";


// ---------------------------------------------------------------------------
// Spotify constants
// ---------------------------------------------------------------------------

const AUTH_URL = "https://accounts.spotify.com/authorize"; // Universal login page

// Client ID comes from .env (safe to show, but NOT the secret)
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;

// Redirect URL (must exactly match Spotify dashboard)
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string;

// Backend endpoint to securely exchange "code" for real tokens
const TOKEN_ENDPOINT = import.meta.env.VITE_TOKEN_ENDPOINT as string;


// Debug log: confirm envs are loaded
console.log("[ENV CHECK] CLIENT_ID =", CLIENT_ID);
console.log("[ENV CHECK] REDIRECT_URI =", REDIRECT_URI);
console.log("[ENV CHECK] TOKEN_ENDPOINT =", TOKEN_ENDPOINT);

// Requested permissions (scopes)
const SCOPES = [
	"playlist-modify-private",
	"playlist-read-private",
	"playlist-read-collaborative",
	"user-library-read",
	"user-read-email",
	"user-read-private",
].join(" ");

// Keys used in sessionStorage to keep tokens/verifier across reloads
const KEYS = {
	codeVerifier: "spotify_pkce_code_verifier",
	accessToken: "spotify_access_token",
	refreshToken: "spotify_refresh_token",
	expiresAt: "spotify_expires_at",
};

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Convert raw bytes (ArrayBuffer) into a base64url string.
 * - Base64url is like Base64 but safe for URLs:
 *   "+" → "-", "/" → "_", remove "=" padding
 */
const toBase64Url = (buffer: ArrayBuffer): string => {
	const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/**
 * Hash a string with SHA-256, then encode it as base64url.
 * Used to create the PKCE "code_challenge".
 */
const sha256Base64Url = async (input: string): Promise<string> => {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return toBase64Url(digest);
};

/**
 * Generate a random string to use as the PKCE code_verifier.
 * - Length: 43–128 characters required by Spotify
 * - Uses characters safe for URLs
 */
const generateCodeVerifier = (length = 64): string => {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
};

/**
 * Helper to call our backend function to fetch tokens from Spotify.
 * Payload differs depending on grant_type:
 * - { grant_type: "authorization_code", code, redirect_uri, code_verifier, client_id }
 * - { grant_type: "refresh_token", refresh_token, client_id }
 */
const fetchToken = async (
	payload: Record<string, string>
): Promise<TokenResponse> => {
	const res = await fetch(TOKEN_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Token request failed (${res.status}): ${text}`);
	}

	return res.json() as Promise<TokenResponse>;
};

// ---------------------------------------------------------------------------
// Main auth functions
// ---------------------------------------------------------------------------

/**
 * Step 1: Start login process.
 * - Generate a random code_verifier and store it
 * - Hash it into a code_challenge
 * - Redirect to Spotify’s login with all required query params
 */
export const login = async (): Promise<void> => {
	const verifier = generateCodeVerifier();
	// Save PKCE verifier in session storage
	sessionStorage.setItem(KEYS.codeVerifier, verifier);

	const challenge = await sha256Base64Url(verifier);

	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		response_type: "code",
		redirect_uri: REDIRECT_URI,
		code_challenge_method: "S256",
		code_challenge: challenge,
		scope: SCOPES,
	});

	const authUrl = `${AUTH_URL}?${params.toString()}`;
	console.log("Redirecting to Spotify auth:", decodeURIComponent(authUrl));

	window.location.href = authUrl;
};


/**
 * Step 2: Handle Spotify’s callback.
 * - Extract ?code=... from URL
 * - Exchange it + the stored verifier for tokens
 * - Save tokens and expiry in sessionStorage
 */
export const handleCallback = async (url: string): Promise<boolean> => {
    console.log("[CALLBACK] origin =", location.origin);
    console.log("[CALLBACK] storage keys (session) =", Object.keys(sessionStorage));
    console.log("[CALLBACK] storage keys (local)   =", Object.keys(localStorage));

	const u = new URL(url);
	const code = u.searchParams.get("code");
	const error = u.searchParams.get("error");

	if (error) throw new Error(error);
	if (!code) return false; // nothing to do

	const verifier = sessionStorage.getItem(KEYS.codeVerifier);
	if (!verifier) throw new Error("Missing PKCE code_verifier in session");

	const tokenResponse = await fetchToken({
		grant_type: "authorization_code",
		code,
		redirect_uri: REDIRECT_URI,
		client_id: CLIENT_ID,
		code_verifier: verifier,
	});

	const now = Math.floor(Date.now() / 1000);

	sessionStorage.setItem(KEYS.accessToken, tokenResponse.access_token);
	if (tokenResponse.refresh_token) {
		sessionStorage.setItem(KEYS.refreshToken, tokenResponse.refresh_token);
	}
	
	sessionStorage.setItem(
		KEYS.expiresAt,
		String(now + tokenResponse.expires_in - 30) // subtract buffer
	);

	return true;
};

/**
 * Step 3: Get a valid access token.
 * - If still valid → return it
 * - If expired but refresh token exists → request new one
 * - If nothing exists → return null (user must log in again)
 */
export const getAccessToken = async (): Promise<string | null> => {
	const access = sessionStorage.getItem(KEYS.accessToken);
	const exp = Number(sessionStorage.getItem(KEYS.expiresAt) || 0);
	const now = Math.floor(Date.now() / 1000);

	// Case 1: Access token still valid
	if (access && now < exp) {
		return access;
	}

	// Case 2: Expired, try refresh
	const refresh = sessionStorage.getItem(KEYS.refreshToken);
	if (!refresh) return null;

	const tokenResponse = await fetchToken({
		grant_type: "refresh_token",
		refresh_token: refresh,
		client_id: CLIENT_ID,
	});

	const newNow = Math.floor(Date.now() / 1000);

	sessionStorage.setItem(KEYS.accessToken, tokenResponse.access_token);
	if (tokenResponse.refresh_token) {
		sessionStorage.setItem(KEYS.refreshToken, tokenResponse.refresh_token);
	}

	sessionStorage.setItem(
		KEYS.expiresAt,
		String(newNow + tokenResponse.expires_in - 30)
	);

	return tokenResponse.access_token as string;
};

/**
 * Step 4: Logout.
 * - Clear session storage
 * - Redirect back to homepage
 */
export const logout = (): void => {
	Object.values(KEYS).forEach((key) =>
		sessionStorage.removeItem(key)
	);
	window.location.href = "/";
};
