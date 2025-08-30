// TESTS/ui/component/component-integration/AppFlow.integration.test.tsx
// @vitest-environment jsdom

// Component-integration tests:
// - Render <Home /> with real children (SearchBar, TrackList, PlaylistComposer)
// - MSW stubs Spotify endpoints; no real network.
// - Auth is mocked to simulate a logged-in user.
// - Flow: search → create local playlist → save a track → save to Spotify (happy)
// - Flow: save to Spotify fails (creation + track-add error paths)
// - Flow: create playlist → delete it → create different playlist
// - Flow: logout returns to login UI

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

// Exported MSW server from setupDom.ts (already wired with shared handlers)
import { server } from '../../../setup/setupDom';

// SUT: <Home />
import { Home } from '@/pages/home/Home';

// Mock auth: skip PKCE; just be logged in
vi.mock('@/auth/spotifyAuth', () => ({
    login: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
    logout: vi.fn(),
    handleCallback: vi.fn(),
}));

const renderHome = () =>
    render(
        <BrowserRouter>
            <Home />
        </BrowserRouter>
    );

// ---- Test fixtures ----
let user: ReturnType<typeof userEvent['setup']>;

beforeEach(() => {
    // Create fresh virtual user each test
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
});

// npx vitest --project ui run TESTS/ui/component/component-integration/AppFlow.integration.test.tsx