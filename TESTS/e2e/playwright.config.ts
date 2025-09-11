// TESTS/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  use: {
    baseURL: 'http://127.0.0.1:5173', // must match how app runs locally
    headless: true,
    launchOptions: {
      slowMo: 1000, // 1000ms pause after each action
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Auto-start Vite dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI, // reuse locally, fresh in CI
  },
});

// npx playwright test --config TESTS/e2e/playwright.config.ts
// npx playwright test TESTS/e2e/tests/e2e-app-flow.test.ts --config TESTS/e2e/playwright.config.ts