import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';

import { serverEnvironment } from '../environment';
import { BffError } from './errors';

const TOKEN = /^[A-Za-z0-9_-]{32,256}$/u;

export function platformCookies(header: string | null): Map<string, string> {
	const env = serverEnvironment();
	const allowed = new Set([env.sessionCookie, env.csrfCookie]);
	const values = new Map<string, string>();
	if ((header?.length ?? 0) > 8192)
		throw new BffError(400, 'INVALID_COOKIE', 'Invalid authentication cookies.');
	for (const part of (header ?? '').split(';')) {
		const separator = part.indexOf('=');
		if (separator < 0) continue;
		const name = part.slice(0, separator).trim();
		if (!allowed.has(name)) continue;
		const value = part.slice(separator + 1).trim();
		if (values.has(name) || !TOKEN.test(value))
			throw new BffError(401, 'INVALID_COOKIE', 'Sign in again.');
		values.set(name, value);
	}
	return values;
}

export function forwardedCookies(header: string | null): string {
	return [...platformCookies(header)].map(([name, value]) => `${name}=${value}`).join('; ');
}

export function assertCsrf(header: string | null, cookie: string | undefined): void {
	if (!header || !cookie || !TOKEN.test(header))
		throw new BffError(403, 'CSRF_REJECTED', 'Refresh the sign-in page and try again.');
	const left = Buffer.from(header);
	const right = Buffer.from(cookie);
	if (left.length !== right.length || !timingSafeEqual(left, right))
		throw new BffError(403, 'CSRF_REJECTED', 'Refresh the sign-in page and try again.');
}

/** Only verified attributes are reissued on the frontend host; Domain is never widened. */
export function relayCookies(
	lines: readonly string[],
	response: NextResponse,
	mode: 'challenge' | 'session' | 'logout',
	csrfToken?: string,
): void {
	const env = serverEnvironment();
	const expected =
		mode === 'challenge'
			? [env.csrfCookie]
			: mode === 'session'
				? [env.sessionCookie, env.csrfCookie]
				: [env.sessionCookie];
	const seen = new Set<string>();
	const parsed: { name: string; value: string; expires: Date; httpOnly: boolean }[] = [];
	for (const line of lines) {
		const [pair, ...attributes] = line.split(';');
		if (!pair || line.length > 2048) throw incompatible();
		const separator = pair.indexOf('=');
		const name = pair.slice(0, separator);
		const value = pair.slice(separator + 1);
		if (separator < 0 || !expected.includes(name) || seen.has(name)) throw incompatible();
		seen.add(name);
		const attrs = new Map<string, string>();
		for (const attribute of attributes) {
			const [rawKey, ...rest] = attribute.trim().split('=');
			const key = rawKey?.toLowerCase();
			if (
				!key ||
				attrs.has(key) ||
				!['path', 'expires', 'secure', 'httponly', 'samesite'].includes(key)
			)
				throw incompatible();
			attrs.set(key, rest.join('='));
		}
		const expires = new Date(attrs.get('expires') ?? '');
		const httpOnly = name === env.sessionCookie;
		if (
			attrs.get('path') !== '/' ||
			attrs.get('samesite')?.toLowerCase() !== 'strict' ||
			attrs.has('secure') !== env.secure ||
			attrs.has('httponly') !== httpOnly ||
			!Number.isFinite(expires.getTime())
		)
			throw incompatible();
		if (mode === 'logout') {
			if (value !== '' || expires.getTime() > Date.now()) throw incompatible();
		} else if (!TOKEN.test(value) || expires.getTime() <= Date.now()) {
			throw incompatible();
		}
		if (name === env.csrfCookie && value !== csrfToken) throw incompatible();
		parsed.push({ name, value, expires, httpOnly });
	}
	if (expected.some((name) => !seen.has(name))) throw incompatible();
	// Validate the complete set before mutating the response.
	for (const cookie of parsed) {
		response.cookies.set(cookie.name, cookie.value, {
			httpOnly: cookie.httpOnly,
			secure: env.secure,
			sameSite: 'strict',
			path: '/',
			expires: cookie.expires,
		});
	}
	if (mode === 'logout') {
		response.cookies.set(env.csrfCookie, '', {
			httpOnly: false,
			secure: env.secure,
			sameSite: 'strict',
			path: '/',
			expires: new Date(0),
		});
	}
}

function incompatible(): BffError {
	return new BffError(
		502,
		'AUTHENTICATION_UNAVAILABLE',
		'Authentication is temporarily unavailable. Contact your operator.',
	);
}
