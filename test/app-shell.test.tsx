// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/shared/app-shell';
import { Sidebar } from '@/components/shared/sidebar';
import { isCurrentDestination } from '@/constants/navigation';
import { organizationPermissions } from '@/lib/contracts/organizations';

const location = vi.hoisted(() => ({ pathname: '/organizations' }));
vi.mock('next/navigation', () => ({
	usePathname: () => location.pathname,
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

const allDestinations = ['platform.dashboard.read', organizationPermissions.read];

describe('workspace shell', () => {
	it('puts the signed-in operator and sign out in the topbar, not the sidebar', () => {
		location.pathname = '/organizations';
		render(
			<AppShell permissions={allDestinations} displayName="Fictional Operator">
				<h1>Organizations</h1>
			</AppShell>,
		);
		const topbar = screen.getByRole('banner');
		expect(within(topbar).getByText('Administration workspace')).toBeDefined();
		expect(within(topbar).getByText('Fictional Operator')).toBeDefined();
		expect(within(topbar).getByText('Platform staff')).toBeDefined();
		expect(within(topbar).getByRole('button', { name: 'Sign out' })).toBeDefined();
		const sidebar = screen.getByRole('complementary', { name: 'Platform workspace' });
		expect(within(sidebar).queryByRole('button', { name: 'Sign out' })).toBeNull();
		expect(within(sidebar).queryByText('Fictional Operator')).toBeNull();
		expect(screen.getAllByRole('main')).toHaveLength(1);
	});

	it('keeps the brand and permitted navigation inside the sidebar', () => {
		location.pathname = '/dashboard';
		render(<Sidebar permissions={allDestinations} />);
		const sidebar = screen.getByRole('complementary', { name: 'Platform workspace' });
		expect(within(sidebar).getByText('NEXCODE')).toBeDefined();
		expect(within(sidebar).getByRole('navigation', { name: 'Platform navigation' })).toBeDefined();
		expect(within(sidebar).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe(
			'page',
		);
	});

	it('lists only permitted destinations and never activates a lookalike path prefix', () => {
		location.pathname = '/organizations-archive';
		render(<Sidebar permissions={[organizationPermissions.read]} />);
		const nav = screen.getByRole('navigation', { name: 'Platform navigation' });
		expect(within(nav).queryByRole('link', { name: 'Overview' })).toBeNull();
		expect(
			within(nav).getByRole('link', { name: 'Organizations' }).getAttribute('aria-current'),
		).toBeNull();
		expect(isCurrentDestination('/organizations/1d899ab0', '/organizations')).toBe(true);
		expect(isCurrentDestination('/organizations-archive', '/organizations')).toBe(false);
	});
});
