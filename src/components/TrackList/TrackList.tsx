// src/components/TrackList/TrackList.tsx

// Presentational-only component that renders the list of tracks.
// Keeps SearchBar smaller and easier to test.
// Reuses the same visual styles you had before.

import styles from "./TrackList.module.css";
import { type TrackSummary } from "@/api/spotify";
import { msToMinSec } from "@/utils/format";

type Props = {
	tracks: TrackSummary[];
	onSaveTrack?: (track: TrackSummary) => void; // Allow saving to local playlist
};

// Presentational component for rendering a list of tracks
export const TrackList = ({ tracks, onSaveTrack }: Props) => {
	return (
		<div className={styles.results}>
			{tracks.map((track) => (
				<div key={track.id} className={styles.resultItem}>

					<div>
						<div className={styles.trackName}>{track.name}</div>
						<div className={styles.artists}>{track.artists}</div>
					</div>

					<div className={styles.actions}>
						<div className={styles.duration}>
							{msToMinSec(track.duration_ms)}
						</div>
						
						{/* Button next to duration that lets user save a song to the local playlist */}
						<button
							type="button"
							className={styles.saveBtn}
							onClick={() => onSaveTrack?.(track)}
							title="Save to local playlist"
						>
							Save
						</button>
					</div>

				</div>
			))}
		</div>
	);
};
