// TESTS/setup/handlers.ts

/**
 * Fake Spotify API endpoints for tests.
 * - Each handler defines what data to return when a specific API call is made.
 * - Lets us test features without calling the real Spotify servers.
 * - Used by msw.server.ts to respond to fetch() requests in Jest.
 */

import { http, HttpResponse } from "msw";


// Base URL for Spotify Web API
const API = "https://api.spotify.com/v1";


export const handlers = [
    // Handlers
];