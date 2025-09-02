// TESTS/ui/component/component-unit/Home.ui.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { Home } from '@/pages/home/Home';
import * as authModule from '@/auth/spotifyAuth';

// mock the hooks and API modules
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useLocalPlaylist', () => ({ useLocalPlaylist: vi.fn() }));
vi.mock('@/api/spotify', () => ({
	createPlaylist: vi.fn(),
	addTracksToPlaylist: vi.fn(),
}));

// import the mocked functions
import { useAuth } from '@/hooks/useAuth';
import { useLocalPlaylist } from '@/hooks/useLocalPlaylist';

// small helpers to set return values on mocked hooks
const mockUseAuth = (val: any) => {
	(useAuth as Mock).mockReturnValue(val);
};

const mockUseLocalPlaylist = (val: any) => {
	(useLocalPlaylist as Mock).mockReturnValue(val);
};

describe('Home page', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		(useAuth as Mock).mockReset?.();
		(useLocalPlaylist as Mock).mockReset?.();
	});

    // When unauthenticated, the Login button is rendered and clicking it calls spotifyAuth.login().
	test('renders login UI when logged out and calls login on click', () => {
		mockUseAuth({ isAuthed: false, user: null, logout: vi.fn() });
		mockUseLocalPlaylist({}); // not used in this state
		const loginSpy = vi.spyOn(authModule, 'login').mockResolvedValue();

		const { getByRole } = render(<Home />);

		// getByText hits both the <p> and the <button> Brittle!
		// Must target the actual button by role+accessible name
		expect(getByRole('button', { name: /Login with Spotify/i })).toBeInTheDocument();

		fireEvent.click(getByRole('button', { name: /Login with Spotify/i }));
		expect(loginSpy).toHaveBeenCalled();
	});

    // When authenticated, the user label is shown and clicking "Log out" triggers the provided logout handler.
	test('shows user label and logout when logged in', () => {
		const logoutSpy = vi.fn();
		mockUseAuth({
			isAuthed: true,
			user: { id: 'u1', email: 'me@example.com', display_name: 'Tester' },
			logout: logoutSpy,
		});
		mockUseLocalPlaylist({});

		render(<Home />);

		expect(screen.getByText(/Logged-in as: Tester/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /Log out/i }));
		expect(logoutSpy).toHaveBeenCalled();
	});

    // If "Save to Spotify" is clicked with no valid local playlist (empty name), show alert and do nothing else.
	test('save to Spotify shows alert if no local playlist exists', () => {
		mockUseAuth({
			isAuthed: true,
			user: { id: 'u1', email: 'me@example.com' },
			logout: vi.fn(),
		});

		// Make the Save button render: isCreated must be true
		// Keep name '' so Home’s guard triggers the alert.
		mockUseLocalPlaylist({
			isCreated: true, 
			name: '',
			trackUris: [],
			create: vi.fn(),
			discard: vi.fn(),
			addTrack: vi.fn(),
			count: 0,
		});

		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
		render(<Home />);

		// Now the button exists because isCreated=true
		fireEvent.click(screen.getByRole('button', { name: /Save to Spotify/i }));
		expect(alertSpy).toHaveBeenCalledWith('No local playlist to save.');
	});
});

// Run with:
//   npm run test
//   npx vitest --project ui run TESTS/ui/component/component-unit/Home.ui.test.tsx