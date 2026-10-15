import { expect, test } from '@playwright/test';

// Public recovery routes must not inherit an authenticated workspace, even on mobile.
test.use({ storageState: { cookies: [], origins: [] } });

for (const status of ['401', '403', '404', '429', '500', '503']) {
	test(`keeps ${status} recovery standalone and responsive`, async ({ page }) => {
		await page.goto(`/${status}`);
		const main = page.getByRole('main');
		await expect(main).toHaveCount(1);
		await expect(main.locator(`[data-state="${status}"]`)).toBeVisible();
		await expect(page.getByRole('complementary')).toHaveCount(0);
		await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
		for (const width of [320, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
			const actions = main.getByRole('link');
			await expect(actions).toHaveCount(2);
			await expect(actions.nth(0)).toBeVisible();
			await expect(actions.nth(1)).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
			).toBe(true);
		}
	});
}
