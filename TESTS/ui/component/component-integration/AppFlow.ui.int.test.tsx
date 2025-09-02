// TESTS/ui/component/component-integration/AppFlow.ui.int.test.tsx
// @vitest-environment jsdom

// Component-integration tests:
// - Render <Home /> with real children (SearchBar, TrackList, PlaylistComposer)
// - MSW stubs Spotify endpoints; no real network.
// - Auth is mostly mocked so we can simulate logged-out/logged-in states.
// 
// Flows covered:
// - happy path: search → create local → save track → save to Spotify
// - error: save to Spotify fails on playlist creation
// - error: save to Spotify fails when adding tracks
// - local playlist lifecycle: create → delete → create different
// - login transition: Home logged-out → click login → become logged-in → post-login UI appears

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

// Exported MSW server from setupDom.ts (already wired with shared handlers)
import { server } from '../../../setup/setupDom';

// SUT: <Home />
import { Home } from '@/pages/home/Home';

// Mock auth module so UI never hits real PKCE/network during these component tests
vi.mock('@/auth/spotifyAuth', () => ({
	login: vi.fn(),
	getAccessToken: vi.fn().mockResolvedValue('test-token'),
	logout: vi.fn(),
	handleCallback: vi.fn(),
}));

// Mock the auth hook with a tiny in-memory state we can flip inside tests
vi.mock('@/hooks/useAuth', () => {
	const state = {
		isAuthed: true,
		user: { id: 'u1', email: 'me@example.com', display_name: 'Tester' } as any,
		logout: vi.fn(),
	};

	return {
		useAuth: () => state,
		__setAuthState: (next: Partial<typeof state>) => Object.assign(state, next),
	};
});

// NOTE: TypeScript doesn't know about the test-only export on the mocked hook,
// so we import it and suppress the type complaint.
 // @ts-expect-error test-only helper from mocked module
import { __setAuthState } from '@/hooks/useAuth';

const renderHome = () =>
	render(
		<BrowserRouter>
			<Home />
		</BrowserRouter>
	);

// ---- Test fixtures ----
let user: ReturnType<typeof userEvent['setup']>;

beforeEach(() => {
	// Default most tests to "already logged in" so the app shows search/playlist UI.
	// Individual tests can override by calling __setAuthState(...) before render.
	__setAuthState({
		isAuthed: true,
		user: { id: 'u1', email: 'me@example.com', display_name: 'Tester' },
		logout: vi.fn(),
	});

	user = userEvent.setup();
});

afterEach(() => {
	server.resetHandlers(); // undo any per-test MSW overrides
	vi.clearAllMocks();
	cleanup();
});

// Local helper: advance debounce while keeping RTL on real timers
async function advanceDebounce(ms = 400) {
	vi.useFakeTimers();
	await vi.advanceTimersByTimeAsync(ms);
	vi.useRealTimers();
}

async function typeAndDebounce(input: HTMLElement, text: string, ms = 400) {
	await user.type(input, text);
	await advanceDebounce(ms);
}

