import { expect, test } from '@playwright/test';

test('anonymous organization URLs recover through the fixed login route', async ({ page }) => {
	await page.goto('/organizations?returnTo=https://foreign.example.invalid');
	await expect(page).toHaveURL(/\/login$/u);
});

test.describe('approved organization test administrator', () => {
	// Human-recorded disposable-test session only; never commit this credential-bearing JSON file.
	test.use({ storageState: process.env.PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE });
	test.beforeEach(() => {
		if (!process.env.PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE) {
			throw new Error('Set PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE to an approved, private test session file.');
		}
	});

	test('shows honest audit unavailability after keyboard submission without navigation', async ({ page }) => {
		await page.route('**/api/organizations', (route) => route.fulfill({
			status: 503,
			contentType: 'application/json',
			body: JSON.stringify({ error: { code: 'ORGANIZATION_AUDIT_UNAVAILABLE' } }),
		}));
		await page.goto('/organizations/new');
		await expect(page.getByRole('heading', { name: 'Register Gym' })).toBeVisible();
		await page.getByLabel('Gym name').fill('Soho Gym');
		await page.getByLabel('Slug').fill('soho');
		await page.getByLabel('Slug').press('Enter');
		await expect(page.getByRole('alert')).toContainText('audit setup');
		await expect(page).toHaveURL(/\/organizations\/new$/u);
	});

	test('keeps authorized navigation, labels and controls usable across narrow widths', async ({ page }) => {
		await page.goto('/organizations/new');
		const nav = page.getByRole('navigation', { name: 'Platform navigation' });
		await expect(nav.getByRole('link', { name: 'Organizations' })).toHaveAttribute('aria-current', 'page');
		for (const width of [320, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await expect(page.getByLabel('Gym name')).toBeVisible();
			await expect(page.getByRole('button', { name: 'Register Gym' })).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
		}
	});
});
