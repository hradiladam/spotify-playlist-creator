// TESTS/setup/setupDom.ts

// Fetch polyfill (jsdom/node)
// jsdom doesn’t ship window.fetch. This polyfill adds fetch, Headers, Request, Response to the jsdom global so components/hooks can call fetch without crashing
import 'whatwg-fetch';

// MSW (node server intercepts fetch in tests)
// Brings in Mock Service Worker’s Node server (not the browser worker) and your route handlers (e.g. GET https://api.spotify.com/v1/search
import { setupServer } from 'msw/node';

// Import the handlers from the handlers file 
import { handlers } from '../testServer/handlers';

// Import Vitest methods
import { beforeAll, afterEach, afterAll, expect } from 'vitest';

// Vitest-compatible jest-dom setup
// Registers lifecycle hooks you’ll use below and extends expect with jest-dom matchers (toBeInTheDocument, etc.). 
// Without this, those matchers would throw
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers); // you can use e.g. toBeInTheDocument()

// MSW setup
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// crypto polyfill
// Some code (e.g. PKCE helpers) uses crypto.subtle. jsdom doesn’t have it by default. 
// This polyfills a crypto with subtle so code depending on SHA-256 etc. won’t crash in jsdom tests.
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto || !('subtle' in globalThis.crypto)) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

// Exposes the MSW server so individual tests can import { server } and override handlers with server.use(...) if needed.
export { server };
