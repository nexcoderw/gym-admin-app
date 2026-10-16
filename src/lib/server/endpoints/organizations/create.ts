import 'server-only';

import {
	createOrganizationSchema,
	organizationSchema,
	organizationPermissions,
} from '@/lib/contracts/organizations';
import {
	authorizeOrganization,
	organizationInput,
	verifyOrganizationResult,
} from '../../organizations-access';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function createOrganization(input: unknown, context: ForwardContext) {
	const body = organizationInput(createOrganizationSchema, input);
	await authorizeOrganization(context, organizationPermissions.create);
	const result = await upstream(
		'/api/v1/platform/organizations',
		'POST',
		organizationSchema,
		context,
		body,
		201,
		{ domain: 'organizations' },
	);
	return verifyOrganizationResult(result.data, { ...body, status: 'PENDING' });
}
