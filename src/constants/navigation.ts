import { Building03Icon, DashboardSquare01Icon } from '@hugeicons/core-free-icons';

import { routes } from './routes';

export const navigation = [
	{
		key: 'overview',
		label: 'Overview',
		href: routes.dashboard,
		icon: DashboardSquare01Icon,
		requiredPermission: 'platform.dashboard.read',
		group: 'Platform',
	},
	{
		key: 'organizations',
		label: 'Organizations',
		href: routes.organizations,
		icon: Building03Icon,
		requiredPermission: 'platform.organizations.read',
		group: 'Platform',
	},
] as const;

/** Presentation only. Every destination must still authorize on the server. */
export function visibleNavigation(permissions: readonly string[]) {
	return navigation.filter((item) => permissions.includes(item.requiredPermission));
}
