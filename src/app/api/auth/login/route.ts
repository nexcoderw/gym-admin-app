import { NextResponse } from 'next/server';

import { loginRequestSchema } from '@/lib/contracts/auth';
import { login } from '@/lib/server/endpoints/auth/login';
import { relayCookies } from '@/lib/server/http/cookies';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
	try {
		const context = mutationContext(request, false);
		const result = await login(await requestBody(request, loginRequestSchema), context);
		const response = NextResponse.json(result.data, { headers: privateHeaders });
		relayCookies(result.cookies, response, 'challenge', result.data.csrfToken);
		return response;
	} catch (error) {
		return errorResponse(error);
	}
}
