# Spotify Postman Test Collection

This Postman collection is a **minimal test** for the Spotify Web API.  
It covers: get current user, search tracks, create a playlist, add a track, and delete that playlist.

---

## Prerequisites

- Spotify Developer App with a **Client ID**
- Redirect URI: `https://oauth.pstmn.io/v1/callback` added in your app
- Your Spotify account (e-mail address) must be added in the app’s **User Management**



---

## Setup: Collection Authorization

In your Postman collection, set:

- **Auth Type:** OAuth 2.0  
- **Grant Type:** Authorization Code (With PKCE)  
- **Auth URL:** `https://accounts.spotify.com/authorize`  
- **Access Token URL:** `https://accounts.spotify.com/api/token`  
- **Client ID:** `<your client id>`  
- **Client Secret:** *(leave empty - With PKCE you never put your Client Secret in Postman.)*  
- **Callback URL:** `https://oauth.pstmn.io/v1/callback`  
- **Code Challenge Method:** `S256`  
- **Scopes:**  user-read-email user-read-private playlist-modify-private playlist-modify-public
- **Client Authentication:** Send client credentials in body

Click **Get New Access Token** → log in → **Use Token** → Save collection.  
All requests should use **Inherit auth from parent**.


## 2. Environment Variables

Create a Postman Environment; the tests will populate You don’t need to pre-fill these.

- `me_id` → set by `/me`
- `me_name` → set by `/me`
- `playlist_id` → set by Create Playlist
- `snapshot_id` → set by Add Track (optional)


## 3. Run 

- Open Postman → Collections → Import.
- Choose SpotifyCollection.json from ROOT/TESTS/api/POSTMAN/test-collections/
- Use the Collection Runner to execute.


## 4. Token Refresh
- Tokens expire in ~1h.
- Enable Auto-refresh Token in collection’s OAuth config to use refresh token.
- If you change/add scopes, click Get New Access Token again.


## 5. Scopes
If you skip thes, you’ll get 403 insufficient client scope

- user-read-email → lets you see the user’s email.
- user-read-private → to see account type, country, display name
- playlist-modify-private → lets you create/change private playlists, add tracks, delete playlist
- playlist-modify-public → if you want to create public playlists, add tracks, delete playlist
- 

