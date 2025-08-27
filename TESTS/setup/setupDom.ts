// TESTS/setup/setupDom.ts

// 1) Fetch polyfill (jsdom/node)
import 'whatwg-fetch';

// 2) MSW (node server intercepts fetch in tests)
//    This is fine for both jsdom + node environments.
import { setupServer } from 'msw/node';
import { handlers } from '../testServer/handlers';
import { beforeAll, afterEach, afterAll } from 'vitest';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 3) crypto.subtle polyfill only if missing (node/jsdom)
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto || !('subtle' in globalThis.crypto)) {
	globalThis.crypto = webcrypto as unknown as Crypto;
}

// Optional: allow tests to override handlers
export { server };
