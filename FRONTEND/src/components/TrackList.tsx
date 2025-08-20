// FRONTEND/src/components/TrackList.tsx

// Presentational-only component that renders the list of tracks.
// Keeps SearchBar smaller and easier to test.
// Reuses the same visual styles you had before.

import styles from "./TrackList.module.css";
import { type TrackSummary } from "./../api/spotify";
import { msToMinSec } from "./../utils/format";

type Props = {
	tracks: TrackSummary[];
};

export const TrackList = ({ tracks }: Props) => {
	return (
		<div className={styles.results}>
			{tracks.map((track) => (
				<div key={track.id} className={styles.resultItem}>
					<div>
						<div className={styles.trackName}>{track.name}</div>
						<div className={styles.artists}>{track.artists}</div>
					</div>
					<div className={styles.duration}>
						{msToMinSec(track.duration_ms)}
					</div>
				</div>
			))}
		</div>
	);
};
