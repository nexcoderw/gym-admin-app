import { expect, test } from '@playwright/test';

const pages = [
	{ path: '/401', title: 'Sign in to continue' },
	{ path: '/403', title: 'This area needs permission' },
	{ path: '/404', title: 'Page not found' },
	{ path: '/429', title: 'Let’s pause for a moment' },
	{ path: '/500', title: 'Something interrupted this page' },
	{ path: '/503', title: 'Workspace temporarily unavailable' },
];

for (const state of pages) {
	test(`${state.path} stays centered, readable, and actionable at compact widths`, async ({
		page,
	}) => {
		await page.goto(state.path);
		await expect(page.getByRole('heading', { level: 1, name: state.title })).toBeVisible();
		await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
		for (const width of [320, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
			if (!heading) throw new Error('Expected a visible recovery heading.');
			expect(Math.abs(heading.x + heading.width / 2 - width / 2)).toBeLessThan(2);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
			).toBe(true);
			for (const link of await page.locator('main a').all()) {
				const bounds = await link.boundingBox();
				expect(bounds?.height).toBeGreaterThanOrEqual(44);
			}
		}
	});
}

test('unknown URLs render the actual not-found boundary and its sign-in action works', async ({
	page,
}) => {
	await page.goto('/a-page-that-does-not-exist');
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await page.getByRole('link', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByLabel('Email address')).toBeVisible();
});

test('reduced-motion users receive a static state illustration', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/503');
	const illustration = page.locator('[data-state="503"] > [aria-hidden="true"]');
	await expect(illustration).toHaveCSS('animation-name', 'none');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});

test('login displays the SVG brand and advertises a browser icon', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('header img[src*="nexcode-mark.svg"]')).toBeVisible();
	await expect(page.locator('head link[rel="icon"][href*="icon.svg"]')).toHaveCount(1);
	const icon = await page.request.get('/icon.svg');
	expect(icon.ok()).toBe(true);
	expect(icon.headers()['content-type']).toContain('image/svg+xml');
});
