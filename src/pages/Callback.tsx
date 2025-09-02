//src/pages/Callback.tsx

// This component handles the Spotify authentication callback and displays any errors that occur during login.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '@/auth/spotifyAuth';

export const Callback = () => {
	const navigate = useNavigate();
	const hasRun = useRef(false);

	useEffect(() => {
		if (hasRun.current) return;      // prevent StrictMode double-run
		hasRun.current = true;

		(async () => {
			try {
				const ok = await handleCallback(window.location.href);
				if (ok) navigate('/');

			} catch (e) {
				alert(`Login failed: ${(e as Error).message}`);
			}
		})();
  }, [navigate]);



	return (
		<div>
			Logging in...
		</div>
	);
}

