import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './test/e2e',
	use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['iPhone 13'] } },
	],
	// Start the application separately. This configuration never starts a server implicitly.
});
