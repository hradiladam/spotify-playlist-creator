// src/api/spotify.ts
// Thin Spotify Web API client — Step 1: search top 5 tracks.
// Uses existing OAuth helper: getAccessToken()

import { getAccessToken } from "../auth/spotifyAuth";

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

// ---------- Feature: search top 5 tracks ----------

/**
 * Search Spotify for up to 5 tracks.
 * - Endpoint: GET /search?type=track&limit=5&q=<query>
 * - Returns a simplified TrackSummary[] for easy UI rendering.
 */
export const searchTracksTop5 = async (
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
  const url = `${API_BASE}/search?type=track&limit=5&q=${encodeURIComponent(
    queryCleaned
  )}`;

  // Fetch JSON response, typed to expected Spotify structure
  const data = await fetchJson<{ tracks: { items: any[] } }>(url, { headers });

  // Map raw Spotify track objects → simplified TrackSummary objects
  const trackItems = data.tracks?.items ?? [];

  return trackItems.map((track: any) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: (track.artists ?? []).map((a: any) => a.name).join(", "),
    duration_ms: track.duration_ms,
  }));
};