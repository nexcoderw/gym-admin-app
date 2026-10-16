import { NextResponse } from 'next/server';

import { updateOrganizationSchema } from '@/lib/contracts/organizations';
import { getOrganization } from '@/lib/server/endpoints/organizations/get';
import { updateOrganization } from '@/lib/server/endpoints/organizations/update';
import { organizationRouteError } from '@/lib/server/organizations-access';
import { privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, readContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
	try {
		const context = readContext(request);
		const { id } = await params;
		const result = await getOrganization(id, context);
		return NextResponse.json(result.organization, {
			headers: { ...privateHeaders, ETag: result.etag },
		});
	} catch (error) {
		return organizationRouteError(request, error);
	}
}

export async function PATCH(request: Request, { params }: Context) {
	try {
		const context = mutationContext(request, true);
		const { id } = await params;
		const body = await requestBody(request, updateOrganizationSchema);
		const result = await updateOrganization(id, body, request.headers.get('if-match'), context);
		return NextResponse.json(result, {
			headers: { ...privateHeaders, ETag: `"${result.updatedAt}"` },
		});
	} catch (error) {
		return organizationRouteError(request, error);
	}
}
