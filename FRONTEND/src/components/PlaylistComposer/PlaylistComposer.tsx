// FRONTEND/src/components/PlaylistComposer.tsx

// --- Component for creating and deleting a custom playlists ---

import { useState } from "react";
import styles from "./PlaylistComposer.module.css";
import * as api from "@/api/spotify";

type Props = {
	userId?: string | null; // Optional user ID, used to create playlists for the logged-in use
}

// Playlist creation form
export const PlaylistComposer = ({ userId }: Props) => {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [playlistName, setPlaylistName] = useState("");
	const [createdPlaylist, setCreatedPlaylist] = useState<{ id: string; name: string } | null>(null);

	// Triggered when user clicks "Add new playlist"
	const handleCreatePlaylistClick = () => {
		setShowCreateForm(true);
		setPlaylistName("");	// Resets the playlist name input
	};

	// Triggered when user clicks "Save playlist"
	const handleSavePlaylist = async () => {
		try {
			let ownerId = userId ?? null;
			if (!ownerId) {
				const user = await api.getCurrentUser().catch(() => null);	// Try to fetch the user profile, but return null instead of throwing if the call fails
				if (!user) {
					alert("Could not retrieve user information. Please re-login.");
					return;
				}
				ownerId = user.id;
			}

			// Don't allow empty names
			if (!playlistName.trim()) {
				alert("Please enter a valid playlist name.");
				return;
			}
			// Create the playlist via API in spotify.ts
			const newPlaylist = await api.createPlaylist(ownerId, playlistName);

			// Switch UI to created playlist mode
			setCreatedPlaylist(newPlaylist);
			setShowCreateForm(false);
		} catch (error: any) {
			console.error("Error creating playlist:", error);
			alert(error?.message ?? "Failed to create playlist.");
		}
	};

	// Triggered when user clicks "Delete playlist"
	const handleDeletePlaylist = async () => {
		if (!createdPlaylist) return;
		try {
			// Spotify 'deletes' (unfollows) playlist
			await api.deletePlaylist(createdPlaylist.id);

			// Reset UI state
			setShowCreateForm(false);
			setPlaylistName("");
			setCreatedPlaylist(null);
		} catch (error: any) {
			console.error(error);
			alert(error?.message ?? "Failed to delete playlist.");
		}
	};

	return (
		<div className={styles.playlistArea}>
			{/* Default state → show Add playlist button if no playlist exists and form is hidden */}
			{(!createdPlaylist && !showCreateForm) ? (
				<button className={styles.primaryButton} onClick={handleCreatePlaylistClick}>
					Add new playlist
				</button>
			) : null}

			{(!createdPlaylist && showCreateForm) ? (
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
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <button className={styles.primaryButton} onClick={handleSavePlaylist}>
                        Save playlist
                    </button>
                </div>
            ) : null}


			{/* Created state → show playlist name and delete option */}
			{createdPlaylist ? (
				<div className={styles.createdBox}>
					<div className={styles.createdTitle}>NEW PLAYLIST</div>
					<div className={styles.createdName}>{createdPlaylist.name}</div>
					<div className={styles.createdNote}>
						Playlist will be saved in users spotify account!
					</div>
					<button className={styles.deleteButton} onClick={handleDeletePlaylist}>
						Delete playlist
					</button>
				</div>
			) : null}
		</div>
	);
};
