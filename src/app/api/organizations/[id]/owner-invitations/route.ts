import { NextResponse } from 'next/server';

import { createOwnerInvitationSchema } from '@/lib/contracts/owner-invitations';
import { createOwnerInvitation } from '@/lib/server/endpoints/owner-invitations/create';
import { listOwnerInvitations } from '@/lib/server/endpoints/owner-invitations/list';
import { ownerInvitationQuery } from '@/lib/server/owner-invitations-access';
import { organizationRouteError } from '@/lib/server/organizations-access';
import { privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, readContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
	try {
		const context = readContext(request);
		const { id } = await params;
		const data = await listOwnerInvitations(id, ownerInvitationQuery(request), context);
		return NextResponse.json(data, { headers: privateHeaders });
	} catch (error) {
		return organizationRouteError(request, error);
	}
}

export async function POST(request: Request, { params }: Context) {
	try {
		const context = mutationContext(request, true);
		const { id } = await params;
		const body = await requestBody(request, createOwnerInvitationSchema);
		const data = await createOwnerInvitation(id, body, context);
		return NextResponse.json(data, { status: 201, headers: privateHeaders });
	} catch (error) {
		return organizationRouteError(request, error);
	}
}
