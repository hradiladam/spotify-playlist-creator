//src/hooks/useSpotifySearch.ts

// React hook for searching Spotify tracks (top 4 results).
// Uses searchTracksTop4() from our Spotify API client.
// NOTE: We now return TOP 4 results (kept function name for compatibility).

import { useEffect, useState, useCallback } from "react";
import { searchTracksTop4, type TrackSummary } from "@/api/spotify";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// ---------- Main Hook ----------
//
// - Input field text ("query") lives here now.
// - Calls Spotify API (searchTracksTop4).
// - Exposes top 4 track results (song + artists).
// NOTE: We actually show top 4.

export const useSpotifySearch = (initialQuery = "", delayMs = 400) => {
	// ---------------- State ----------------
	const [query, setQuery] = useState(initialQuery);	// Text typed by user
	const [results, setResults] = useState<TrackSummary[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Wrap query in debounce so we only search after the user stops typing
	const debouncedQuery = useDebouncedValue(query, delayMs);

	// ---------------- Side Effect ----------------
	// Whenever the debounced query changes, run a search
	useEffect(() => {
		// Flag to avoid updating state if request is outdated
		let cancelled = false; // so stale requests don’t overwrite state

		const runSearch = async () => {
			// Empty query (or only spaces) → clear results, skip API
			if (!debouncedQuery.trim()) {
				setResults([]);
				setError(null);       // clear any prior error
				setLoading(false);    // ensure loading is off
				return;
			}

			// Start loading
			setLoading(true);
			setError(null);

			try {
				// Call our API client to search top 4 tracks
				const tracks = await searchTracksTop4(debouncedQuery);

				// Only update if request is still valid (not cancelled)
				if (!cancelled) setResults(tracks);

			} catch (err: any) {
				// Show error message if something goes wrong (network / API issue)
				if (!cancelled) setError(err.message ?? "Unknown error");
				
				// Ensure loading is off
				if (!cancelled) setLoading(false);
			} finally {
				// Hide spinner once request finishes
				if (!cancelled) setLoading(false);
			}
		};

		void runSearch();

		// Cleanup: if user types again quickly, cancel the old request
		return () => { cancelled = true; };
	}, [debouncedQuery]);

	const clear = useCallback(() => {
		setQuery("");
		setResults([]);
		setError(null);
		setLoading(false);
	}, []);

	return { query, setQuery, results, loading, error, clear };
};
