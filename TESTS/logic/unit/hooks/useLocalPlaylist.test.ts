// TESTS/logic/unit/hooks/useLocalPlaylist.test.ts
// @vitest-environment jsdom

//
// UNIT TESTS for useLocalPlaylist()
// ----------------------------------
// - Pure React state hook (no network/storage)
// - Verifies: state initialization, state transitions, edge cases
// - Will be reused in other components once the app expands with new features


import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalPlaylist } from '@/hooks/useLocalPlaylist';
import type { TrackSummary } from '@/api/spotify';  // type safety for mock tracks

// Helper: quick fake track creator (for tests)
const createFakeTrack = (id: string): TrackSummary => ({
	id: `id-${id}`,
	uri: `spotify:track:${id}`,
	name: `Track ${id}`,
	artists: `Artist ${id}`,
	duration_ms: 180000,
});

describe('useLocalPlaylist', () => {
    
    // Tests that hooks start with initial empty space
    test('starts with empty state (no playlist)', () => {
		const { result } = renderHook(() => useLocalPlaylist());
		expect(result.current.isCreated).toBe(false);
		expect(result.current.name).toBe('');
		expect(result.current.trackUris).toEqual([]);
		expect(result.current.count).toBe(0);
	});

    // User can create a playlist by giving it a name
	// The hook should trim spaces and mark it as created
    test('create() with a valid name initializes playlist', () => {
        const { result } = renderHook(() => useLocalPlaylist());

		act(() => {
			result.current.create(' Testing playlist ');
		});

		expect(result.current.isCreated).toBe(true);
		expect(result.current.name).toBe('Testing playlist'); // trimmed
		expect(result.current.trackUris).toEqual([]); // starts empty
		expect(result.current.count).toBe(0);
    });

    // Should not allow empty/blank names because they are not valid playlists.
    test('create() fails with empty or whitespace-only name', () => {
        const { result } = renderHook(() => useLocalPlaylist());

		let ok1: boolean, ok2: boolean;
		act(() => {
			ok1 = result.current.create('   ') as boolean;
			ok2 = result.current.create('') as boolean;
		});

		expect(ok1!).toBe(false);
		expect(ok2!).toBe(false);
		expect(result.current.isCreated).toBe(false);
		expect(result.current.name).toBe('');
    });

    // Cannot add tracks until a playlist exists, so the function should fail gracefully.
    test('Add track before create() returns failure', () => {
        const { result } = renderHook(() => useLocalPlaylist());
		const t1 = createFakeTrack('1');

		let response: { ok: boolean; reason?: string } | undefined;

        act(() => {
            response = result.current.addTrack(t1) as { ok: boolean; reason?: string };
        });
        expect(response).toBeDefined();
        expect(response!.ok).toBe(false);
    });

    // Once a playlist is created, new tracks should be added to it and count updated.
    test('addTrack appends unique URIs after create()', () => {
        const { result } = renderHook(() => useLocalPlaylist());
		const t1 = createFakeTrack('1');
		const t2 = createFakeTrack('2');

		act(() => {
			result.current.create('Test Playlist');
		});

		act(() => {
			result.current.addTrack(t1);
			result.current.addTrack(t2);
		});

		expect(result.current.trackUris).toEqual([t1.uri, t2.uri]);
		expect(result.current.count).toBe(2);
    });

    // Discarding should completely delete the playlist
    test('discard resets hook back to initial state', () => {
        const { result } = renderHook(() => useLocalPlaylist());
		const t1 = createFakeTrack('1');

		act(() => {
			result.current.create('Temp');
			result.current.addTrack(t1);
		});

		act(() => {
			result.current.discard();
		});

		expect(result.current.isCreated).toBe(false);
		expect(result.current.name).toBe('');
		expect(result.current.trackUris).toEqual([]);
		expect(result.current.count).toBe(0);
    });

    // Point: starting a new playlist should wipe out old tracks and give a clean slate.
    test('calling create() again resets tracks (fresh playlist)', () => {
        const { result } = renderHook(() => useLocalPlaylist());
		const t1 = createFakeTrack('1');

		act(() => {
			result.current.create('List A');
			result.current.addTrack(t1);
		});

		act(() => {
			result.current.create('List B');
		});

		expect(result.current.name).toBe('List B');
		expect(result.current.trackUris).toEqual([]); // old tracks cleared
		expect(result.current.count).toBe(0);
    });
})


	// npm run test
	// npx vitest run TESTS/logic/unit/hooks/useLocalPlaylist.test.ts