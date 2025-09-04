# Automated Testing Overview

This project includes automated test suites using:

- ✅ Vitest – unit, integration, and component tests
- 🌐 Playwright – end-to-end tests in a real browser

Postman collection in its own dedicated folder in root
- 📮 Postman – quick smoke tests against the Netlify API

All tests are in the TESTS/ folder and written in TypeScript. Postman Colection is is JavaScript

---

### 📁 Overall Structure

```
spotify-playlist-creator
├── TESTS/
│   ├── api/ # Backend tests
│   │   ├── netlify-api-integration/  # Netlify function (spotify-token.ts) integration
│   │   └── spotify-api-integration/ # spotify.ts API client integration
│   ├── logic/  # Core app logic
│   │   ├── unit/ # Hooks, utils, spotify client unit tests
│   │   └── integration/ # Auth + login logic integration
│   ├── ui/ # React component tests
│   │   ├── component-unit/ # Single component tests
│   │   └── component-integration/ # Component flows (App/Home)
│   ├── e2e/ # Playwright tests
│   │   ├── pages/ HomePage
│   │   ├── helpers/ # E2E helpers (auth/session stubs)
│   │   └── tests/ # E2E test
│   └── setup/ # Shared MSW servers for tests
└── postman-collection/
    └── test-collection

```




## ✅ Vitest

### How to run

1.  Install Vitest in app ROOT 
``` bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom msw playwright
```

2. Install SuperTest and in the root as well so that the test files, wherever they live, can import it
``` bash
npm install --save-dev supertest @types/supertest   # Required for backend HTTP testing
npm install --save-dev jest-environment-jsdom       # Required for frontend DOM testing (ThemeSwitch, etc.)
```

3. Run tests:

**Run all tests**
``` bash
npm run test
```

---

## 🌐 Playwright

### How to Run

1. Go to teh root of the project:

2. Install dependencies
```bash
npm install --save-dev @playwright/test
npx playwright install
```

3. Run run smoke test
``` bash
npx playwright test TESTS/e2e/tests/e2e-login-smoke.spec.ts --config TESTS/e2e/playwright.config.ts
```

4. Run E2E tests
``` bash
npx playwright test TESTS/e2e/tests/e2e-app-flow.test.ts --config TESTS/e2e/playwright.config.ts
```

- How to open Playwright codegen:
terminal A: npm run dev:netlify
terminal B: npx playwright codegen http://127.0.0.1:5173 --target=ts --device="Desktop Chrome"


---

