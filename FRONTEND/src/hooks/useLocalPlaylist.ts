// Local playlist state shared across components (SearchBar, PlaylistComposer)
// - Holds temporary playlist name and track URIs until user saves to Spotify.
// - Adds simple duplicate protection and a counter for saved songs.

import { useCallback, useMemo, useState } from "react";
import type { TrackSummary } from "@/api/spotify";


export type LocalPlaylistState = {
	name: string;
	trackUris: string[]; // store URIs for Spotify add-tracks
	isCreated: boolean;
};

// Custom hook for managing local playlist state
export const useLocalPlaylist = () => {
	const [name, setName] = useState<string>("");				   // store playlist name
	const [trackUris, setTrackUris] = useState<string[]>([]);	   // store URIs for Spotify add-tracks
	const [isCreated, setIsCreated] = useState<boolean>(false);	   // track creation status

	// Create local playlist with a name
	const create = useCallback((playlistName: string) => {
		if (!playlistName.trim()) return false;
		setName(playlistName.trim());
		setTrackUris([]);
		setIsCreated(true);
		return true;
	}, []);

	// Delete local playlist (reset to default state)
	const discard = useCallback(() => {
		setName("");
		setTrackUris([]);
		setIsCreated(false);
	}, []);

	// Add a track to the local playlist (if created)
	const addTrack = useCallback((track: TrackSummary) => {
		// Guard: if there’s no local playlist yet, bail out with a reason
		if (!isCreated) return { ok: false, reason: "no-playlist" };

		// If the track URI is already in the list, keep the old array.
		// Otherwise, return a new array with the URI appended.
		setTrackUris((prev) => (prev.includes(track.uri) ? prev : [...prev, track.uri]));
		
		// Return success
		return { ok: true };
	}, [isCreated]);

	// Simple counter derived from URIs
	const count = useMemo(() => trackUris.length, [trackUris]);

	return {
		// state
		name,		// Name of local playlist
		trackUris,	// URIs of tracks in the local playlist
		isCreated,  // Whether the local playlist has been created
		count,		// Number of tracks in the local playlist

		// actions
		create,		// Create a new local playlist
		discard,	// Discard the current local playlist
		addTrack,	// Add a track to the local playlist
		setName,	// Set the name of the local playlist	
	};
};
