import 'server-only';

import {
	organizationEtagSchema,
	organizationIdSchema,
	updateOrganizationSchema,
	organizationSchema,
	organizationPermissions,
} from '@/lib/contracts/organizations';
import {
	authorizeOrganization,
	organizationInput,
	verifyOrganizationResult,
} from '../../organizations-access';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function updateOrganization(
	inputId: unknown,
	input: unknown,
	inputEtag: unknown,
	context: ForwardContext,
) {
	const id = organizationInput(organizationIdSchema, inputId);
	const body = organizationInput(updateOrganizationSchema, input);
	const ifMatch = organizationInput(organizationEtagSchema, inputEtag);
	await authorizeOrganization(context, organizationPermissions.update);
	const result = await upstream(
		`/api/v1/platform/organizations/${id}`,
		'PATCH',
		organizationSchema,
		context,
		body,
		200,
		{ domain: 'organizations', ifMatch },
	);
	return verifyOrganizationResult(result.data, { id, name: body.name });
}
