// TESTS/setup/jest.polyfills.cjs

/**
 * Provides a crypto.subtle polyfill using Node’s built-in crypto.webcrypto:
 * - spotifyAuth.ts uses crypto.subtle.digest("SHA-256") for PKCE/OAuth login flow.
 * - JSDOM does not include crypto.subtle, so we expose Node’s version globally
 *   to prevent runtime errors in tests.
 *
 * Must be CJS: Jest runs setupFiles before ts-jest/ESM loaders.
 */
const { webcrypto } = require("node:crypto");

Object.defineProperty(globalThis, "crypto", {
	value: webcrypto,
	writable: false,
	configurable: true
});


