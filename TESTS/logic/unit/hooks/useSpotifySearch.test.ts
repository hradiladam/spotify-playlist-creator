// TESTS/logic/unit/useSpotifySearch.test.ts
// @vitest-environment jsdom

//  UNIT TESTS for useSpotifySearch()
// ---------------------------------
// - Debounce behavior verified with fake timers.
// - API boundary mocked (searchTracksTop4).


import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpotifySearch } from '@/hooks/useSpotifySearch';
import { searchTracksTop4 } from '@/api/spotify';

// Mock ONLY the API function used by the hook
vi.mock('@/api/spotify', () => ({
    searchTracksTop4: vi.fn(),
}));

const results = [
    { id: '1', uri: 'spotify:track:1', name: 'Song 1', artists: 'A', duration_ms: 1000 },
	{ id: '2', uri: 'spotify:track:2', name: 'Song 2', artists: 'B', duration_ms: 2000 },
];

describe('useSpotifySearch', async () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(searchTracksTop4).mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });


    // Empty/whitespace query should not call API and must clear results.
    test('does not call API for empty or whitespace query', async () => {
        const { result } = renderHook(() => useSpotifySearch());
        
        act(() => {
            result.current.setQuery('   ');
        });

        // Fast-forward debounce delay
       await act(async () => {
			vi.advanceTimersByTime(450); // pass debounce
		});

        expect(searchTracksTop4).not.toHaveBeenCalled();
        expect(result.current.results).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    // After debounce, a non-empty query triggers one API call and stores results.
	test('debounces input and sets results on success', async () => {
		vi.mocked(searchTracksTop4).mockResolvedValue(results);

		const { result } = renderHook(() => useSpotifySearch('', 300));

		// Type a query; no immediate call
		act(() => {
			result.current.setQuery('Playlist');
		});

		expect(searchTracksTop4).not.toHaveBeenCalled();

		// Cross debounce threshold → 1 API call
		await act(async () => {
			vi.advanceTimersByTime(400);
		});

		expect(searchTracksTop4).toHaveBeenCalledTimes(1);
		expect(searchTracksTop4).toHaveBeenCalledWith('Playlist');
		expect(result.current.results).toEqual(results);
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
	});

    // API failure should surface a error and stop loading.
	test('sets error when API throws', async () => {
        const delay = 400; // must match hook debounce
		vi.mocked(searchTracksTop4).mockRejectedValue(new Error('Error'));

		const { result } = renderHook(() => useSpotifySearch('', delay));

		act(() => {
			result.current.setQuery('x');
		});

		await act(async () => {
			vi.advanceTimersByTime(400);
		});

		expect(searchTracksTop4).toHaveBeenCalledTimes(1);
		expect(result.current.loading).toBe(false);
		expect(result.current.results).toEqual([]);
		expect(result.current.error).toBe('Error');
	});

    // Rapid re-typing cancels the older request; only the latest wins.
    test('cancels stale request and keeps only latest results', async () => { 
        // Simulate two API calls:
        //  - first: "slow" → resolves after 1000ms with OLD result
        //  - second: "fast" → resolves immediately with RESULTS

        const delay = 400; // must match hook debounce

        vi.mocked(searchTracksTop4)
            .mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    return setTimeout(() => {
                        return resolve([
                            { id: 'old', uri: 'uri:old', name: 'Old', artists: 'Old', duration_ms: 1 }
                        ] as any), 1000
                    });   // Mocks slow response on purpose
                })
            })
            .mockResolvedValue(results);    // second call = fast response
        
        const { result } = renderHook(() => useSpotifySearch('', 400)); 

        // --- Act 1: type first input ---
        act(() => result.current.setQuery('first'));

        // Advance debounce timer so first API call triggers
        act(() => vi.advanceTimersByTime(delay));
        expect(searchTracksTop4).toHaveBeenCalledTimes(1);


        // --- Act 2: type second input before the first resolves → debounce → 2nd API call ---
        act(() => result.current.setQuery('second'));

        await act(async () => vi.advanceTimersByTime(delay));
        expect(searchTracksTop4).toHaveBeenCalledTimes(2);
        
        // Let the slov mocked result resolve
        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.results).toEqual(results);
        expect(result.current.loading).toBe(false);
	    expect(result.current.error).toBeNull();
    });

    // Clear() should reset the query and results so UI returns to idle state.
	test('clear() resets query and results', async () => {
        const delay = 400;
		vi.mocked(searchTracksTop4).mockResolvedValue(results);

		const { result } = renderHook(() => useSpotifySearch('', delay));

		// Do a successful search
		act(() => {
			result.current.setQuery('ACDC');
		});

		await act(async () => {
			vi.advanceTimersByTime(delay);
		});
		expect(result.current.results).toHaveLength(2);

		// Now clear
		act(() => {
			result.current.clear();
		});

		// Debounce not needed for clear because we directly set query and effect will clear on empty
		await act(async () => {
			vi.advanceTimersByTime(delay);
		});

		expect(result.current.query).toBe('');
		expect(result.current.results).toEqual([]);
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
	});
})

	// npm run test
	// npx vitest run TESTS/logic/unit/hooks/useSpotifySearch.test.ts




