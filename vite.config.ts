// vite.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = process.cwd();
const alias = { '@': path.resolve(root, 'src') };

export default defineConfig({
	plugins: [react()],
	resolve: { alias },
	server: { host: '127.0.0.1', port: 5173 },
	test: {
		globals: true,
		testTimeout: 10000, // Global timeout (10s for all tests)
		projects: [
			// logic-dom: unit tests that require a browser-like env (jsdom).
			// Use for hooks/utilities that depend on fetch, timers, or DOM APIs.
			{
				resolve: { alias },
				test: {
					name: 'logic-dom',
					environment: 'jsdom',
					include: ['TESTS/logic/**/*.test.tsx'],
					setupFiles: ['./TESTS/setup/setupDom.ts'],
				},
			},

			// logic: pure Node tests (no DOM, no MSW).
			// Use for pure functions, formatters, etc without DOM.
			{
				resolve: { alias },
				test: {
					name: 'logic',
					environment: 'node',
					setupFiles: ['./TESTS/setup/setupNode.ts'],
					include: ['TESTS/logic/**/*.test.ts'],
				},
			},

			// ui: isolated component tests (jsdom).
			// Use for single components and shallow user flows with mocked deps.
			{
				resolve: { alias },
				test: {
					name: 'ui',
					environment: 'jsdom',
					setupFiles: ['./TESTS/setup/setupDom.ts'],
					include: ['TESTS/ui/**/*.test.ts?(x)'],
					testTimeout: 20000,
    				hookTimeout: 20000,
				},
			},

			// api: backend-like tests (Node + MSW).
			// Use for server functions (e.g. Netlify spotify-token) with mocked HTTP.
			{
				resolve: { alias },
				test: {
					name: 'api',
					environment: 'node',
					setupFiles: ['./TESTS/setup/setupApi.ts'],
					include: ['TESTS/api/**/*.test.ts?(x)'],
				},
			},

			// integration: (jsdom + MSW).
			// Use for multi-component journeys with real wiring + mocked network.
			{
				resolve: { alias },
				test: {
					name: 'integration',
					environment: 'jsdom',
					setupFiles: ['./TESTS/setup/setupDom.ts'],
					include: ['TESTS/integration/**/*.int.test.ts?(x)'],
					testTimeout: 20000,
					hookTimeout: 20000,
				},
			},
		],
	},
});
