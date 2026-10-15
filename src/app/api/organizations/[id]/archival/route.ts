import { NextResponse } from 'next/server';

import { organizationActionSchema } from '@/lib/contracts/organizations';
import { archiveOrganization } from '@/lib/server/endpoints/organizations/archive';
import { organizationRouteError } from '@/lib/server/organizations-access';
import { privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const context = mutationContext(request, true);
		const { id } = await params;
		const body = await requestBody(request, organizationActionSchema);
		const result = await archiveOrganization(id, body, context);
		return NextResponse.json(result, { headers: privateHeaders });
	} catch (error) {
		return organizationRouteError(request, error);
	}
}