describe('App Flow (component-integration)', () => {
	// Happy path
	test('happy path: search → create local → save track → save to Spotify', async () => {
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		renderHome();
		expect(await screen.findByText(/logged-in as:/i)).toBeInTheDocument();

		const input = await screen.findByPlaceholderText(/search tracks/i);
		await typeAndDebounce(input, 'Typing');
		expect(await screen.findByText(/song 1/i)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /add new playlist/i }));
		await user.type(screen.getByPlaceholderText(/type playlist name/i), 'My Mix');
		await user.click(screen.getByRole('button', { name: /save playlist/i }));
		expect(await screen.findByText('My Mix')).toBeInTheDocument();

		const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
		await user.click(saveButtons[0]);
		expect(screen.getByText(/saved songs:\s*1/i)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /save to spotify/i }));
		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalledWith('Playlist saved to Spotify.');
		});
	});

	// Error path: playlist creation fails
	test('error path: save to Spotify fails on playlist creation', async () => {
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
		const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(
			http.post('https://api.spotify.com/v1/users/:id/playlists', () => {
				return HttpResponse.text('bad name', { status: 400, statusText: 'Bad Request' });
			})
		);

		renderHome();
		const input = await screen.findByPlaceholderText(/search tracks/i);
		await typeAndDebounce(input, 'anything');
		expect(await screen.findByText(/song 1/i)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /add new playlist/i }));
		await user.type(screen.getByPlaceholderText(/type playlist name/i), 'Err Mix');
		await user.click(screen.getByRole('button', { name: /save playlist/i }));

		const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
		await user.click(saveButtons[0]);

		await user.click(screen.getByRole('button', { name: /save to spotify/i }));
		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalled();
			expect(alertSpy.mock.calls.at(-1)?.[0]).toMatch(/failed to create playlist/i);
			expect(consoleErr).toHaveBeenCalled();
		});
	});

	// Error path: track add fails
	test('error path: save to Spotify fails when adding tracks', async () => {
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
		const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(
			http.post('https://api.spotify.com/v1/playlists/:id/tracks', () => {
				return HttpResponse.text('could not add tracks', { status: 400, statusText: 'Bad Request' });
			})
		);

		renderHome();
		const input = await screen.findByPlaceholderText(/search tracks/i);
		await typeAndDebounce(input, 'anything');
		expect(await screen.findByText(/song 1/i)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /add new playlist/i }));
		await user.type(screen.getByPlaceholderText(/type playlist name/i), 'Track Fail Mix');
		await user.click(screen.getByRole('button', { name: /save playlist/i }));

		const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
		await user.click(saveButtons[0]);

		await user.click(screen.getByRole('button', { name: /save to spotify/i }));
		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalled();
			expect(alertSpy.mock.calls.at(-1)?.[0]).toMatch(/failed to add tracks/i);
			expect(consoleErr).toHaveBeenCalled();
		});
	});

	// Local playlist lifecycle
	test('local playlist lifecycle: create → delete → create different', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);

		renderHome();
		await screen.findByText(/logged-in as:/i);

		await user.click(screen.getByRole('button', { name: /add new playlist/i }));
		await user.type(screen.getByPlaceholderText(/type playlist name/i), 'First One');
		await user.click(screen.getByRole('button', { name: /save playlist/i }));
		expect(await screen.findByText('First One')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /delete playlist/i }));
		await waitFor(() => {
			expect(screen.queryByText('First One')).not.toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: /add new playlist/i }));
		await user.type(screen.getByPlaceholderText(/type playlist name/i), 'Second One');
		await user.click(screen.getByRole('button', { name: /save playlist/i }));
		expect(await screen.findByText('Second One')).toBeInTheDocument();
	});

	// Login transition: start logged-out → click login → flip auth → see post-login UI
	test('login transition: Home shows post-login UI after logging in', async () => {
		// force logged-out state before render
		__setAuthState({ isAuthed: false, user: null });

		// spy on mocked login
		const auth = await import('@/auth/spotifyAuth');
		vi.spyOn(auth, 'login').mockResolvedValue(undefined);

		const { rerender } = render(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// logged-out UI visible
		const loginBtn = await screen.findByRole('button', { name: /login with spotify/i });
		expect(loginBtn).toBeInTheDocument();

		// click -> should call login()
		await user.click(loginBtn);
		expect(auth.login).toHaveBeenCalled();

		// simulate we are now authed and rerender Home
		__setAuthState({
			isAuthed: true,
			user: { id: 'u1', email: 'me@example.com', display_name: 'Tester' },
		});

		rerender(
			<BrowserRouter>
				<Home />
			</BrowserRouter>
		);

		// post-login UI should appear
		expect(await screen.findByPlaceholderText(/search tracks/i)).toBeInTheDocument();
	});
});

// Run with:
//   npx vitest --project ui run TESTS/ui/component/component-integration/AppFlow.ui.int.test.tsx
