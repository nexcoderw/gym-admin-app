import { NextResponse } from 'next/server';

import { getSummary } from '@/lib/server/endpoints/dashboard/get-summary';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { readContext } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	try {
		return NextResponse.json(await getSummary(readContext(request)), { headers: privateHeaders });
	} catch (error) {
		return errorResponse(error);
	}
}
