//src/hooks/useAuth.ts

import { useEffect, useState, useCallback } from "react";
import { getAccessToken, logout as doLogout } from "@/auth/spotifyAuth";
import { getCurrentUser, type UserProfile } from "@/api/spotify";

// Auth hook: "am I authorized?" + "who am I?"
export const useAuth = () => {
	// Track whether we currently have a valid access token.
	const [isAuthed, setIsAuthed] = useState<boolean>(false);
    
	// Logged-in user profile → for "Logged-in as ..."
	const [user, setUser] = useState<UserProfile | null>(null);

	const refresh = useCallback(async () => {
		const token = await getAccessToken();
		if (!token) {
			setIsAuthed(false);
			setUser(null);
			return;
		}
		setIsAuthed(true);
		try {
			const profile = await getCurrentUser();
			setUser(profile);
		} catch {
			// If /me fails for any reason, fall back to just being "authed"
			// without a name (UI will hide the name line automatically).
			setUser(null);
		}
	}, []);

	useEffect(() => {
		// On mount, check if we already have a valid token and, if so, load the profile.
		void refresh();
	}, [refresh]);

	const logout = useCallback(() => {
		doLogout();
	}, []);

	return { isAuthed, user, refresh, logout };
};
