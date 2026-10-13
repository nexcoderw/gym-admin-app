import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The .mts extension keeps this configuration explicitly ESM without changing package mode.
export default defineConfig({
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			// Test-only replacement; production retains Next's server-only import guard.
			'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
		},
	},
	test: { environment: 'node', include: ['test/**/*.test.{ts,tsx}'], restoreMocks: true },
});
