import { NextResponse } from 'next/server';

import { revokeOwnerInvitation } from '@/lib/server/endpoints/owner-invitations/revoke';
import { organizationRouteError } from '@/lib/server/organizations-access';
import { privateHeaders } from '@/lib/server/http/errors';
import { assertEmptyRequestBody, mutationContext } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string; invitationId: string }> },
) {
	try {
		const context = mutationContext(request, true);
		await assertEmptyRequestBody(request, 'Revocation does not accept a request body.');
		const { id, invitationId } = await params;
		const data = await revokeOwnerInvitation(id, invitationId, context);
		return NextResponse.json(data, { headers: privateHeaders });
	} catch (error) {
		return organizationRouteError(request, error);
	}
}
