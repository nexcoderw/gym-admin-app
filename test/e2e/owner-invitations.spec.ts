import { expect, test } from '@playwright/test';

import { ownerInvitation } from '../owner-invitation-fixtures';

const gymName = process.env.PLAYWRIGHT_OWNER_INVITATIONS_GYM_NAME ?? 'Soho Gym';

test.describe('owner invitation management with controlled browser responses', () => {
	test.use({ storageState: process.env.PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE });
	test.beforeEach(() => {
		if (!process.env.PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE) {
			throw new Error('Provide an approved disposable administrator session with organization-read and all three owner-invitation permissions.');
		}
	});

	test('opens, creates, reviews and revokes a fictional invitation without sending live mutations', async ({ page }) => {
		let row: typeof ownerInvitation | null = null;
		await page.route('**/api/organizations/*/owner-invitations**', async (route) => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			const organizationId = path.split('/')[3];
			if (!organizationId) throw new Error('Expected an organization UUID.');
			if (request.method() === 'POST' && path.endsWith('/revocation')) {
				expect(request.postData()).toBeNull();
				if (row === null) throw new Error('No fictional invitation was created.');
				row = { ...row, status: 'REVOKED', revokedAt: '2026-10-16T09:00:00.000Z' };
				await route.fulfill({ json: row });
			} else if (request.method() === 'POST') {
				expect(request.postDataJSON()).toEqual({ displayName: 'Aline Uwase', email: 'aline@example.com' });
				row = { ...ownerInvitation, organizationId };
				await route.fulfill({ status: 201, json: row });
			} else {
				await route.fulfill({ json: { items: row ? [row] : [], nextCursor: null } });
			}
		});
		await page.goto('/organizations');
		const registry = page.getByRole('region', { name: 'Organization registry' });
		await registry.getByRole('button', { name: gymName, exact: true }).click();
		const details = page.getByRole('dialog');
		await expect(details.getByText('Registry record')).toBeVisible();
		await details.getByRole('button', { name: 'Manage owner invitations' }).click();
		await expect(page.getByText('No owner invitations yet')).toBeVisible();
		await page.getByRole('button', { name: 'Create invitation' }).click();
		await expect(page.getByLabel('Owner full name')).toBeFocused();
		await page.getByLabel('Owner full name').fill('Aline Uwase');
		await page.getByLabel('Owner email address').fill('aline@example.com');
		await page.getByLabel('Owner email address').press('Enter');
		await expect(page.getByText('Owner invitation created. Email delivery is not enabled yet.')).toBeVisible();
		await expect(page.getByText('aline@example.com', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Revoke invitation' }).click();
		await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
		await page.getByRole('button', { name: 'Cancel', exact: true }).press('Tab');
		await expect(page.getByRole('button', { name: 'Revoke invitation' })).toBeFocused();
		await page.getByRole('button', { name: 'Revoke invitation' }).press('Enter');
		await expect(page.getByText('This invitation can no longer be used.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Revoke invitation' })).toHaveCount(0);
		await expect(page.getByRole('dialog')).toHaveCount(1);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('button', { name: 'Manage owner invitations' })).toBeFocused();
		await expect(page.getByText('Registry record')).toBeVisible();
	});
});

const restrictedProfiles = [
	{ name: 'create only', state: process.env.PLAYWRIGHT_OWNER_INVITATIONS_CREATE_ONLY_STATE, canRead: false, canCreate: true, canManage: true },
	{ name: 'read only', state: process.env.PLAYWRIGHT_OWNER_INVITATIONS_READ_ONLY_STATE, canRead: true, canCreate: false, canManage: true },
	{ name: 'no invitation access', state: process.env.PLAYWRIGHT_OWNER_INVITATIONS_NO_ACCESS_STATE, canRead: false, canCreate: false, canManage: false },
] as const;

for (const profile of restrictedProfiles) {
	test.describe(`owner invitation ${profile.name} permission profile`, () => {
		test.use({ storageState: profile.state });
		test('keeps invitation permissions separate', async ({ page }) => {
			if (!profile.state) throw new Error(`Provide an approved ${profile.name} disposable session file; see README.`);
			let reads = 0;
			await page.route('**/api/organizations/*/owner-invitations**', async (route) => {
				if (!profile.canRead) throw new Error('Invitation history was fetched without read permission.');
				reads += 1;
				const organizationId = new URL(route.request().url()).pathname.split('/')[3];
				await route.fulfill({ json: { items: [{ ...ownerInvitation, organizationId }], nextCursor: null } });
			});
			await page.goto('/organizations');
			await page.getByRole('region', { name: 'Organization registry' }).getByRole('button', { name: gymName, exact: true }).click();
			if (!profile.canManage) {
				await expect(page.getByRole('button', { name: 'Manage owner invitations' })).toHaveCount(0);
				expect(reads).toBe(0);
				return;
			}
			await page.getByRole('button', { name: 'Manage owner invitations' }).click();
			if (profile.canRead) await expect(page.getByText('aline@example.com', { exact: true })).toBeVisible();
			else {
				await expect(page.getByText('Invitation history needs permission')).toBeVisible();
				expect(reads).toBe(0);
				await expect(page.getByText('aline@example.com', { exact: true })).toHaveCount(0);
			}
			await expect(page.getByRole('button', { name: 'Create invitation' })).toHaveCount(profile.canCreate ? 1 : 0);
			await expect(page.getByRole('button', { name: 'Revoke invitation' })).toHaveCount(0);
		});
	});
}
