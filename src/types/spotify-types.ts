// src/types/spotify-types.ts
// Types for Spotify API responses

export type TokenResponse = {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope?: string;
};