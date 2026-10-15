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

	test('archives only its newly registered fictional fixture and retains it in the archived filter', async ({
		page,
	}, testInfo) => {
		if (process.env.PLAYWRIGHT_ORGANIZATIONS_MUTATIONS !== '1') {
			throw new Error(
				'Set PLAYWRIGHT_ORGANIZATIONS_MUTATIONS=1 only for the approved isolated development target.',
			);
		}
		const target = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4000');
		if (!['localhost', '127.0.0.1'].includes(target.hostname)) {
			throw new Error('Organization mutation browser tests are restricted to a local admin origin.');
		}
		const suffix = `${Date.now().toString(36)}-${testInfo.project.name.replace(/[^a-z0-9]+/giu, '-')}`;
		const name = `Step Fourteen ${suffix}`;
		await page.goto('/organizations');
		await page.getByRole('button', { name: 'Register Gym' }).click();
		const registration = page.getByRole('dialog', { name: 'Register Gym' });
		await registration.getByLabel('Gym name').fill(name);
		await registration.getByRole('button', { name: 'Register Gym' }).click();
		await expect(page.getByText(`${name} was registered as a pending gym.`)).toBeVisible();
		await page.getByRole('button', { name }).click();
		await page.getByRole('button', { name: 'Archive gym' }).click();
		const confirmation = page.getByRole('dialog', { name: `Archive ${name}?` });
		await expect(confirmation).toContainText('retaining its registry record and audit history');
		await expect(confirmation).toContainText('slug remains reserved');
		await confirmation.getByRole('button', { name: 'Confirm archival' }).click();
		await expect(
			page.getByText(`${name} has been archived and retained for audit history.`),
		).toBeVisible();
		await expect(page.getByRole('button', { name })).toHaveCount(0);
		await page.getByRole('button', { name: 'Filter by status: All' }).click();
		await page.getByRole('button', { name: 'Archived', exact: true }).click();
		await expect(page.getByRole('button', { name })).toBeVisible();
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
