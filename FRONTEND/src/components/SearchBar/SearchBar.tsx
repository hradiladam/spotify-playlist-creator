// React component for searching Spotify tracks (top 4 results).
// Uses searchTracksTop4() from our Spotify API client.
// NOTE: We now return TOP 4 results (kept function name for compatibility).

import styles from './SearchBar.module.css';	// Import CSS module
import { TrackList } from '@/components/TrackList'; // ⟵ use barrel directly
import { useSpotifySearch } from '@/hooks/useSpotifySearch'; // ⟵ extracted logic hook


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
	// (moved: input state, debounce, async search, cancellation, errors)
	const { query, setQuery, results, loading, error, clear } = useSpotifySearch("", 400);

	// ---------------- Render ----------------
	return (
		<div className={styles.container}>
			{/* Input box with clear button */}
			<div className={styles.inputWrapper}>
				<input
					className={styles.input}
					placeholder="Search tracks..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				{query && (
					<button
						type="button"
						className={styles.clearButton}
						onClick={clear}
					>
						<i className="fas fa-times"></i>
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
