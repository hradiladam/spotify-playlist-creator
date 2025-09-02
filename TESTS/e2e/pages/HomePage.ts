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
		this.addTrackToPlaylistButtons = page.getByRole('button', { name: /^save$/i }); // per-track Save buttons only
		this.savedCounter = page.getByText(/saved songs:/i);
	}

	// --- Navigation ---
	async goto() {
		await this.page.goto('/');
	}

	// --- Assertions (state gates only; no expect) ---
	async assertLoggedInUI() {
		await this.page.getByText(/logged-in as:/i).waitFor();
		await this.searchInput.waitFor();
	}

	// --- Actions ---
	async search(q: string, debouncedMs = 450) {
		await this.searchInput.fill(q);
		await this.page.waitForTimeout(debouncedMs); // debounce window
	}

	async searchAndWait(q: string, debouncedMs = 450) {
		await this.search(q, debouncedMs);
		await this.addTrackToPlaylistButtons.first().waitFor(); // results rendered
	}

	async createPlaylist(name: string) {
		await this.addNewPlaylistButton.click();
		await this.page.getByPlaceholder(/type playlist name/i).fill(name);
		await this.savePlaylistLocalButton.click();

		// Created-state UI present
		await this.savePlaylistToSpotifyButton.waitFor();
		await this.deletePlaylistLocalButton.waitFor();

		// Ensure exact name is visible
		await this.page.getByText(new RegExp(`^${name}$`, 'i')).first().waitFor();
	}

	async deletePlaylist(confirm = true) {
		this.page.once('dialog', d => (confirm ? d.accept() : d.dismiss()));
		await this.deletePlaylistLocalButton.click();
	}

	async addFirstTrackToPlaylist() {
		await this.addTrackToPlaylistButtons.first().click();
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

	// --- State getters (tests assert on these) ---
	async savedCount(): Promise<number> {
		const text = await this.savedCounter.textContent();
		const m = text?.match(/\d+/);
		return m ? parseInt(m[0], 10) : 0;
	}

	async logout() {
		await this.page.getByRole('button', { name: /log out/i }).click();
	}
}
