// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/shared/app-shell';
import { currentDestination, isCurrentDestination } from '@/constants/navigation';
import { organizationPermissions } from '@/lib/contracts/organizations';

const location = vi.hoisted(() => ({ pathname: '/organizations' }));
vi.mock('next/navigation', () => ({
	usePathname: () => location.pathname,
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

function renderShell(
	permissions: readonly string[] = ['platform.dashboard.read', organizationPermissions.read],
) {
	return render(
		<AppShell permissions={permissions} displayName="Fictional Operator">
			<h1>Organizations</h1>
		</AppShell>,
	);
}

describe('workspace shell', () => {
	it('exposes the sidebar, topbar, grouped navigation, breadcrumb and one main region', () => {
		location.pathname = '/organizations';
		renderShell();
		expect(screen.getByRole('complementary', { name: 'Platform workspace' })).toBeDefined();
		expect(screen.getByRole('banner')).toBeDefined();
		expect(screen.getAllByRole('main')).toHaveLength(1);
		const nav = screen.getByRole('navigation', { name: 'Platform navigation' });
		expect(within(nav).getByRole('list', { name: 'Platform' })).toBeDefined();
		expect(
			within(nav).getByRole('link', { name: 'Organizations' }).getAttribute('aria-current'),
		).toBe('page');
		expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe(
			null,
		);
		const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
		expect(within(breadcrumb).getByText('NEXCODE Gym')).toBeDefined();
		expect(within(breadcrumb).getByText('Organizations').getAttribute('aria-current')).toBe('page');
		expect(screen.getByText('Administration workspace')).toBeDefined();
	});

	it('shows the signed-in operator and sign out in the topbar, not the sidebar', () => {
		location.pathname = '/dashboard';
		renderShell();
		const topbar = screen.getByRole('banner');
		expect(within(topbar).getByText('Fictional Operator')).toBeDefined();
		expect(within(topbar).getByText('Platform staff')).toBeDefined();
		expect(within(topbar).getByText('FO').getAttribute('aria-hidden')).toBe('true');
		expect(within(topbar).getByRole('button', { name: 'Sign out' })).toBeDefined();
		const sidebar = screen.getByRole('complementary', { name: 'Platform workspace' });
		expect(within(sidebar).getByText('Administration workspace')).toBeDefined();
		expect(within(sidebar).queryByRole('button', { name: 'Sign out' })).toBeNull();
		expect(within(sidebar).queryByText('Fictional Operator')).toBeNull();
	});

	it('lists only permitted destinations and never activates a lookalike path prefix', () => {
		location.pathname = '/organizations-archive';
		renderShell([organizationPermissions.read]);
		const nav = screen.getByRole('navigation', { name: 'Platform navigation' });
		expect(within(nav).queryByRole('link', { name: 'Overview' })).toBeNull();
		expect(
			within(nav).getByRole('link', { name: 'Organizations' }).getAttribute('aria-current'),
		).toBeNull();
		const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
		expect(within(breadcrumb).queryByText('Organizations')).toBeNull();
		expect(isCurrentDestination('/organizations/1d899ab0', '/organizations')).toBe(true);
		expect(currentDestination('/dashboard')?.label).toBe('Overview');
	});
});
