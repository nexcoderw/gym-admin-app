import 'server-only';

import { NextResponse } from 'next/server';

export class BffError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

export const privateHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

/** Never serialize an upstream error object, stack, URL or provider message. */
export function errorResponse(error: unknown): NextResponse {
	const safe =
		error instanceof BffError
			? error
			: new BffError(502, 'SERVICE_UNAVAILABLE', 'The request could not be completed. Try again.');
	return NextResponse.json(
		{ error: { code: safe.code, message: safe.message } },
		{
			status: safe.status,
			headers: privateHeaders,
		},
	);
}

export function upstreamFailure(status: number): BffError {
	switch (status) {
		case 400:
			return new BffError(400, 'INVALID_INPUT', 'Check the supplied details and try again.');
		case 401:
			return new BffError(
				401,
				'AUTHENTICATION_REQUIRED',
				'Sign in again or check your authentication details.',
			);
		case 403:
			return new BffError(403, 'ACCESS_DENIED', 'This account cannot perform that operation.');
		case 412:
			return new BffError(
				412,
				'MFA_ENROLLMENT_REQUIRED',
				'Contact your operator to complete MFA enrollment.',
			);
		case 429:
			return new BffError(429, 'RATE_LIMITED', 'Too many attempts. Wait before trying again.');
		default:
			return new BffError(
				502,
				'SERVICE_UNAVAILABLE',
				'The request could not be completed. Try again.',
			);
	}
}
