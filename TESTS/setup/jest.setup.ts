// TESTS/setup/jest.setup.ts

/**
 * Global test environment setup for Jest + React Testing Library.
 *
 * - Extends Jest with @testing-library/jest-dom matchers (e.g. toBeInTheDocument).
 *
 * - Adds fetch() API via whatwg-fetch:
 *   (whatwg-fetch is a polyfill that provides fetch() in environments where it doesn’t exist).
 *   Browsers have window.fetch, but Node (which Jest runs on) does not.
 *   This ensures components using fetch don’t fail under JSDOM.
 */

import "@testing-library/jest-dom";
import "whatwg-fetch";
