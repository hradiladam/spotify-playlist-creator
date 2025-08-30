// TESTS/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './specs', // folder with e2e specs
	use: {
		baseURL: 'http://127.0.0.1:5173', // must match how app runs locally
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	// Auto-start Vite dev server before tests
	webServer: {
		command: 'npm run dev',
		url: 'http://127.0.0.1:5173',
		reuseExistingServer: !process.env.CI, // reuse locally, fresh in CI
	},
});