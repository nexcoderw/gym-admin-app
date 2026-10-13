import 'server-only';

import { organizationEtagSchema, organizationIdSchema, organizationSchema, organizationPermissions } from '@/lib/contracts/organizations';
import { authorizeOrganization, organizationInput, verifyOrganizationResult } from '../../organizations-access';
import { BffError } from '../../http/errors';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function getOrganization(input: unknown, context: ForwardContext) {
	const id = organizationInput(organizationIdSchema, input);
	await authorizeOrganization(context, organizationPermissions.read);
	const result = await upstream(`/api/v1/platform/organizations/${id}`, 'GET', organizationSchema, context, undefined, 200, { domain: 'organizations' });
	const etag = organizationEtagSchema.safeParse(result.etag);
	verifyOrganizationResult(result.data, { id });
	if (!etag.success || etag.data !== `"${result.data.updatedAt}"`) {
		throw new BffError(502, 'INVALID_SERVICE_RESPONSE', 'Reload the organization when the service is available.');
	}
	return { organization: result.data, etag: etag.data };
}
