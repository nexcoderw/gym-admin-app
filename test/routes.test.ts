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
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:3000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3001');
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('frontend-owned BFF routes', () => {
	it('rejects foreign Origin before login forwarding', async () => {
		const response = await login(
			new Request('http://localhost:3000/api/auth/login', {
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
			new Request('http://localhost:3000/api/auth/login', {
				method: 'POST',
				headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
				body: '{bad',
			}),
		);
		expect(response.status).toBe(400);
		for (const handler of [verify, logout]) {
			expect(
				(
					await handler(
						new Request('http://localhost:3000/api/auth/logout', {
							method: 'POST',
							headers: { Origin: 'http://localhost:3000' },
						}),
					)
				).status,
			).toBe(403);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('protects session and dashboard routes independently of page layouts', async () => {
		for (const handler of [getSession, summary]) {
			const response = await handler(new Request('http://localhost:3000/api/dashboard/summary'));
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
			new Request('http://localhost:3000/api/auth/login', {
				method: 'POST',
				headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
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
			Origin: 'http://localhost:3000',
			'Content-Type': 'application/json',
			Cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`,
			'x-platform-csrf-token': csrf,
		};
		const response = await verify(
			new Request('http://localhost:3000/api/auth/mfa/verify', {
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
			new Request('http://localhost:3000/api/auth/logout', {
				method: 'POST',
				headers: browserHeaders,
			}),
		);
		expect(result.status).toBe(204);
		expect(result.cookies.get('nexcode-platform-session')?.value).toBe('');
		expect(result.cookies.get('nexcode-platform-csrf')?.value).toBe('');
	});
});
