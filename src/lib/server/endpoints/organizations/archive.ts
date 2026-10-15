import 'server-only';

import {
	organizationActionSchema,
	organizationIdSchema,
	organizationPermissions,
	organizationSchema,
} from '@/lib/contracts/organizations';
import {
	authorizeOrganization,
	organizationInput,
	verifyOrganizationResult,
} from '../../organizations-access';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function archiveOrganization(
	inputId: unknown,
	input: unknown,
	context: ForwardContext,
) {
	const id = organizationInput(organizationIdSchema, inputId);
	const body = organizationInput(organizationActionSchema, input);
	await authorizeOrganization(context, organizationPermissions.archive);
	const result = await upstream(
		`/api/v1/platform/organizations/${id}/archival`,
		'POST',
		organizationSchema,
		context,
		body,
		200,
		{ domain: 'organizations' },
	);
	return verifyOrganizationResult(result.data, { id, status: 'ARCHIVED' });
}
