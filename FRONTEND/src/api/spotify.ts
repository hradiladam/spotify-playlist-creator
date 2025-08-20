// src/api/spotify.ts
// Thin Spotify Web API client
//  — Step 1: search top 4 tracks
//  — Step 2: get current user profile


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
 * NOTE: We actually ask for limit=4 (top 4) to match your desired behavior,
 *       but we keep this comment block as-is and add this note.
 */
export const searchTracksTop4 = async (
	query: string
): Promise<TrackSummary[]> => {
	// Clean up input: trim spaces
	const queryCleaned = query.trim();

	// If input is empty, skip API call
	if (!queryCleaned) {
		return [];
	}

	// Build Authorization header
	const headers = await buildAuthHeaders();

	// encodeURIComponent() → built-in JS function to safely put user input in URL
	const url = `${API_BASE}/search?type=track&limit=4&q=${encodeURIComponent(
		queryCleaned
	)}`; // NOTE: limit=4 (top 4)

	// Fetch JSON response, typed to expected Spotify structure
	const raw = await fetchJson<unknown>(url, { headers });

	// Validate & shape with zod (no runtime surprises)
	const parsed = zSearchTracksResponse.parse(raw);
	const trackItems = parsed.tracks.items;

	return trackItems.map((track) => ({
		id: track.id,
		uri: track.uri,
		name: track.name,
		artists: track.artists.map((a) => a.name).join(", "),
		duration_ms: track.duration_ms,
	}));
};

/** Get the current user's profile (for "Logged-in as ...") */
export const getCurrentUser = async (): Promise<UserProfile> => {
	const headers = await buildAuthHeaders();
	const raw = await fetchJson<unknown>(`${API_BASE}/me`, { headers });
	const parsed = zUserProfile.parse(raw);
	return parsed;
};