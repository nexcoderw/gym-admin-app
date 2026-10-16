import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/auth/mfa/email/route';
import { verifyMfaRequestSchema } from '@/lib/contracts/auth';
import { csrf, expiration, token } from './fixtures';

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

function request(
	body: unknown = { challengeToken: token },
	origin = 'http://localhost:4000',
	proof = csrf,
) {
	return new Request('http://localhost:4000/api/auth/mfa/email', {
		method: 'POST',
		headers: {
			Origin: origin,
			'Content-Type': 'application/json',
			Cookie: `nexcode-platform-csrf=${csrf}`,
			'x-platform-csrf-token': proof,
		},
		body: JSON.stringify(body),
	});
}

describe('email verification BFF', () => {
	it('forwards only the challenge and strips unrelated response fields', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({
				status: 'sent',
				expiresAt: expiration,
				retryAfterSeconds: 60,
				secret: 'private',
			}),
		);
		const response = await POST(request());
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: 'sent',
			expiresAt: expiration,
			retryAfterSeconds: 60,
		});
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			'http://127.0.0.1:3000/api/v1/platform/auth/mfa/email',
		);
	});
	it.each([{}, { challengeToken: token, email: 'attacker@example.com' }])(
		'rejects invalid or recipient-selecting requests: %p',
		async (body) => {
			expect((await POST(request(body))).status).toBe(400);
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);
	it('rejects foreign origins before contacting Nest', async () => {
		expect((await POST(request({ challengeToken: token }, 'https://foreign.example'))).status).toBe(
			403,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('rejects mismatched CSRF proof before contacting Nest', async () => {
		expect(
			(await POST(request({ challengeToken: token }, 'http://localhost:4000', 'wrong-proof')))
				.status,
		).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each([429, 503])('preserves safe upstream failure status %s', async (status) => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ message: 'private provider error' }, { status }),
		);
		const response = await POST(request());
		expect(response.status).toBe(status);
		expect(await response.text()).not.toContain('private provider error');
	});
	it('rejects unexpected upstream cookies', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json(
				{ status: 'sent', expiresAt: expiration, retryAfterSeconds: 60 },
				{ headers: { 'Set-Cookie': 'unexpected=value' } },
			),
		);
		expect((await POST(request())).status).toBe(502);
	});
	it('preserves leading zeroes and rejects mixed factors', () => {
		expect(
			verifyMfaRequestSchema.parse({
				challengeToken: token,
				method: 'email_otp',
				emailOtpCode: '012345',
			}).method,
		).toBe('email_otp');
		expect(
			verifyMfaRequestSchema.safeParse({
				challengeToken: token,
				method: 'email_otp',
				emailOtpCode: '012345',
				totpCode: '123456',
			}).success,
		).toBe(false);
	});
});
