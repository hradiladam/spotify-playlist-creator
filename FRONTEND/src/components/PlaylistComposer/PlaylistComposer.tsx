// FRONTEND/src/components/PlaylistComposer/PlaylistComposer.tsx

/**
 * --- Component for creating and deleting a custom playlists ---
 * This component is used to create a new playlist, save it locally, and manage its state.
 * It also provides options to save the playlist to Spotify or delete it.
 * In the future, it may include features like editing the playlist name or adding/removing tracks.
 */

import { useState } from "react";
import styles from "./PlaylistComposer.module.css";

type Props = {
	userId?: string | null; // Optional user ID, used to create playlists for the logged-in user

	// Local playlist integration, used to manage a custom playlist that is not saved to Spotify
	isCreated?: boolean;						// Tells PlaylistComposer whether a local playlist already exists, true once a local playlist exists; controls which UI to show
	localName?: string;							// Display name of the local playlist
	localCount?: number;						// The number of tracks in the local playlist
	onCreateLocal?: (name: string) => void;		// Called when user saves the name to create the local playlist
	onDeleteLocal?: () => void;					// Called after user confirms delete to discard the local playlist
	onSaveToSpotify?: () => void;				// Called when user clicks "Save to Spotify" (parent does API work)
};

// Playlist creation form
export const PlaylistComposer = ({
	isCreated = false,
	localName = "",
	localCount = 0,
	onCreateLocal,
	onDeleteLocal,
	onSaveToSpotify,
}: Props) => {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [playlistName, setPlaylistName] = useState("");

	// Triggered when user clicks "Add new playlist"
	const handleCreatePlaylistClick = () => {
		setShowCreateForm(true);
		setPlaylistName("");	// Resets the playlist name input
	};

	// Triggered when user clicks "Save playlist" (LOCAL only)
	const handleSaveLocal = async () => {
		// Don't allow empty names
		if (!playlistName.trim()) {
			alert("Please enter a valid playlist name.");
			return;
		}
		onCreateLocal?.(playlistName.trim());
		setShowCreateForm(false);
	};

	return (
		<div className={styles.playlistArea}>
			{/* Default state → show Add playlist button if no playlist exists and form is hidden */}
			{(!isCreated && !showCreateForm) ? (
				<button className={styles.primaryButton} onClick={handleCreatePlaylistClick}>
					Add new playlist
				</button>
			) : null}

			{(!isCreated && showCreateForm) ? (
				<div className={styles.createBox}>
					<div className={styles.inputWrapper}>
						<input
							className={styles.playlistNameInput}
							placeholder="Type playlist name..."
							value={playlistName}
							onChange={(e) => setPlaylistName(e.target.value)}
						/>
						{/* Clear button inside input */}
						<button
							type="button"
							className={styles.clearButton}
							onClick={() => {
								setShowCreateForm(false);
								setPlaylistName("");
							}}
							aria-label="Clear playlist name"
						>
							<i className="fas fa-times fa-fw"></i>
						</button>
					</div>

					{/* Save locally (NOT to Spotify) */}
					<button className={styles.primaryButton} onClick={handleSaveLocal}>
						Save playlist
					</button>
				</div>
			) : null}

			{/* Created state → show playlist name, song counter, and action buttons */}
			{isCreated ? (
				<div className={styles.createdBox}>
					<div className={styles.createdTitle}>NEW PLAYLIST</div>
					<div className={styles.createdName}>{localName}</div>

					{/* Counter of saved songs */}
					<div className={styles.createdNote}>
						Saved songs: {localCount}
					</div>

					<div className={styles.actionsRow}>
						<button
							className={styles.primaryButton}
							onClick={() => onSaveToSpotify?.()}
						>
							Save to Spotify
						</button>
						<button
							className={styles.deleteButton}
							onClick={() => {
								// Ask for confirmation. If declined, do nothing (previous state remains).
								if (confirm("Delete local playlist? This cannot be undone.")) {
									onDeleteLocal?.();
								}
							}}
						>
							Delete playlist
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
};
