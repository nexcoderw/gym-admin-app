import { NextResponse } from 'next/server';
import { sendOwnerInvitation } from '@/lib/server/endpoints/owner-invitations/send';
import { organizationRouteError } from '@/lib/server/organizations-access';
import { BffError, privateHeaders } from '@/lib/server/http/errors';
import { mutationContext } from '@/lib/server/http/request';

export const runtime = 'nodejs';
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string; invitationId: string }> },
) {
	try {
		const context = mutationContext(request, true);
		if (request.body !== null)
			throw new BffError(
				400,
				'OWNER_INVITATION_INVALID_INPUT',
				'Delivery does not accept a request body.',
			);
		const { id, invitationId } = await params;
		return NextResponse.json(await sendOwnerInvitation(id, invitationId, context), {
			status: 202,
			headers: privateHeaders,
		});
	} catch (error) {
		return organizationRouteError(request, error);
	}
}
