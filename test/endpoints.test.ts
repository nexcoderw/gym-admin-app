import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { login } from '@/lib/server/endpoints/auth/login';
import { verifyMfa } from '@/lib/server/endpoints/auth/verify-mfa';
import { getSession } from '@/lib/server/endpoints/auth/get-session';
import { logout } from '@/lib/server/endpoints/auth/logout';
import { getSummary } from '@/lib/server/endpoints/dashboard/get-summary';
import { session, summary, token, csrf, expiration } from './fixtures';

const fetchMock = vi.fn<typeof fetch>();
const context = { cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`, csrf };
beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:3000'); vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3001');
	fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('verified fixed upstream operations', () => {
	it('maps login and MFA requests and strips unknown response fields', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ challengeToken: token, csrfToken: csrf, expiresAt: expiration, methods: ['totp'], internalHost: 'never-return' }));
		const result = await login({ email: 'operator@example.invalid', password: 'fictional long password' }, context);
		expect(result.data).not.toHaveProperty('internalHost');
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://127.0.0.1:3001/api/v1/platform/auth/login');
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', cache: 'no-store', redirect: 'error', headers: { Origin: 'http://localhost:3000' } });
		fetchMock.mockResolvedValueOnce(Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }));
		await verifyMfa({ challengeToken: token, method: 'totp', totpCode: '123456' }, context);
		expect(String(fetchMock.mock.calls[1]?.[0])).toBe('http://127.0.0.1:3001/api/v1/platform/auth/mfa/verify');
		expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ 'x-platform-csrf-token': csrf });
	});
	it('maps session and idempotent logout without returning session tokens', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, sessionToken: token }));
		expect(await getSession(context)).not.toHaveProperty('sessionToken');
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/platform/auth/session');
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
		await expect(logout(context)).resolves.toEqual({ data: undefined, cookies: [] });
		expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/v1/platform/auth/logout');
	});
	it('requires a live session and permission before requesting summary aggregates', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, roles: ['platform.owner'], permissions: ['platform.other.read'] }));
		await expect(getSummary(context)).rejects.toMatchObject({ status: 403 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it('accepts permission with a non-owner role and validates actual numeric counts', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(session)).mockResolvedValueOnce(Response.json(summary));
		await expect(getSummary(context)).resolves.toEqual(summary);
		expect(String(fetchMock.mock.calls[1]?.[0])).toBe('http://127.0.0.1:3001/api/v1/platform/dashboard/summary');
	});
	it('fails before fetching when no platform session exists', async () => {
		await expect(getSummary({ cookie: '' })).rejects.toMatchObject({ status: 401 });
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('does not leak upstream errors or invalid aggregate data', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ error: 'internal-host secret' }, { status: 500 }));
		await expect(getSession(context)).rejects.toMatchObject({ status: 502, message: 'The request could not be completed. Try again.' });
		fetchMock.mockResolvedValueOnce(Response.json(session)).mockResolvedValueOnce(Response.json({ ...summary, globalUsers: { total: -1 } }));
		await expect(getSummary(context)).rejects.toMatchObject({ status: 502 });
	});
	it('rejects an unexpected successful upstream status instead of changing the contract', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(session, { status: 201 }));
		await expect(getSession(context)).rejects.toMatchObject({ status: 502 });
	});
});
