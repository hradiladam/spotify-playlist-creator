// src/api/spotify.ts
// Thin Spotify Web API client
// - Adds auth headers via getAccessToken()
// - Provides helpers for fetch + error handling
// - Validates responses with zod
// - Exposes simplified functions:
//   • searchTracksTop4      → search tracks, return top 4 summaries
//   • createPlaylist        → create playlist for a user
//   • deletePlaylist        → "unfollow" (delete) playlist
//   • getCurrentUser        → fetch current user profile
//   • addTracksToPlaylist   → add tracks by URI


import { getAccessToken } from "@/auth/spotifyAuth";
import { z } from "zod";

const API_BASE = "https://api.spotify.com/v1";

// ---------- Helpers ----------

/**
 * Build Authorization header for Spotify API requests.
 * Always uses a fresh token from getAccessToken().
 * Throws if no token is available (user not logged in).
 */
const buildAuthHeaders = async (): Promise<HeadersInit> => {
	const token = await getAccessToken();
	if (!token) {
		throw new Error("Missing or invalid Spotify access token");
	}
	return { Authorization: `Bearer ${token}` };
};

/**
 * Fetch JSON from an API endpoint with improved error handling.
 * - Returns parsed JSON on success
 * - On error, includes HTTP status and response text for debugging
 */
const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(url, init);

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`HTTP ${response.status} ${response.statusText} — ${errorText}`
		);
	}

	const responseJson = (await response.json()) as T;
	return responseJson;
};

// ---------- Data shapes exposed to the UI ----------

/**
 * Simplified track model for rendering in UI.
 * Matches Spotify’s typical display:
 * - Song title
 * - Artists (comma-separated string)
 * - Duration (ms → can be shown as m:ss in UI)
 */
export type TrackSummary = {
	id: string;
	uri: string;
	name: string;
	artists: string;
	duration_ms: number;
};

/** Minimal shape of the current user profile for "Logged-in as ..." */
export type UserProfile = {
	id: string;
	display_name: string;
	email?: string;
	images?: Array<{ url: string }>;
};

// ---------- Zod schemas (minimal) ----------

const zArtist = z.object({
	name: z.string(),
});

const zTrackItem = z.object({
	id: z.string(),
	uri: z.string(),
	name: z.string(),
	artists: z.array(zArtist).default([]),
	duration_ms: z.number(),
});

const zSearchTracksResponse = z.object({
	tracks: z.object({
		items: z.array(zTrackItem).default([]),
	}).default({ items: [] }),
});

const zUserProfile = z.object({
	id: z.string(),
	display_name: z.string(),
	email: z.string().optional(),
	images: z.array(z.object({ url: z.string().url() })).optional(),
});

// ---------- Feature: search top 4 tracks ----------

/**
 * Search Spotify for up to 4 tracks.
 * - Endpoint: GET /search?type=track&limit=4&q=<query>
 * - Returns a simplified TrackSummary[] for easy UI rendering.
 * NOTE: We actually ask for more (limit=10) and then take the first 4.
 *       This ensures you almost always get 4 results if Spotify has them.
 */
export const searchTracksTop4 = async (query: string): Promise<TrackSummary[]> => {
	// Clean up input: trim spaces
	const queryCleaned = query.trim();

	// If input is empty, skip API call
	if (!queryCleaned) {
		return [];
	}

	// Build Authorization header
	const headers = await buildAuthHeaders();

	// encodeURIComponent() → built-in JS function to safely put user input in URL
	// Ask for more than 4, then slice to 4 locally
	const url = `${API_BASE}/search?type=track&limit=10&q=${encodeURIComponent(
		queryCleaned
	)}`;

	// Fetch JSON response, typed to expected Spotify structure
	const raw = await fetchJson<unknown>(url, { headers });

	// Validate & shape with zod (no runtime surprises)
	const parsed = zSearchTracksResponse.parse(raw);
	const trackItems = parsed.tracks.items;

	return trackItems.slice(0, 4).map((track) => ({
		id: track.id,
		uri: track.uri,
		name: track.name,
		artists: track.artists.map((a) => a.name).join(", "),
		duration_ms: track.duration_ms,
	}));
};

//---------- Feature: create & delete playlist ----------

/**
 * createPlaylist(userId, name)
 * - POST /users/{user_id}/playlists (spotify for developers documentation)
 * - Returns minimal info (id, name)
 *
 * deletePlaylist(playlistId)
 * - DELETE /playlists/{playlist_id}/followers (spotify for developers documentation)
 * - Removes the playlist from the user's account (Spotify's "delete")
 */

export type NewPlaylist= { id: string; name:string};

export const createPlaylist = async (userId: string, name: string): Promise<NewPlaylist> => {
	// Get headers with access token so Spotify knows who we are
	const headers = await buildAuthHeaders();

	// Tell Spotify "create a new playlist for this user"
	const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/playlists`, {
		method: "POST",		// POST = create something new
		headers: {
			...headers,		// include the auth header (Authorization: Bearer <token>) from buildAuthHeaders()
			"Content-Type": "application/json",	// we send JSON data
		},
		body: JSON.stringify({
			name,
			public: false
		})
	});

	// If Spotify says it failed, throw an error so UI can show a message
	if (!response.ok) {
		throw new Error(`Failed to create playlist: ${response.statusText}`);
	}

	// If it worked, Spotify sends back the full playlist object
	const data = await response.json();

	// We only care about id and name
	return { id: data.id, name: data.name as string };
};

export const deletePlaylist = async (playlistId: string): Promise<void> => {
	// Get headers with access token again
	const headers = await buildAuthHeaders();

	// Tell Spotify: "remove this playlist from my account"
	// Note: Spotify doesn’t let you *really* delete a playlist.
	// Instead, you "unfollow" it, which removes it from your library.
	const response = await fetch(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}/followers`, {
		method: "DELETE",
		headers,
	});

	if (!response.ok) {
		throw new Error(`Failed to delete playlist: ${response.statusText}`);
	}
};

/** Get the current user's profile (for "Logged-in as ...") */
export const getCurrentUser = async (): Promise<UserProfile> => {
	const headers = await buildAuthHeaders();
	const raw = await fetchJson<unknown>(`${API_BASE}/me`, { headers });
	const parsed = zUserProfile.parse(raw);
	return parsed;
};

// ---------- Feature: add tracks to a playlist ----------
//
// POST /playlists/{playlist_id}/tracks
// Accepts array of track URIs and appends them to the playlist.

export const addTracksToPlaylist = async (playlistId: string, uris: string[]): Promise<void> => {
	if (!uris.length) return;  // No tracks to add in
	const headers = await buildAuthHeaders();
	const response = await fetch(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ uris }),
	});

	if (!response.ok) {
		const txt = await response.text().catch(() => "");
		throw new Error(`Failed to add tracks: ${response.statusText} — ${txt}`);
	}
};
