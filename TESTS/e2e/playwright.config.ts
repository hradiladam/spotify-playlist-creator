// TESTS/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// --- Modes ---
// Default: prod-like (build + preview on 4173)
// Set PW_DEV_SERVER=1 to use Vite dev server (5173) instead
const isCI = !!process.env.CI;
const useDevServer = !!process.env.PW_DEV_SERVER;

const baseURL = useDevServer ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: '.',                  // config sits inside TESTS/e2e
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
    launchOptions: {
      slowMo: isCI ? 0 : 200,    // small slowMo locally; none in CI
    },
  },

  // CI: chromium only (fast). Locally: all 3 by default or via PW_BROWSERS.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...((process.env.PW_BROWSERS === 'all' || !isCI)
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  webServer: {
    // Build+preview (default) or dev server when PW_DEV_SERVER=1
    command: useDevServer ? 'npm run dev' : 'npm run build && npm run preview:ci',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

// Run examples:
//   npx playwright test --config TESTS/e2e/playwright.config.ts
