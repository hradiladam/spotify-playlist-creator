// FRONTEND/src/pages/home/Home.tsx

import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import { login, getAccessToken, logout } from "@/auth/spotifyAuth";
import { getCurrentUser, type UserProfile } from "@/api/spotify";
import { SearchBar } from "@/components/SearchBar";
import { PlaylistComposer } from "@/components/PlaylistComposer";

export const Home = () => {
	// Track whether we currently have a valid access token.
	const [isAuthed, setIsAuthed] = useState<boolean>(false);

	// Logged-in user profile → for "Logged-in as ..."
	const [me, setMe] = useState<UserProfile | null>(null);

	// On mount, check if we already have a valid token and, if so, load the profile.
	useEffect(() => {
		(async () => {
			const token = await getAccessToken();
			if (!token) {
				setIsAuthed(false);
				setMe(null);
				return;
			}
			setIsAuthed(true);
			try {
				const profile = await getCurrentUser();
				setMe(profile);
			} catch {
				// If /me fails for any reason, fall back to just being "authed"
				// without a name (UI will hide the name line automatically).
			}
		})();
	}, []);

	// Friendly label for the user (prefer display_name, then email, then id)
	const userLabel =
		me?.display_name || me?.email || (me ? me.id : "");

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
						<SearchBar />

						{/* If me is not null, use its id -> render PLaylistComposer only when we have a real user id */}
						<PlaylistComposer userId={me?.id ?? ""} />	
					</>
				)}
			</main>
		</div>
	);
};
