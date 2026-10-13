import { expect, test } from '@playwright/test';

test('anonymous dashboard requests redirect to the fixed login page', async ({ page }) => {
	await page.goto('/dashboard?returnTo=https%3A%2F%2Fattacker.example');
	await expect(page).toHaveURL(/\/login$/u);
	await expect(page.getByLabel('Email address')).toBeVisible();
});

test('login is labelled, keyboard reachable, responsive, and reports safe authentication errors', async ({ page }) => {
	await page.route('**/api/auth/login', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED' } }) }));
	await page.goto('/login');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.getByLabel('Email address').fill('operator@example.invalid');
	await page.getByLabel('Password', { exact: true }).fill('fictional long password');
	await page.getByRole('button', { name: 'Continue to verification' }).click();
	await expect(page.getByRole('alert')).toContainText('Authentication was not accepted');
	await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
