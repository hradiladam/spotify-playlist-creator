# Spotify Playlist Creator

A Vite + React app that lets a user log into Spotify (OAuth 2.0 + PKCE), search tracks, stage a **local playlist**, and then save it to their Spotify account.

---

## Features
- **OAuth 2.0 + PKCE** login against Spotify (no client secret in the frontend).
- **Search** top track results (debounced input, error and loading states).
- **Local playlist** you can create and fill before pushing to Spotify.
- **Save to Spotify**: creates a private playlist and adds selected tracks.
- Clean, testable React code with small presentational components and custom hooks.


## Technologies
- **Frontend:** Vite, React, TypeScript, CSS Modules  
- **Auth:** OAuth 2.0 + PKCE with token-exchange 
- **Runtime:** Browser (no server render)  
- **Validation:** `zod` for shaping Spotify API responses


## Project Structure
```
index.html
src/
    api/spotify.ts
    auth/spotifyAuth.ts
    components/
        PlaylistComposer/
        SearchBar/
        TrackList/
    hooks/
        useAuth.ts
        useDebouncedValue.ts
        useLocalPlaylist.ts
        useSpotifySearch.ts
    pages/
        Callback.tsx
        home/
    utils/format.ts
    App.tsx
    main.tsx
netlify/functions/spotify-token.ts
```

## How It Works (PKCE Flow)
1. **login()** generates a random `code_verifier` (in spotifyAuth.ts) and stores it in `sessionStorage`.
2. A `code_challenge = SHA256(code_verifier)` is sent to Spotify’s authorize URL.
3. Spotify redirects back to `REDIRECT_URI` with a short-lived `code`.
4. **handleCallback()** posts `{ code, code_verifier }` to your **token endpoint**.
5. The endpoint exchanges it at Spotify for **access** (and refresh) tokens.
6. Tokens are stored in `sessionStorage` with expiry time. **getAccessToken()** refreshes when needed.


## How to Access

## Demo Access (Important)

This app uses the **Spotify Web API**. Spotify applies restrictions depending on the app mode:

- **Development mode (default):**  
    - The app is limited to **25 whitelisted accounts**.  
    - Only Spotify accounts that the app owner has added in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) can log in.  
    - If your account is not whitelisted, you’ll see an error when trying to log in.

- **Production mode (after Spotify approval):**  
    - Any Spotify user can log in.  
    - To enable this, the app must be submitted for review and approved by Spotify whicj hasn't happen yet!

### What this means for you
- If you are **not whitelisted** in the developer dashboard, the online demo will not let you log in.  
- Easiest soluton: 
    1. create a new free Spotify account
    2. share with me **the email address linked to the Spotify account**

- To try the project yourself:  
    1. Clone this repo.  
    2. Create your own Spotify Developer App at [Spotify Dashboard](https://developer.spotify.com/dashboard).  
    3. create a .env file and add your own **Client ID** and **Redirect URI** to a `.env` file.  
    4. Run the app locally or deploy to Netlify/Vercel.  


### Run Locally
1. **Clone the repo**
```bash
   git clone https://github.com/<your-username>/spotify-playlist-creator.git
   cd spotify-playlist-creator
```

2. **Install dependencies**

```bash
npm install
```

This runs npm install in the root.
Do this once after cloning to install all dependencies.


3. **Set up environmental variable**
```
# --- For frontend (Vite requires VITE_ prefix) --- 
VITE_REDIRECT_URI=http://127.0.0.1:8888/callback
VITE_TOKEN_ENDPOINT=/.netlify/functions/spotify-token
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here

# --- For backend (Netlify function secrets) ---
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

4. Start the app

```bash
npm run dev:netlify 
```
Once the dev server is running, open the app at: http://127.0.0.1:8888

## Scripts
- `npm install` — installs all dependencies
- `npm run dev` — start Vite dev server (http://127.0.0.1:5173)
- `npm run dev:netlify` — run app with Netlify proxy for Spotify callback at http://127.0.0.1:8888
- `npm run build` — type-check (excluding tests) and create a production build in `dist/`
- `npm run preview` — locally preview the production build
- `npm test` — run Jest unit/integration (once added)

## API Calls Used
- `GET /v1/search?type=track` — search for tracks (top 10, sliced to 4)
- `GET /v1/me` — get current user profile
- `POST /v1/users/{user_id}/playlists` — create playlist
- `POST /v1/playlists/{playlist_id}/tracks` — add tracks
- `DELETE /v1/playlists/{playlist_id}/followers` — delete (unfollow) playlist

## Roadmap

- **Testing**
  - Jest unit, component, and integration tests
  - Playwright E2E + UI tests
  - Postman API scripts for token endpoint

- **CI/CD**
  - GitHub Actions CI

- **Rework / New Features**
  - Display all user playlists
  - Add tracks to any playlist
  - Remove tracks from any playlist
  - Rename playlists
  - Delete playlists

## Licence
- MIT License
