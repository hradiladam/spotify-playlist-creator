//src/pages/home/Home.tsx

import styles from "./Home.module.css";
import { login } from "@/auth/spotifyAuth";
import { SearchBar } from "@/components/SearchBar";
import { PlaylistComposer } from "@/components/PlaylistComposer";
import { useAuth } from "@/hooks/useAuth"; // ⟵ previously proposed auth hook (keeps Home lean)
import { useLocalPlaylist } from "@/hooks/useLocalPlaylist"; // ⟵ NEW: local playlist state
import * as api from "@/api/spotify";
import type { TrackSummary } from "@/api/spotify";


export const Home = () => {
	// ⟵ replace isAuthed/me state & effect with the hook:
	const { isAuthed, user, logout } = useAuth();

	// Local playlist (lives for the session until user saves or discards)
	// - Holds temporary playlist name and track URIs until user saves to Spotify.
	// - Adds simple duplicate protection and a counter for saved songs.
	const local = useLocalPlaylist();

	// Friendly label for the user (prefer display_name, then email, then id)
	const userLabel = user?.display_name || user?.email || (user ? user.id : "");

	// Save local playlist to Spotify (create + add tracks)
	const handleSaveToSpotify = async () => {
		try {
			if (!user?.id) {
				alert("You must be logged in to save playlist to Spotify.");
				return;
			}
			if (!local.isCreated || !local.name.trim()) {
				alert("No local playlist to save.");
				return;
			}
			// Create remote Spotify playlist
			const created = await api.createPlaylist(user.id, local.name);
			// Append local tracks (if any)
			if (local.trackUris.length) {
				await api.addTracksToPlaylist(created.id, local.trackUris);
			}
			alert("Playlist saved to Spotify.");
			// Keep local as-is so user can continue adding or discard manually

		} catch (err: unknown) {
			console.error(err);
			const message = err instanceof Error ? err.message : String(err);
			alert(message || "Failed to save playlist to Spotify.");
		}
	};

	// Save track from search results into local playlist
	const handleSaveTrackFromResults = (track: TrackSummary) => {
		const result = local.addTrack(track);
		if (!result.ok && result.reason === "no-playlist") {
			alert("Create a local playlist first to save tracks.");
		}
	};

	return (
		<div className={styles.page}>
			{/* Top header always visible */}
			<header className={styles.header}>
				<h1 className={styles.title}>Spotify Playlist Creator</h1>
				{/* "Logged-in as ..." shown only when we know who you are */}
				{isAuthed && userLabel && (
					<>
						<div className={styles.user}>Logged-in as: {userLabel}</div>
						<button className={styles.logoutButton} onClick={logout}>
							<i className="fas fa-power-off"></i>
							Log out
						</button>
					</>
				)}
			</header>

			{/* Main content area: either login box (before auth) or search bar (after auth) */}
			<main className={styles.content}>
				{!isAuthed ? (
					<div className={styles.loginBox}>
						<p>
							Login with Spotify to start searching songs, creating playlists,
							and managing your library.
						</p>
						<button className={styles.loginButton} onClick={login}>
							Login with Spotify
						</button>
					</div>
				) : (
					<>
						{/* Search bar component for song search */}
						{/* Pass a callback so each result row can save to the local playlist */}
						<SearchBar onSaveTrack={handleSaveTrackFromResults} />

						{/* If user is not null, use its id -> render PlaylistComposer only when we have a real user id */}
						<PlaylistComposer
							userId={user?.id ?? ""}

							// Local playlist integration
							isCreated={local.isCreated}
							localName={local.name}
							localCount={local.count}
							onCreateLocal={(name) => {
								if (!local.create(name)) alert("Please enter a valid playlist name.");
							}}
							onDeleteLocal={local.discard}	// Confirmation handled in PlaylistComposer
							onSaveToSpotify={handleSaveToSpotify}
						/>
					</>
				)}
			</main>
		</div>
	);
};
