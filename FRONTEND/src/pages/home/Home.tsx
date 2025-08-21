// FRONTEND/src/pages/home/Home.tsx
import styles from "./Home.module.css";
import { login } from "@/auth/spotifyAuth";
import { SearchBar } from "@/components/SearchBar";
import { PlaylistComposer } from "@/components/PlaylistComposer";
import { useAuth } from "@/hooks/useAuth"; // ⟵ add

export const Home = () => {
	// ⟵ replace isAuthed/me state & effect with this:
	const { isAuthed, user, logout } = useAuth();

	// Friendly label for the user (prefer display_name, then email, then id)
	const userLabel = user?.display_name || user?.email || (user ? user.id : "");

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

						{/* If user is not null, use its id -> render PlaylistComposer only when we have a real user id */}
						<PlaylistComposer userId={user?.id ?? ""} />
					</>
				)}
			</main>
		</div>
	);
};
