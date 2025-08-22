// FRONTEND/src/pages/Callback.tsx

// This component handles the Spotify authentication callback and displays any errors that occur during login.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '@/auth/spotifyAuth';


export const Callback = () => {
	const navigate = useNavigate();

	useEffect(() => {
		(async () => {
			try {
				await handleCallback(window.location.href);
				navigate("/");	// Go back home after successful login
			} catch (error) {
				console.error("Error handling callback:", error);
			}
		})();
	}, [navigate]);



	return (
		<div>
			Finishing login...
		</div>
	);
}

