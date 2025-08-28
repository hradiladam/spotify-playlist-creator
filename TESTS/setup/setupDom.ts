// TESTS/setup/setupDom.ts

// Fetch polyfill (jsdom/node)
import 'whatwg-fetch';


// MSW (node server intercepts fetch in tests)
import { setupServer } from 'msw/node';

// Import the handlers from the handlers file 
import { handlers } from '../testServer/handlers';

// Import Vitest methods
import { beforeAll, afterEach, afterAll, expect } from 'vitest';

// Vitest-compatible jest-dom setup
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers); // <- works now

// MSW setup
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// crypto polyfill
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto || !('subtle' in globalThis.crypto)) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

export { server };
