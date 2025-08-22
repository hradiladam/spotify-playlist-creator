// TESTS/setup/msw.server.ts

/** MSW test server for Jest.
 * - Intercepts fetch() calls in tests so they don’t hit the real Spotify API.
 * - Uses the fake endpoints from handlers.ts.
 * - This server is started/stopped in jest.setup.ts to keep tests reliable.
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
