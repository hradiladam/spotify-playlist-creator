//TESTS/polyfills/crypto.subtle.ts

/**
 * - Provides a crypto.subtle polyfill using Node’s built-in crypto.webcrypto:
 *   spotifyAuth.ts uses crypto.subtle.digest("SHA-256") for the PKCE/OAuth login flow.
 *   JSDOM does not include crypto.subtle, so we expose Node’s version globally
 *   to prevent runtime errors in tests.
 */

import { webcrypto } from "node:crypto";

// Expose crypto.subtle (PKCE/OAuth) in the Jest environment
Object.defineProperty(global, "crypto", {
    value: webcrypto,
});