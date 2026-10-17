import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as login } from '@/app/api/auth/login/route';
import { POST as verify } from '@/app/api/auth/mfa/verify/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as summary } from '@/app/api/dashboard/summary/route';
import { GET as getSession } from '@/app/api/auth/session/route';
import { csrf, token, expiration } from './fixtures';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('frontend-owned BFF routes', () => {
	it.each([
		{ email: 'not-an-email', password: 'fictional long password' },
		{ email: 'operator@example.invalid', password: '12345678' },
		{ email: 'operator@example.invalid', password: '12345678901' },
		{
			email: 'operator@example.invalid',
			password: 'fictional long password',
			role: 'platform.owner',
		},
	])('rejects invalid login DTOs before forwarding: %#', async (body) => {
		const response = await login(
			new Request('http://localhost:4000/api/auth/login', {
				method: 'POST',
				headers: { Origin: 'http://localhost:4000', 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			}),
		);
		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('does not clear credentials for an anonymous session read', async () => {
		const response = await getSession(new Request('http://localhost:4000/api/auth/session'));
		expect(response.status).toBe(401);
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('expires both local cookies after a confirmed backend session rejection', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		const response = await getSession(
			new Request('http://localhost:4000/api/auth/session', {
				headers: { Cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}` },
			}),
		);
		expect(response.status).toBe(401);
		for (const name of ['nexcode-platform-session', 'nexcode-platform-csrf']) {
			expect(response.cookies.get(name)?.value).toBe('');
			expect(response.cookies.get(name)?.expires).toEqual(new Date(0));
		}
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it.each([500, 503])(
		'keeps cookies when the session service is unavailable: %s',
		async (status) => {
			fetchMock.mockResolvedValue(Response.json({}, { status }));
			const response = await getSession(
				new Request('http://localhost:4000/api/auth/session', {
					headers: { Cookie: `nexcode-platform-session=${token}` },
				}),
			);
			expect(response.status).toBe(status === 503 ? 503 : 502);
			expect(response.headers.get('set-cookie')).toBeNull();
			expect(fetchMock).toHaveBeenCalledTimes(status === 503 ? 2 : 1);
		},
	);

	it('preserves secure cookie attributes when expiring a rejected production session', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('ADMIN_ORIGIN', 'https://admin.example.invalid');
		vi.stubEnv('GYM_API_BASE_URL', 'https://api.example.invalid');
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		const response = await getSession(
			new Request('https://admin.example.invalid/api/auth/session', {
				headers: { Cookie: `__Host-nexcode-platform-session=${token}` },
			}),
		);
		expect(response.status).toBe(401);
		const sessionCookie = response.cookies.get('__Host-nexcode-platform-session');
		const csrfCookie = response.cookies.get('__Host-nexcode-platform-csrf');
		expect(sessionCookie).toMatchObject({
			value: '',
			secure: true,
			httpOnly: true,
			path: '/',
			sameSite: 'strict',
		});
		expect(csrfCookie).toMatchObject({
			value: '',
			secure: true,
			httpOnly: false,
			path: '/',
			sameSite: 'strict',
		});
	});

	it('rejects foreign Origin before login forwarding', async () => {
		const response = await login(
			new Request('http://localhost:4000/api/auth/login', {
				method: 'POST',
				headers: { Origin: 'https://attacker.example' },
			}),
		);
		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
	it('rejects malformed JSON and missing MFA/logout CSRF before forwarding', async () => {
		const response = await login(
			new Request('http://localhost:4000/api/auth/login', {
				method: 'POST',
				headers: { Origin: 'http://localhost:4000', 'Content-Type': 'application/json' },
				body: '{bad',
			}),
		);
		expect(response.status).toBe(400);
		for (const handler of [verify, logout]) {
			expect(
				(
					await handler(
						new Request('http://localhost:4000/api/auth/logout', {
							method: 'POST',
							headers: { Origin: 'http://localhost:4000' },
						}),
					)
				).status,
			).toBe(403);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('protects session and dashboard routes independently of page layouts', async () => {
		for (const handler of [getSession, summary]) {
			const response = await handler(new Request('http://localhost:4000/api/dashboard/summary'));
			expect(response.status).toBe(401);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('returns a challenge while reissuing only the expected CSRF cookie', async () => {
		const headers = new Headers({ 'Content-Type': 'application/json' });
		headers.append(
			'Set-Cookie',
			`nexcode-platform-csrf=${csrf}; Path=/; Expires=Mon, 01 Jan 2035 08:00:00 GMT; SameSite=Strict`,
		);
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					challengeToken: token,
					csrfToken: csrf,
					expiresAt: expiration,
					methods: ['totp'],
				}),
				{ headers },
			),
		);
		const response = await login(
			new Request('http://localhost:4000/api/auth/login', {
				method: 'POST',
				headers: { Origin: 'http://localhost:4000', 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'operator@example.invalid',
					password: 'fictional long password',
				}),
			}),
		);
		expect(response.status).toBe(200);
		expect(response.cookies.get('nexcode-platform-csrf')?.value).toBe(csrf);
		expect(response.cookies.get('nexcode-platform-session')).toBeUndefined();
	});

	it('reissues the MFA session as HttpOnly and clears both cookies on logout', async () => {
		const headers = new Headers({ 'Content-Type': 'application/json' });
		const attrs = 'Path=/; Expires=Mon, 01 Jan 2035 08:00:00 GMT; SameSite=Strict';
		headers.append('Set-Cookie', `nexcode-platform-session=${token}; ${attrs}; HttpOnly`);
		headers.append('Set-Cookie', `nexcode-platform-csrf=${csrf}; ${attrs}`);
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					status: 'authenticated',
					expiresAt: expiration,
					csrfToken: csrf,
					sessionToken: 'must-be-stripped',
				}),
				{ headers },
			),
		);
		const browserHeaders = {
			Origin: 'http://localhost:4000',
			'Content-Type': 'application/json',
			Cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`,
			'x-platform-csrf-token': csrf,
		};
		const response = await verify(
			new Request('http://localhost:4000/api/auth/mfa/verify', {
				method: 'POST',
				headers: browserHeaders,
				body: JSON.stringify({ challengeToken: token, method: 'totp', totpCode: '123456' }),
			}),
		);
		expect(response.status).toBe(200);
		expect(response.cookies.get('nexcode-platform-session')?.httpOnly).toBe(true);
		const body: unknown = await response.json();
		expect(body).not.toHaveProperty('sessionToken');
		const cleared = new Headers();
		cleared.append(
			'Set-Cookie',
			'nexcode-platform-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict',
		);
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204, headers: cleared }));
		const result = await logout(
			new Request('http://localhost:4000/api/auth/logout', {
				method: 'POST',
				headers: browserHeaders,
			}),
		);
		expect(result.status).toBe(204);
		expect(result.cookies.get('nexcode-platform-session')?.value).toBe('');
		expect(result.cookies.get('nexcode-platform-csrf')?.value).toBe('');
	});
});
