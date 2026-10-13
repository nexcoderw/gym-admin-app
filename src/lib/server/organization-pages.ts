import 'server-only';

import { redirect } from 'next/navigation';
import { routes } from '@/constants/routes';
import type { OrganizationPermission } from '@/lib/contracts/organizations';
import { BffError } from './http/errors';
import { requirePlatformSession } from './session';

/** Keeps Next redirects and rendering out of the data-loading error handler. */
export async function organizationPage<T>(permission: OrganizationPermission, load: () => Promise<T>) {
	try {
		const session = await requirePlatformSession();
		if (!session.permissions.includes(permission)) {
			throw new BffError(403, 'ACCESS_DENIED', 'Your account does not have the required organization permission.');
		}
		return { ok: true, value: await load(), permissions: session.permissions } as const;
	} catch (error) {
		if (!(error instanceof BffError)) throw error;
		if (error.status === 401) redirect(routes.login);
		return { ok: false, status: error.status, message: error.message } as const;
	}
}
