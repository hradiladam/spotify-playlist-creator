// FRONTEND/src/pages/Home.tsx

import { login } from '../auth/spotifyAuth';

export const Home = () => {
	return (
		<div>
			<h1>Spotify Playlist Creator</h1>
			<p>Login with Spotify to start searching songs, creating playlists, 
				and managing your library.</p>
			<button onClick={login}>Login with Spotify</button>
		</div>
	);
}
