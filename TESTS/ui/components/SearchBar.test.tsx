// TESTS/ui/components/SearchBar.realistic.test.tsx
// @vitest-environment jsdom


/**
 * Realistic component tests for <SearchBar /> using Vitest.
 * Simulates user interactions including typing, debounce, API calls, errors, and clearing input.
 */


import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { SearchBar } from '@/components/SearchBar';
import * as spotifyApi from '@/api/spotify';


// ----------------------------
// Setup: Mock Spotify API
// ----------------------------

const mockSearchTracks = vi.spyOn(spotifyApi, 'searchTracksTop4');

beforeEach(() => {
	// reset spy only (no fake timers now)
	mockSearchTracks.mockReset();
});

afterEach(() => {
	cleanup(); // removes any leftover DOM from previous render
});


describe('<SearchBar /> realistic behavior', () => {

	// Test that the input field renders with correct placeholder
	test('renders input and placeholder', () => {
		render(<SearchBar />);
		const input = screen.getByPlaceholderText(/search tracks/i);
		expect(input).toBeInTheDocument();
	});

	// Test that API is called after user types and waits for debounce
	test('calls API after user types and waits for debounce', async () => {
        mockSearchTracks.mockResolvedValueOnce([
        { id: '1', uri: 'spotify-uri', name: 'Track 1', artists: 'Artist A', duration_ms: 40000 }
        ]);

        // Render and scope query to container
        const { container } = render(<SearchBar />);
        const input = within(container).getByPlaceholderText('Search tracks...');

        await userEvent.type(input, 'Hello');
        // wait a bit longer than the 400ms debounce
        await new Promise(r => setTimeout(r, 450));

        await waitFor(() => {
        expect(mockSearchTracks).toHaveBeenCalledWith('Hello');
        });

        expect(screen.getByText('Track 1')).toBeInTheDocument();
    });

	// Test that error message displays when API fails
	test('displays error when API fails', async () => {
		mockSearchTracks.mockRejectedValueOnce(new Error('Network error'));

		const { container } = render(<SearchBar />);
		const input = within(container).getByPlaceholderText('Search tracks...');

		await userEvent.type(input, 'Test thats supposed to fail');
		await new Promise(r => setTimeout(r, 450));

		// Wait for the error element to appear
		await waitFor(() => {
			const errorEl = screen.getByText(/network error/i);
			expect(errorEl).toBeInTheDocument();
		});
	});

	// Test that input and error are cleared when clear button is clicked
	test('clears input and error when clear button clicked', async () => {
		mockSearchTracks.mockRejectedValueOnce(new Error('Oops'));

		const { container } = render(<SearchBar />);
		const input = within(container).getByPlaceholderText('Search tracks...');

		await userEvent.type(input, 'TestClear');
		await new Promise(r => setTimeout(r, 450));

		// Wait for error message
		await waitFor(() => {
			const errorEl = screen.getByText(/oops/i);
			expect(errorEl).toBeInTheDocument();
		});

		// Click the clear button
		const clearBtn = screen.getByRole('button', { name: /clear/i });
		fireEvent.click(clearBtn);

		// Check that input is cleared
		expect((input as HTMLInputElement).value).toBe('');

		// Check that error is gone
		expect(screen.queryByText(/oops/i)).not.toBeInTheDocument();
	});

	// Test that error disappears if user types again after failure
	test('clears error when user types again after network failure', async () => {
		mockSearchTracks.mockRejectedValueOnce(new Error('Network error'));

		render(<SearchBar />);
		const input = screen.getByPlaceholderText(/search tracks/i);

		// First type triggers network error
		await userEvent.type(input, 'Fail test on purpose');
		await new Promise(r => setTimeout(r, 450));

		await waitFor(() => {
			const error = screen.queryByText(/network error/i);
			expect(error).toBeInTheDocument();
			expect(error?.textContent).toEqual('Network error');
		});

		// Now user types again
		await userEvent.type(input, 'a'); // append a character
		await new Promise(r => setTimeout(r, 450));

		// The error should disappear immediately
		await waitFor(() => {
			const error = screen.queryByText(/network error/i);
			expect(error).not.toBeInTheDocument();
		});
	});

	// Test that empty search results are handled gracefully
	test('handles empty results gracefully', async () => {
		mockSearchTracks.mockResolvedValueOnce([]);

		render(<SearchBar />);
		const input = screen.getByPlaceholderText(/search tracks/i);
		await userEvent.type(input, 'NoResults');
		await new Promise(r => setTimeout(r, 450));

		await waitFor(() => {
			expect(screen.getByText(/no results found/i)).toBeInTheDocument();
		});
	});

	// Test that rapid typing does not spam API calls due to debounce
	test('handles rapid typing without spamming API', async () => {
		mockSearchTracks.mockResolvedValue([]);

		render(<SearchBar />);
		const input = screen.getByPlaceholderText(/search tracks/i);

		await userEvent.type(input, 'RapidTyping');
		await new Promise(r => setTimeout(r, 450));

		await waitFor(() => {
			expect(mockSearchTracks).toHaveBeenCalledTimes(1);
			expect(mockSearchTracks).toHaveBeenCalledWith('RapidTyping');
		});
	});

	// Test that keyboard navigation and Enter key triggers search
	test('allows navigation via keyboard (Tab + Enter)', async () => {
		mockSearchTracks.mockResolvedValueOnce([
			{ id: '1', uri: 'spotify-uri', name: 'Track 1', artists: 'Artist A', duration_ms: 40000 }
		]);

		render(<SearchBar />);
		const input = screen.getByPlaceholderText(/search tracks/i);
		input.focus();

		await userEvent.type(input, 'Track{Enter}');
		await new Promise(r => setTimeout(r, 450));

		await waitFor(() => {
			expect(mockSearchTracks).toHaveBeenCalledWith('Track');
		});

		expect(screen.getByText('Track 1')).toBeInTheDocument();
	});

	// Test that a failed search clears error and succeeds on retry
	test('clears error when user types again and retries search', async () => {
		// First call fails
		mockSearchTracks.mockRejectedValueOnce(new Error('Network error'));
		// Second call succeeds
		mockSearchTracks.mockResolvedValueOnce([
			{ id: '2', uri: 'spotify-uri-2', name: 'Recovered Track', artists: 'Artist B', duration_ms: 123000 }
		]);

		render(<SearchBar />);
		const input = screen.getByPlaceholderText(/search tracks/i);

		// Trigger error
		await userEvent.type(input, 'TriggerError');
		await new Promise(r => setTimeout(r, 450));

		await waitFor(() => {
			expect(screen.queryByText(/network error/i)).toBeInTheDocument();
		});

		// Type again to retry
		await userEvent.type(input, 'x'); // append character
		await new Promise(r => setTimeout(r, 450));

		// Error should clear
		await waitFor(() => {
			expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
		});

		// Successful result should appear
		await waitFor(() => {
			expect(screen.getByText('Recovered Track')).toBeInTheDocument();
		});
	});
});

// npm run test
// npx vitest --project logic-dom run TESTS/ui/components/SearchBar.test.tsx
