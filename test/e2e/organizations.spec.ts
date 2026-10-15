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
			throw new Error(
				'Set PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE to an approved, private test session file.',
			);
		}
	});

	test('shows honest audit unavailability in the registration dialog without a success toast', async ({
		page,
	}) => {
		await page.route('**/api/organizations', (route) =>
			route.request().method() === 'POST'
				? route.fulfill({
						status: 503,
						contentType: 'application/json',
						body: JSON.stringify({ error: { code: 'ORGANIZATION_AUDIT_UNAVAILABLE' } }),
					})
				: route.continue(),
		);
		await page.goto('/organizations');
		const trigger = page.getByRole('button', { name: 'Register Gym' });
		await trigger.click();
		const dialog = page.getByRole('dialog', { name: 'Register Gym' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByLabel('Gym name')).toBeFocused();
		await dialog.getByLabel('Gym name').fill('Soho Gym');
		await dialog.getByLabel('Slug').fill('soho');
		await dialog.getByLabel('Slug').press('Enter');
		await expect(dialog.getByRole('alert')).toContainText('audit setup');
		await expect(page.getByText(/was registered/u)).toHaveCount(0);
		await expect(page).toHaveURL(/\/organizations$/u);
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
	});

	test('keeps navigation, cards and the registration dialog usable across widths', async ({
		page,
	}) => {
		await page.goto('/organizations');
		const nav = page.getByRole('navigation', { name: 'Platform navigation' });
		await expect(nav.getByRole('link', { name: 'Organizations' })).toHaveAttribute(
			'aria-current',
			'page',
		);
		for (const width of [320, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.getByRole('button', { name: 'Register Gym' }).click();
			const dialog = page.getByRole('dialog', { name: 'Register Gym' });
			await expect(dialog.getByLabel('Gym name')).toBeVisible();
			await expect(dialog.getByRole('button', { name: 'Register Gym' })).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
			).toBe(true);
			await dialog.getByRole('button', { name: 'Cancel' }).click();
			await expect(dialog).toBeHidden();
		}
		// At 1440px five cards share a row when the registry has at least five records.
		const cards = page.getByRole('region', { name: 'Organization registry' }).getByRole('listitem');
		if ((await cards.count()) >= 5) {
			const tops = await cards.evaluateAll((items) =>
				items.slice(0, 5).map((item) => Math.round(item.getBoundingClientRect().top)),
			);
			expect(new Set(tops).size).toBe(1);
		}
	});
});
