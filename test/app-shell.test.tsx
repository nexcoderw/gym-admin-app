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
	it('frames the page with the sidebar, the topbar text and one main region', () => {
		location.pathname = '/organizations';
		render(
			<AppShell permissions={allDestinations} displayName="Fictional Operator">
				<h1>Organizations</h1>
			</AppShell>,
		);
		expect(screen.getByRole('complementary', { name: 'Platform workspace' })).toBeDefined();
		expect(screen.getAllByRole('main')).toHaveLength(1);
		expect(screen.getByText('Administration workspace')).toBeDefined();
	});

	it('keeps brand, navigation, the signed-in operator and sign out inside the sidebar', () => {
		location.pathname = '/dashboard';
		render(<Sidebar permissions={allDestinations} displayName="Fictional Operator" />);
		const sidebar = screen.getByRole('complementary', { name: 'Platform workspace' });
		expect(within(sidebar).getByText('NEXCODE')).toBeDefined();
		expect(within(sidebar).getByRole('navigation', { name: 'Platform navigation' })).toBeDefined();
		expect(within(sidebar).getByText('Fictional Operator')).toBeDefined();
		expect(within(sidebar).getByText('Platform staff')).toBeDefined();
		expect(within(sidebar).getByRole('button', { name: 'Sign out' })).toBeDefined();
		expect(within(sidebar).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe(
			'page',
		);
	});

	it('lists only permitted destinations and never activates a lookalike path prefix', () => {
		location.pathname = '/organizations-archive';
		render(<Sidebar permissions={[organizationPermissions.read]} displayName="Fictional Operator" />);
		const nav = screen.getByRole('navigation', { name: 'Platform navigation' });
		expect(within(nav).queryByRole('link', { name: 'Overview' })).toBeNull();
		expect(
			within(nav).getByRole('link', { name: 'Organizations' }).getAttribute('aria-current'),
		).toBeNull();
		expect(isCurrentDestination('/organizations/1d899ab0', '/organizations')).toBe(true);
		expect(isCurrentDestination('/organizations-archive', '/organizations')).toBe(false);
	});
});
