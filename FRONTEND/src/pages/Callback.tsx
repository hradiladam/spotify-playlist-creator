// FRONTEND/src/pages/Callback.tsx

// Callback.tsx
export default function Callback() {
	const params = new URLSearchParams(window.location.search);
	const err = params.get("error");

	return (
		<div>
			{err ? `Auth error: ${err}` : "Finishing login..."}
		</div>
	);
}

// This component handles the Spotify authentication callback and displays any errors that occur during login.

