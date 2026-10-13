import 'server-only';

import { organizationListQuerySchema, organizationListSchema, organizationPermissions } from '@/lib/contracts/organizations';
import { authorizeOrganization, organizationInput } from '../../organizations-access';
import { upstream, type ForwardContext } from '../../http/upstream';
import { BffError } from '../../http/errors';

export async function listOrganizations(input: unknown, context: ForwardContext) {
	const query = organizationInput(organizationListQuerySchema, input);
	await authorizeOrganization(context, organizationPermissions.read);
	const params = new URLSearchParams({ limit: String(query.limit) });
	if (query.status) params.set('status', query.status);
	if (query.cursor) params.set('cursor', query.cursor);
	const result = await upstream('/api/v1/platform/organizations', 'GET', organizationListSchema, context, undefined, 200, { domain: 'organizations', query: params });
	if (result.data.items.length > query.limit || query.status && result.data.items.some((item) => item.status !== query.status)) {
		throw new BffError(502, 'INVALID_SERVICE_RESPONSE', 'The organization list was incompatible. Restart the list when the service is available.');
	}
	return result.data;
}
