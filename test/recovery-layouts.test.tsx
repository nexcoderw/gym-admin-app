// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardLayout from '@/app/dashboard/layout';
import OrganizationsLayout from '@/app/organizations/layout';
import DashboardError from '@/app/dashboard/error';
import OrganizationsError from '@/app/organizations/error';
import { OrganizationProblem } from '@/components/organizations/organization-problem';
import { requirePlatformSession } from '@/lib/server/session';
import { session } from './fixtures';

vi.mock('@/lib/server/session', () => ({ requirePlatformSession: vi.fn() }));
// Composition tests use an already validated session; backend authorization is not under test here.
vi.mock('@/components/auth/session-lifecycle', () => ({ SessionLifecycle: () => null }));
beforeEach(() => {
	vi.mocked(requirePlatformSession).mockReset().mockResolvedValue(session);
});
afterEach(cleanup);

describe('protected route recovery composition', () => {
	it.each([401, 403, 404, 429, 500, 503])(
		'renders organization state %s outside sidebar and topbar',
		async (status) => {
			render(
				await OrganizationsLayout({
					children: <OrganizationProblem status={status} message="Safe recovery guidance." />,
				}),
			);
			expect(requirePlatformSession).toHaveBeenCalledOnce();
			expect(screen.getAllByRole('main')).toHaveLength(1);
			expect(screen.queryByRole('complementary')).toBeNull();
			expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
		},
	);
	it.each([
		{ layout: DashboardLayout, error: DashboardError },
		{ layout: OrganizationsLayout, error: OrganizationsError },
	])('keeps route error boundaries independent of workspace chrome: %#', async (entry) => {
		const Boundary = entry.error;
		render(
			await entry.layout({
				children: (
					<Boundary error={new Error('Never render diagnostics')} retry={vi.fn<() => void>()} />
				),
			}),
		);
		expect(screen.getAllByRole('main')).toHaveLength(1);
		expect(screen.queryByRole('complementary')).toBeNull();
		expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
		expect(screen.queryByText('Never render diagnostics')).toBeNull();
	});
});
