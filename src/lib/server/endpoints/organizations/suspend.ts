import 'server-only';

import { organizationActionSchema, organizationIdSchema, organizationSchema, organizationPermissions } from '@/lib/contracts/organizations';
import { authorizeOrganization, organizationInput, verifyOrganizationResult } from '../../organizations-access';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function suspendOrganization(inputId: unknown, input: unknown, context: ForwardContext) {
	const id = organizationInput(organizationIdSchema, inputId);
	const body = organizationInput(organizationActionSchema, input);
	await authorizeOrganization(context, organizationPermissions.suspend);
	const result = await upstream(`/api/v1/platform/organizations/${id}/suspension`, 'POST', organizationSchema, context, body, 200, { domain: 'organizations' });
	return verifyOrganizationResult(result.data, { id, status: 'SUSPENDED' });
}
