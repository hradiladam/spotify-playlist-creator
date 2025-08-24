// vite.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = process.cwd();
const alias = { '@': path.resolve(root, 'src') };

export default defineConfig({
	plugins: [react()],
	resolve: { alias }, // keep for dev server & general vite
	server: { host: '127.0.0.1', port: 5173 },
	test: {
		globals: true,
		projects: [
		{
			// project-specific vite bits
			resolve: { alias },
			test: {
				name: 'ui',
				environment: 'jsdom',
				setupFiles: ['./TESTS/setup/setupDom.ts'],
				include: ['TESTS/ui/**/*.test.ts?(x)', 'TESTS/component/**/*.test.ts?(x)'],
				},
			},
		{
			resolve: { alias },
			test: {
				name: 'api',
				environment: 'node',
				setupFiles: ['./TESTS/setup/setupApi.ts'],
				include: ['TESTS/api/**/*.test.ts?(x)'],
				},
			},
		{
			resolve: { alias },
			test: {
				name: 'logic',
				environment: 'node',
				setupFiles: ['./TESTS/setup/setupNode.ts'],
				include: ['TESTS/logic/**/*.test.ts?(x)'],
				},
			},
		],
	},
});
