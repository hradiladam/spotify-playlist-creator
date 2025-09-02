// TESTS/ui/component/component-unit/Callback.ui.test.tsx
// @vitest-environment jsdom
// Why jsdom? Because <Callback /> uses browser-only features like window.location, sessionStorage, and alert.

import { render } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, type MockInstance } from 'vitest';
import { Callback } from '@/pages/Callback';
import * as auth from '@/auth/spotifyAuth';

// We need to mock react-router's `useNavigate` hook so we can see when navigation happens
let navigateSpy: ReturnType<typeof vi.fn>;

// Replace react-router-dom’s useNavigate with our spy
vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<any>();
	return {
		...actual,
		useNavigate: () => navigateSpy, // always return our spy in tests
	};
});

describe('Callback page', () => {
	// Spy on window.alert (so no real popups appear during tests)
	let alertSpy: MockInstance;

	beforeEach(() => {
		// Reset mocks between tests so nothing leaks
		vi.restoreAllMocks();
		sessionStorage.clear();

		// Create fresh spies for each test
		navigateSpy = vi.fn();
		alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
	});

	// --- CASE 1: Happy path, user comes back with ?code=abc ---
	// Ensures that when a code is present and handleCallback resolves true, we navigate to "/" and show no alert.
	test('navigates home when handleCallback returns true', async () => {
		// Mock the auth helper to succeed (pretend it handled the code correctly)
		vi.spyOn(auth, 'handleCallback').mockResolvedValue(true);

		// Fake the browser URL as if Spotify redirected us back with ?code=abc
		const origHref = window.location.href; // keep original to restore later
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...window.location, href: 'http://app.local/callback?code=abc' },
		});

		// Render the Callback component — it will immediately run handleCallback()
		render(<Callback />);

		// Wait for the async effect inside Callback to finish
		await Promise.resolve();

		// Assertions: check behavior
		expect(auth.handleCallback).toHaveBeenCalledWith('http://app.local/callback?code=abc'); // passed URL
		expect(navigateSpy).toHaveBeenCalledWith('/'); // redirected to home
		expect(alertSpy).not.toHaveBeenCalled(); // no error shown

		// Put window.location back to what it was
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...window.location, href: origHref },
		});
	});

	// --- CASE 2: No code in URL, nothing to do ---
	// Verifies that without code, handleCallback returns false → no navigation and no alert.
	test('does not navigate when handleCallback returns false (no code)', async () => {
		// Mock handleCallback so it returns false (means "nothing happened")
		vi.spyOn(auth, 'handleCallback').mockResolvedValue(false);

		// Fake a URL without ?code
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...window.location, href: 'http://app.local/callback' },
		});

		render(<Callback />);
		await Promise.resolve();

		// Since there was no code, no navigation and no alert should happen
		expect(auth.handleCallback).toHaveBeenCalledWith('http://app.local/callback');
		expect(navigateSpy).not.toHaveBeenCalled();
		expect(alertSpy).not.toHaveBeenCalled();
	});

	// --- CASE 3: Error thrown (e.g. missing PKCE verifier) ---
	// Confirms that if handleCallback rejects, we show an alert with the error and do not navigate.
	test('shows alert when handleCallback throws', async () => {
		// Pretend handleCallback failed with an error
		vi.spyOn(auth, 'handleCallback').mockRejectedValue(new Error('Missing PKCE code_verifier'));

		// Fake a URL that looks valid but will cause an error
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...window.location, href: 'http://app.local/callback?code=abc' },
		});

		render(<Callback />);
		await Promise.resolve();

		// Should show an alert with the error message
		expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Missing PKCE code_verifier'));
		// And not navigate away
		expect(navigateSpy).not.toHaveBeenCalled();
	});
});

// Run with:
//   npm run test
//   npx vitest --project ui run TESTS/ui/component/component-unit/Callback.ui.test.tsx
