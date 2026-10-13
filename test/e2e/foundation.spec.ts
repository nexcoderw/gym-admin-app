import { expect, test } from '@playwright/test';

test('anonymous dashboard requests redirect to the fixed login page', async ({ page }) => {
	await page.goto('/dashboard?returnTo=https%3A%2F%2Fattacker.example');
	await expect(page).toHaveURL(/\/login$/u);
	await expect(page.getByLabel('Email address')).toBeVisible();
});

test('light login uses the two font roles and remains usable at compact widths', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
	await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await expect(page.locator('body')).toHaveCSS('font-family', /DM/);
	await expect(page.locator('h1')).toHaveCSS('font-family', /Albert/);

	const email = page.getByLabel('Email address');
	const submit = page.getByRole('button', { name: 'Continue to verification' });
	await expect(email).toHaveCSS('font-size', '16px');
	await expect(submit).toHaveCSS('background-color', 'rgb(0, 48, 135)');

	for (const width of [320, 375, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		await expect(email).toBeVisible();
		await expect(submit).toBeVisible();
		const bounds = await submit.boundingBox();
		expect(bounds?.height).toBeGreaterThanOrEqual(44);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
		).toBe(true);
	}
});

test('login is labelled, keyboard reachable, responsive, and reports safe authentication errors', async ({
	page,
}) => {
	await page.route('**/api/auth/login', (route) =>
		route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED' } }),
		}),
	);
	await page.goto('/login');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.getByLabel('Email address').fill('operator@example.invalid');
	await page.getByLabel('Password', { exact: true }).fill('fictional long password');
	await page.getByRole('button', { name: 'Continue to verification' }).click();
	await expect(page.getByRole('alert')).toContainText('Authentication was not accepted');
	await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true,
	);
});
