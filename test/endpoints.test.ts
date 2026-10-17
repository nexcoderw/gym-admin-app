import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { login } from '@/lib/server/endpoints/auth/login';
import { verifyMfa } from '@/lib/server/endpoints/auth/verify-mfa';
import { getSession } from '@/lib/server/endpoints/auth/get-session';
import { logout } from '@/lib/server/endpoints/auth/logout';
import { getSummary } from '@/lib/server/endpoints/dashboard/get-summary';
import { session, summary, token, csrf, expiration } from './fixtures';

const fetchMock = vi.fn<typeof fetch>();
const context = {
	cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`,
	csrf,
};
beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('verified fixed upstream operations', () => {
	it('maps a recovery-code request without inventing a TOTP field', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }),
		);
		await verifyMfa(
			{ challengeToken: token, method: 'recovery_code', recoveryCode: 'fictional-recovery-code' },
			context,
		);
		expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
			JSON.stringify({
				challengeToken: token,
				method: 'recovery_code',
				recoveryCode: 'fictional-recovery-code',
			}),
		);
	});

	it.each([429, 500, 503])(
		'maps login failures safely without accepting a challenge: %s',
		async (status) => {
			fetchMock.mockResolvedValueOnce(Response.json({ secret: 'private' }, { status }));
			await expect(
				login({ email: 'operator@example.invalid', password: '123456789012' }, context),
			).rejects.toMatchObject({ status: status === 500 ? 502 : status });
			expect(fetchMock).toHaveBeenCalledOnce();
		},
	);

	it('uses a bounded resilient-read deadline for session validation', async () => {
		const deadline = vi.spyOn(AbortSignal, 'timeout');
		try {
			fetchMock.mockResolvedValueOnce(Response.json(session));
			await getSession(context);
			expect(deadline).toHaveBeenCalledWith(30_000);
		} finally {
			deadline.mockRestore();
		}
	});
	it('retries one transient session response but never replays auth commands', async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json({}, { status: 503 }))
			.mockResolvedValueOnce(Response.json(session));
		await expect(getSession(context)).resolves.toEqual(session);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		fetchMock.mockReset();
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 503 }));
		await expect(
			login({ email: 'operator@example.invalid', password: 'fictional long password' }, context),
		).rejects.toMatchObject({ status: 503 });
		expect(fetchMock).toHaveBeenCalledOnce();
	});
	it('gives auth commands a longer non-replayed deadline', async () => {
		const deadline = vi.spyOn(AbortSignal, 'timeout');
		try {
			fetchMock.mockResolvedValueOnce(
				Response.json({
					challengeToken: token,
					csrfToken: csrf,
					expiresAt: expiration,
					methods: ['totp'],
				}),
			);
			await login(
				{ email: 'operator@example.invalid', password: 'fictional long password' },
				context,
			);
			expect(deadline).toHaveBeenCalledWith(45_000);
			expect(fetchMock).toHaveBeenCalledOnce();
		} finally {
			deadline.mockRestore();
		}
	});
	it('fails closed with a safe error when the upstream request times out', async () => {
		fetchMock.mockRejectedValueOnce(
			new DOMException('fictional private provider detail', 'TimeoutError'),
		);
		await expect(getSession(context)).rejects.toMatchObject({
			status: 503,
			code: 'SERVICE_UNAVAILABLE',
			message: 'The service is unavailable. Try again.',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('maps login and MFA requests and strips unknown response fields', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({
				challengeToken: token,
				csrfToken: csrf,
				expiresAt: expiration,
				methods: ['totp'],
				internalHost: 'never-return',
			}),
		);
		const result = await login(
			{ email: 'operator@example.invalid', password: 'fictional long password' },
			context,
		);
		expect(result.data).not.toHaveProperty('internalHost');
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			'http://127.0.0.1:3000/api/v1/platform/auth/login',
		);
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			method: 'POST',
			cache: 'no-store',
			redirect: 'error',
			headers: { Origin: 'http://localhost:4000' },
		});
		fetchMock.mockResolvedValueOnce(
			Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }),
		);
		await verifyMfa({ challengeToken: token, method: 'totp', totpCode: '123456' }, context);
		expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
			'http://127.0.0.1:3000/api/v1/platform/auth/mfa/verify',
		);
		expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ 'x-platform-csrf-token': csrf });
	});
	it('maps session and idempotent logout without returning session tokens', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, sessionToken: token }));
		expect(await getSession(context)).not.toHaveProperty('sessionToken');
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/platform/auth/session');
		fetchMock.mockResolvedValueOnce(
			new Response(null, { status: 204, headers: { ETag: '"unrelated-auth-metadata"' } }),
		);
		await expect(logout(context)).resolves.toEqual({ data: undefined, cookies: [] });
		expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/v1/platform/auth/logout');
	});
	it('requires a live session and permission before requesting summary aggregates', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({
				...session,
				roles: ['platform.owner'],
				permissions: ['platform.other.read'],
			}),
		);
		await expect(getSummary(context)).rejects.toMatchObject({ status: 403 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it('accepts permission with a non-owner role and validates actual numeric counts', async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json(session))
			.mockResolvedValueOnce(Response.json(summary));
		await expect(getSummary(context)).resolves.toEqual(summary);
		expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
			'http://127.0.0.1:3000/api/v1/platform/dashboard/summary',
		);
	});
	it('fails before fetching when no platform session exists', async () => {
		await expect(getSummary({ cookie: '' })).rejects.toMatchObject({ status: 401 });
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('does not leak upstream errors or invalid aggregate data', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ error: 'internal-host secret' }, { status: 500 }),
		);
		await expect(getSession(context)).rejects.toMatchObject({
			status: 502,
			message: 'The request could not be completed. Try again.',
		});
		fetchMock
			.mockResolvedValueOnce(Response.json(session))
			.mockResolvedValueOnce(Response.json({ ...summary, globalUsers: { total: -1 } }));
		await expect(getSummary(context)).rejects.toMatchObject({ status: 502 });
	});
	it('rejects an unexpected successful upstream status instead of changing the contract', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(session, { status: 201 }));
		await expect(getSession(context)).rejects.toMatchObject({ status: 502 });
	});
});
