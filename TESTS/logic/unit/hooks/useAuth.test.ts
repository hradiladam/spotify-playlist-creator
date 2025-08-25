// TESTS/logic/unit/hooks/useAuth.test.ts
// @vitest-environment jsdom

// UNIT TESTS for useAuth()
// ------------------------
// - Mocks token + profile (no real storage/network).

    
import { describe, beforeEach, test, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { getAccessToken, logout as logout } from '@/auth/spotifyAuth';
import { getCurrentUser } from '@/api/spotify';

// Mock boundaries
vi.mock('@/auth/spotifyAuth', () => ({    // vi.mock(modulePath, factory?)
    getAccessToken: vi.fn(),
    logout: vi.fn(),
}));

vi.mock('@/api/spotify', () => ({
    getCurrentUser: vi.fn(),
}));

const fakeUser = { id: 'u1', display_name: 'User', email: 'a@example.com' };

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // On mount with NO token, hook should set isAuthed=false and user=null (and must not call getCurrentUser).
    test('mount: no token → not authed, no user, no /me call', async () => {
        vi.mocked(getAccessToken).mockResolvedValue(null);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(getAccessToken).toHaveBeenCalledTimes(1);
            expect(getCurrentUser).not.toHaveBeenCalled();
            expect(result.current.isAuthed).toBe(false);
            expect(result.current.user).toBeNull();
        });
    });

    // )n mount with a valid token and successful /me, hook should expose isAuthed=true and the user profile.
    test('mount: token present + getCurrentUser ok', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('token');
        vi.mocked(getCurrentUser).mockResolvedValue(fakeUser as any);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.isAuthed).toBe(true);
            expect(result.current.user).toEqual(fakeUser);
        });
    });

    // Refresh() can be called manually to re-evaluate token/profile (useful after login flow completes).
	test('manual refresh re-runs token/profile checks', async () => {
		
        // First: no token on mount
        vi.mocked(getAccessToken).mockResolvedValueOnce(null);

        const { result } = renderHook(() => useAuth());

        // Wait for initial effect to settle
        await waitFor(() => {
            expect(result.current.isAuthed).toBe(false);
            expect(result.current.user).toBeNull();
        });

        // Fake token appears, /me returns profile
        vi.mocked(getAccessToken).mockResolvedValueOnce('token');
        vi.mocked(getCurrentUser).mockResolvedValueOnce(fakeUser as any);

        // Trigger manual refresh and wait for state
        await act(async () => {
            await result.current.refresh();
        });

        expect(getAccessToken).toHaveBeenCalledTimes(2);
        expect(getCurrentUser).toHaveBeenCalledTimes(1);
        expect(result.current.isAuthed).toBe(true);
        expect(result.current.user).toEqual(fakeUser);
    });

	// Logout() delegates to backend logout function.
	test('logout delegates to spotifyAuth.logout', async () => {
        vi.mocked(getAccessToken).mockResolvedValue(null);

        const { result } = renderHook(() => useAuth());

        // Wait for initial effect to settle (not authed)
        await waitFor(() => {
            expect(result.current.isAuthed).toBe(false);
        });

        act(() => {
            result.current.logout();
        });

        expect(logout).toHaveBeenCalledTimes(1);
    });
})


// npm run test
// npx vitest run TESTS/logic/unit/hooks/useAuth.test.ts