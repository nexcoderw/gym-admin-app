import { NextResponse } from 'next/server';

import { logout } from '@/lib/server/endpoints/auth/logout';
import { relayCookies } from '@/lib/server/http/cookies';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { mutationContext } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
	try {
		const result = await logout(mutationContext(request, true));
		const response = new NextResponse(null, { status: 204, headers: privateHeaders });
		relayCookies(result.cookies, response, 'logout');
		return response;
	} catch (error) {
		return errorResponse(error);
	}
}
