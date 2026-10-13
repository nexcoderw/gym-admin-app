import { NextResponse } from 'next/server';

import { getSession } from '@/lib/server/endpoints/auth/get-session';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { readContext } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	try {
		return NextResponse.json(await getSession(readContext(request)), { headers: privateHeaders });
	} catch (error) {
		return errorResponse(error);
	}
}
