import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loginRequestSchema } from '@/lib/contracts/auth';
import { mutationContext, requestBody } from '@/lib/server/http/request';
import { platformCookies } from '@/lib/server/http/cookies';
import { csrf, token } from './fixtures';
import { serverEnvironment } from '@/lib/server/environment';

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:3000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3001');
});
afterEach(() => vi.unstubAllEnvs());

describe('BFF request boundaries', () => {
	function request(origin = 'http://localhost:3000', csrfHeader = csrf) {
		return new Request('http://localhost:3000/api/auth/mfa/verify', { method: 'POST', headers: {
			Origin: origin, Cookie: `tracking=discard-me; nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`,
			'x-platform-csrf-token': csrfHeader,
		} });
	}
	it('forwards only the two platform cookies after exact Origin and CSRF checks', () => {
		const context = mutationContext(request(), true);
		expect(context).toEqual({ cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`, csrf });
	});
	it.each(['https://attacker.example', 'null', 'http://localhost:3000.attacker.example'])('rejects %s Origin', (origin) => {
		expect(() => mutationContext(request(origin), false)).toThrow();
	});
	it('rejects a missing Origin and mismatched or missing CSRF', () => {
		expect(() => mutationContext(new Request('http://localhost:3000/api/auth/login', { method: 'POST' }), false)).toThrow();
		expect(() => mutationContext(request(undefined, token), true)).toThrow();
		expect(() => mutationContext(new Request('http://localhost:3000/api/auth/logout', { method: 'POST', headers: { Origin: 'http://localhost:3000' } }), true)).toThrow();
	});
	it('rejects ambiguous duplicate platform cookies', () => {
		expect(() => platformCookies(`nexcode-platform-session=${token}; nexcode-platform-session=${token}`)).toThrow();
	});
	it('requires explicit trusted origins and production HTTPS', () => {
		vi.stubEnv('GYM_API_BASE_URL', 'https://name:password@api.example.invalid');
		expect(serverEnvironment).toThrow();
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3001');
		expect(serverEnvironment).toThrow();
	});
	it('normalizes valid JSON and rejects extra authorization fields', async () => {
		const input = (body: object) => new Request('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		await expect(requestBody(input({ email: ' OPERATOR@EXAMPLE.INVALID ', password: 'fictional long password' }), loginRequestSchema)).resolves.toEqual({ email: 'operator@example.invalid', password: 'fictional long password' });
		await expect(requestBody(input({ email: 'operator@example.invalid', password: 'fictional long password', roles: ['platform.owner'] }), loginRequestSchema)).rejects.toThrow();
	});
	it('rejects oversized chunked bodies without trusting Content-Length', async () => {
		const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(9000))); controller.close(); } });
		const init: RequestInit & { duplex: 'half' } = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, duplex: 'half' };
		const request = new Request('http://localhost:3000/api/auth/login', init);
		await expect(requestBody(request, loginRequestSchema)).rejects.toMatchObject({ status: 413 });
	});
});
