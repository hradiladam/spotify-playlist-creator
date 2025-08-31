// TESTS/e2e/tests/e2e-login-smoke.spec.ts

import { seedLoggedInSession } from '../helpers/e2e-auth';
import { test, expect } from '@playwright/test';

test('app boots directly into logged-in state', async ({ page }) => {
    // Put fake tokens into sessionStorage before the app loads
    await seedLoggedInSession(page);

    // Now open the app
    await page.goto('./');

    // Check that something only visible to logged-in users appears
    await expect(page.getByPlaceholder(/search tracks/i)).toBeVisible();
    await expect(page.getByText(/add new playlist/i)).toBeVisible();
});


// npx playwright test TESTS/e2e/tests/e2e-login-smoke.spec --config TESTS/e2e/playwright.config.ts


	


