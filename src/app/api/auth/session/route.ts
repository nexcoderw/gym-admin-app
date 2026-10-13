import { NextResponse } from 'next/server';

import { getSession } from '@/lib/server/endpoints/auth/get-session';
import { clearPlatformCookies } from '@/lib/server/http/cookies';
import { serverEnvironment } from '@/lib/server/environment';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { readContext } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	try {
		return NextResponse.json(await getSession(readContext(request)), { headers: privateHeaders });
	} catch (error) {
		const response = errorResponse(error);
		if (response.status === 401) {
			const env = serverEnvironment();
			const suppliedPlatformCookie = (request.headers.get('cookie') ?? '')
				.split(';')
				.some((part) => {
					const name = part.trim().split('=')[0];
					return name === env.sessionCookie || name === env.csrfCookie;
				});
			// A cross-site anonymous GET must not expire cookies it did not send.
			if (suppliedPlatformCookie) clearPlatformCookies(response);
		}
		return response;
	}
}
