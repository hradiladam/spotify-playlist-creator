// React component for searching Spotify tracks (top 4 results).
// Uses searchTracksTop4() from our Spotify API client.
// NOTE: We now return TOP 4 results (kept function name for compatibility).

import { useEffect, useState } from 'react';
import { searchTracksTop4, type TrackSummary } from '@/api/spotify';
import styles from './SearchBar.module.css';	// Import CSS module
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TrackList } from '@/components/TrackList'; // ⟵ use barrel directly


// ---------- Main Component ----------

/**
 * SearchBar
 * - Input field for typing a search query.
 * - Calls Spotify API (searchTracksTop4).
 * - Displays top 4 track results (song + artists).
 * NOTE: We actually show top 4.
 */
export const SearchBar = () => {
	// ---------------- State ----------------
	const [query, setQuery] = useState("");	// Text typed by user
	const [results, setResults] = useState<TrackSummary[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Wrap query in debounce so we only search after the user stops typing
	const debouncedQuery = useDebouncedValue(query, 400);

	// ---------------- Side Effect ----------------
	// Whenever the debounced query changes, run a search
	useEffect(() => {
		// Flag to avoid updating state if request is outdated
		let cancelled = false; // so stale requests don’t overwrite state

		const runSearch = async () => {
			// Empty query (or only spaces) → clear results, skip API
			if (!debouncedQuery.trim()) {
				setResults([]);
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
			} finally {
				// Hide spinner once request finishes
				if (!cancelled) setLoading(false);
			}
		};

		runSearch();

		// Cleanup: if user types again quickly, cancel the old request
		return () => { cancelled = true; };
	}, [debouncedQuery]);

	
	// ---------------- Render ----------------
return (
	<div className={styles.container}>
		{/* Input box with clear button */}
		<div className={styles.inputWrapper}>
			<input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Search for songs..."
				className={styles.input}
			/>
			{/* New clear button: shown only when there's text */}
			{query && (
				<button
					type="button"
					className={styles.clearButton}
					onClick={() => setQuery("")}
					aria-label="Clear search"
				>
					×
				</button>
			)}
		</div>

		{/* Reserve a fixed slot for status/error so layout doesn't jump */}
		<div className={styles.statusSlot}>
			{loading && <div className={styles.status}>Searching...</div>}
			{error && <div className={styles.error}>{error}</div>}
		</div>

		{/* Results list */}
		{/* Extracted into a presentational component to keep SearchBar focused on behavior */}
		{/* (UI remains the same; CSS classnames for the list live in TrackList.module.css) */}
		<TrackList tracks={results} />
	</div>
);
};
