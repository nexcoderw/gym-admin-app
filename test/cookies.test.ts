import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { relayCookies } from '@/lib/server/http/cookies';
import { csrf, token } from './fixtures';

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('ADMIN_ORIGIN', 'https://admin.gym.rw');
	vi.stubEnv('GYM_API_BASE_URL', 'https://api.gym.rw');
});
afterEach(() => vi.unstubAllEnvs());
const attributes = 'Path=/; Expires=Mon, 01 Jan 2035 08:00:00 GMT; Secure; SameSite=Strict';

describe('host-only BFF cookie relay', () => {
	const lines = () => [
		`__Host-nexcode-platform-session=${token}; ${attributes}; HttpOnly`,
		`__Host-nexcode-platform-csrf=${csrf}; ${attributes}`,
	];
	it('reissues only expected host-only Secure cookies with matching CSRF', () => {
		const response = NextResponse.json({ status: 'authenticated' });
		relayCookies(lines(), response, 'session', csrf);
		const cookies = response.headers.getSetCookie();
		expect(cookies).toHaveLength(2);
		expect(cookies[0]).toContain('HttpOnly');
		expect(cookies[0]).toContain('Secure');
		expect(cookies.join(';')).not.toContain('Domain');
		expect(cookies.join(';')).toContain('SameSite=strict');
	});
	it.each(['; Domain=.gym.rw', '; SameSite=None', '; Path=/other'])('rejects incompatible attributes %s before setting any cookie', (extra) => {
		const response = NextResponse.json({});
		expect(() => relayCookies([`${lines()[0]}${extra}`, ...lines().slice(1)], response, 'session', csrf)).toThrow();
		expect(response.headers.getSetCookie()).toHaveLength(0);
	});
	it('rejects missing, duplicate, non-secure, unexpected and body-mismatched cookies', () => {
		for (const cookies of [[], [lines()[0] ?? ''], [...lines(), lines()[0] ?? ''], lines().map((line) => line.replace('; Secure', '')), ['other=secret'], lines()]) {
			expect(() => relayCookies(cookies, NextResponse.json({}), 'session', token)).toThrow();
		}
	});
	it('clears both frontend cookies after a compatible upstream logout', () => {
		const response = new NextResponse(null, { status: 204 });
		relayCookies(['__Host-nexcode-platform-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict'], response, 'logout');
		expect(response.cookies.get('__Host-nexcode-platform-session')?.value).toBe('');
		expect(response.cookies.get('__Host-nexcode-platform-csrf')?.value).toBe('');
	});
});
