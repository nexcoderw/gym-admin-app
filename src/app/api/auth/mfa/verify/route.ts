import { NextResponse } from 'next/server';

import { verifyMfaRequestSchema } from '@/lib/contracts/auth';
import { verifyMfa } from '@/lib/server/endpoints/auth/verify-mfa';
import { relayCookies } from '@/lib/server/http/cookies';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
	try {
		const context = mutationContext(request, true);
		const result = await verifyMfa(await requestBody(request, verifyMfaRequestSchema), context);
		const response = NextResponse.json(result.data, { headers: privateHeaders });
		relayCookies(result.cookies, response, 'session', result.data.csrfToken);
		return response;
	} catch (error) {
		return errorResponse(error);
	}
}
