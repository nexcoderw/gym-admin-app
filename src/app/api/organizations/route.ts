import { NextResponse } from 'next/server';

import { createOrganizationSchema } from '@/lib/contracts/organizations';
import { createOrganization } from '@/lib/server/endpoints/organizations/create';
import { listOrganizations } from '@/lib/server/endpoints/organizations/list';
import { organizationQuery, organizationRouteError } from '@/lib/server/organizations-access';
import { privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, readContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	try {
		const context = readContext(request);
		return NextResponse.json(await listOrganizations(organizationQuery(request), context), { headers: privateHeaders });
	} catch (error) {
		return organizationRouteError(request, error);
	}
}

export async function POST(request: Request) {
	try {
		const context = mutationContext(request, true);
		const body = await requestBody(request, createOrganizationSchema);
		return NextResponse.json(await createOrganization(body, context), { status: 201, headers: privateHeaders });
	} catch (error) {
		return organizationRouteError(request, error);
	}
}
