import { NextResponse } from 'next/server';

import { emailOtpRequestSchema } from '@/lib/contracts/auth';
import { sendEmailOtp } from '@/lib/server/endpoints/auth/send-email-otp';
import { errorResponse, privateHeaders } from '@/lib/server/http/errors';
import { mutationContext, requestBody } from '@/lib/server/http/request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
	try {
		const context = mutationContext(request, true);
		const result = await sendEmailOtp(await requestBody(request, emailOtpRequestSchema), context);
		// Email delivery never issues or rotates authentication cookies.
		if (result.cookies.length > 0) throw new Error('Unexpected authentication cookie.');
		return NextResponse.json(result.data, { headers: privateHeaders });
	} catch (error) {
		return errorResponse(error);
	}
}
