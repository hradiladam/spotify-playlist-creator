// TESTS/e2e/pages/HomePage.ts
import type { Page, Locator } from '@playwright/test';

export class HomePage {
	private page: Page;

	// Locators
	readonly searchInput: Locator;
	readonly addNewPlaylistButton: Locator;
	readonly savePlaylistLocalButton: Locator;
	readonly deletePlaylistLocalButton: Locator;
	readonly savePlaylistToSpotifyButton: Locator;
	readonly addTrackToPlaylistButtons: Locator;
	readonly savedCounter: Locator;

	constructor(page: Page) {
		this.page = page;
		this.searchInput = page.getByPlaceholder(/search tracks/i);
		this.addNewPlaylistButton = page.getByRole('button', { name: /add new playlist/i });
		this.savePlaylistLocalButton = page.getByRole('button', { name: /save playlist/i });
		this.deletePlaylistLocalButton = page.getByRole('button', { name: /delete playlist/i });
		this.savePlaylistToSpotifyButton = page.getByRole('button', { name: /save to spotify/i });
		this.addTrackToPlaylistButtons = page.getByRole('button', { name: /^save$/i }); // match only the per-track save buttons (not "Save playlist" or "Save to Spotify")
		this.savedCounter = page.getByText(/saved songs:/i);
	}

	// --- Navigation ---
	async goto() {
		await this.page.goto('/');
	}

	// --- Assertions ---
	async assertLoggedInUI() {
		await this.page.getByText(/logged-in as:/i).waitFor();
		await this.searchInput.waitFor();
	}

	// --- Actions ---
	async search(q: string, debouncedMs = 450) {
		await this.searchInput.fill(q);
		await this.page.waitForTimeout(debouncedMs); // wait longer than debounce
	}

	async createPlaylist(name: string) {
        await this.addNewPlaylistButton.click();
        await this.page.getByPlaceholder(/type playlist name/i).fill(name);
        await this.savePlaylistLocalButton.click();

        // Unique post-conditions for the created state
        await this.savePlaylistToSpotifyButton.waitFor();
        await this.deletePlaylistLocalButton.waitFor();

        // (Optional) also assert the exact created name, but scoped & disambiguated
        await this.page.getByText(new RegExp(`^${name}$`, 'i')).first().waitFor();
    }

	async deletePlaylist(confirm = true) {
		// intercept confirm dialog
		this.page.once('dialog', d => {
			confirm ? d.accept() : d.dismiss();
		});
		await this.deletePlaylistLocalButton.click();
	}

	async addFirstTrackToPlaylist() {
		await this.addTrackToPlaylistButtons.first().click();
	}

	async savedCount(): Promise<number> {
		const text = await this.savedCounter.textContent();
		const m = text?.match(/\d+/);
		return m ? parseInt(m[0], 10) : 0;
	}

	async saveToSpotifyAndGetAlert(): Promise<string> {
		const msgPromise = new Promise<string>((resolve) => {
			this.page.once('dialog', d => {
				const m = d.message();
				d.accept();
				resolve(m);
			});
		});
		await this.savePlaylistToSpotifyButton.click();
		return msgPromise;
	}
}