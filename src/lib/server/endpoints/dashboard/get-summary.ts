import 'server-only';

import { summarySchema } from '@/lib/contracts/dashboard';
import { BffError } from '../../http/errors';
import { upstream, type ForwardContext } from '../../http/upstream';
import { getSession } from '../auth/get-session';

/** Nest PlatformDashboardController.getSummary. Independent BFF permission check, then Nest authority. */
export async function getSummary(context: ForwardContext) {
	const session = await getSession(context);
	if (!session.permissions.includes('platform.dashboard.read'))
		throw new BffError(403, 'ACCESS_DENIED', 'Your account does not have dashboard access.');
	const result = await upstream(
		'/api/v1/platform/dashboard/summary',
		'GET',
		summarySchema,
		context,
	);
	if (result.cookies.length > 0)
		throw new BffError(
			502,
			'INVALID_SERVICE_RESPONSE',
			'The dashboard is temporarily unavailable.',
		);
	return result.data;
}
