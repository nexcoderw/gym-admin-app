import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as list, POST as create } from '@/app/api/organizations/[id]/owner-invitations/route';
import { POST as revoke } from '@/app/api/organizations/[id]/owner-invitations/[invitationId]/revocation/route';
import { ownerInvitationPermissions } from '@/lib/contracts/owner-invitations';
import { csrf, session, token } from './fixtures';
import { organization } from './organization-fixtures';
import { ownerInvitation } from './owner-invitation-fixtures';

const fetchMock = vi.fn<typeof fetch>();
const params = { params: Promise.resolve({ id: organization.id }) };
const revokeParams = { params: Promise.resolve({ id: organization.id, invitationId: ownerInvitation.id }) };
const base = `/api/organizations/${organization.id}/owner-invitations`;
let permissions: string[];
let reply: () => Response;
function request(method = 'GET', query = '', body?: unknown, headers: Record<string, string> = {}) {
	return new Request(`http://localhost:4000${base}${query}`, {
		method,
		headers: { Origin: 'http://localhost:4000', Cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}; unrelated=secret`, 'x-platform-csrf-token': csrf, 'Content-Type': 'application/json', ...headers },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}
const input = { displayName: ownerInvitation.displayName, email: ownerInvitation.email };
const operations = [
	{ permission: ownerInvitationPermissions.read, method: 'GET', suffix: '', status: 200, run: () => list(request(), params), data: () => ({ items: [ownerInvitation], nextCursor: null }) },
	{ permission: ownerInvitationPermissions.create, method: 'POST', suffix: '', status: 201, run: () => create(request('POST', '', input), params), data: () => ownerInvitation },
	{ permission: ownerInvitationPermissions.revoke, method: 'POST', suffix: `/${ownerInvitation.id}/revocation`, status: 200, run: () => revoke(request('POST'), revokeParams), data: () => ({ ...ownerInvitation, status: 'REVOKED', revokedAt: '2026-10-16T09:00:00.000Z' }) },
];

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	permissions = Object.values(ownerInvitationPermissions);
	reply = () => Response.json({ items: [], nextCursor: null });
	fetchMock.mockReset();
	fetchMock.mockImplementation(async (url) => String(url).endsWith('/auth/session')
		? Response.json({ ...session, permissions }) : reply());
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('owner invitation BFF security', () => {
	it.each(operations)('uses exact $method contract and $permission', async (operation) => {
		permissions = [operation.permission];
		reply = () => Response.json(operation.data(), { status: operation.status });
		const response = await operation.run();
		expect(response.status).toBe(operation.status);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('set-cookie')).toBeNull();
		const call = fetchMock.mock.calls[1];
		expect(new URL(String(call?.[0])).pathname).toBe(`/api/v1/platform/organizations/${organization.id}/owner-invitations${operation.suffix}`);
		expect(call?.[1]).toMatchObject({ method: operation.method, cache: 'no-store', redirect: 'error' });
		const headers = new Headers(call?.[1]?.headers);
		expect(headers.get('cookie')).not.toContain('unrelated');
		expect(headers.get('authorization')).toBeNull();
		if (operation.suffix) expect(call?.[1]?.body).toBeUndefined();
	});
	it.each(operations)('rejects missing $permission even with a platform.owner role', async (operation) => {
		permissions = [];
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, roles: ['platform.owner'], permissions }));
		expect((await operation.run()).status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it.each(operations)('rejects expired and revoked sessions for $permission', async (operation) => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, expiresAt: '2000-01-01T00:00:00.000Z' }));
		expect((await operation.run()).status).toBe(401);
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		expect((await operation.run()).status).toBe(401);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
	it('rejects anonymous reads and mutations without upstream access', async () => {
		const headers = { Cookie: `nexcode-platform-csrf=${csrf}` };
		expect((await list(request('GET', '', undefined, headers), params)).status).toBe(401);
		expect((await create(request('POST', '', input, headers), params)).status).toBe(401);
		expect((await revoke(request('POST', '', undefined, headers), revokeParams)).status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each(['', 'https://foreign.example.invalid'])('rejects mutation Origin %s before forwarding', async (Origin) => {
		expect((await create(request('POST', '', input, { Origin }), params)).status).toBe(403);
		expect((await revoke(request('POST', '', undefined, { Origin }), revokeParams)).status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each(['', 'wrong', 'c'.repeat(43)])('rejects missing or mismatched CSRF: %s', async (proof) => {
		const headers = { 'x-platform-csrf-token': proof };
		expect((await create(request('POST', '', input, headers), params)).status).toBe(403);
		expect((await revoke(request('POST', '', undefined, headers), revokeParams)).status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('rejects unknown fields, malformed IDs and invented revocation preconditions', async () => {
		expect((await create(request('POST', '', { ...input, userId: session.userId }), params)).status).toBe(400);
		expect((await list(request(), { params: Promise.resolve({ id: '../auth/session' }) })).status).toBe(400);
		expect((await revoke(request('POST'), { params: Promise.resolve({ id: organization.id, invitationId: 'bad' }) })).status).toBe(400);
		expect((await revoke(request('POST', '', { expectedUpdatedAt: organization.updatedAt }), revokeParams)).status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('rejects oversized or malformed creation bodies before forwarding', async () => {
		expect((await create(request('POST', '', { ...input, displayName: 'a'.repeat(9000) }), params)).status).toBe(413);
		const malformed = new Request(`http://localhost:4000${base}`, { method: 'POST', headers: request('POST').headers, body: '{' });
		expect((await create(malformed, params)).status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('forwards only bounded filters and rejects duplicate or invented queries', async () => {
		reply = () => Response.json({ items: [ownerInvitation], nextCursor: ownerInvitation.id });
		expect((await list(request('GET', `?limit=20&status=PENDING_DELIVERY&cursor=${ownerInvitation.id}`), params)).status).toBe(200);
		expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get('status')).toBe('PENDING_DELIVERY');
		fetchMock.mockClear();
		for (const query of ['?limit=51', '?limit=1&limit=2', '?cursor=bad', '?url=https://foreign.example', '?status=sent']) {
			expect((await list(request('GET', query), params)).status).toBe(400);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each([400, 401, 403, 404, 409, 412, 429, 503])('sanitizes invitation failure %s', async (status) => {
		reply = () => Response.json({ code: 'private', message: 'secret SQL internal-host' }, { status });
		const response = await create(request('POST', '', input), params);
		expect(response.status).toBe(status === 412 ? 502 : status);
		const body = await response.text();
		expect(body).not.toMatch(/secret SQL|internal-host|MFA_ENROLLMENT_REQUIRED/u);
	});
	it.each([
		() => Response.json({ ...ownerInvitation, tokenDigest: 'private-token' }, { status: 201 }),
		() => Response.json(ownerInvitation, { status: 200 }),
		() => Response.json(ownerInvitation, { status: 201, headers: { 'Set-Cookie': 'private=secret' } }),
		() => Response.json({ ...ownerInvitation, organizationId: '22222222-2222-4222-8222-222222222222' }, { status: 201 }),
		() => new Response(null, { status: 302, headers: { Location: 'https://foreign.example' } }),
	])('rejects incompatible create results and cookies: %#', async (factory) => {
		reply = factory;
		const response = await create(request('POST', '', input), params);
		expect(response.status).toBe(502);
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(await response.text()).not.toContain('private-token');
	});
	it('requires a scoped revoked response and handles an ambiguous timeout without replay', async () => {
		reply = () => Response.json(ownerInvitation);
		expect((await revoke(request('POST'), revokeParams)).status).toBe(502);
		fetchMock.mockClear();
		reply = () => { throw new TypeError('private transport details'); };
		expect((await revoke(request('POST'), revokeParams)).status).toBe(503);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('rejects cross-gym and wrong-filter list records before exposing recipient data', async () => {
		reply = () => Response.json({ items: [{ ...ownerInvitation, organizationId: '22222222-2222-4222-8222-222222222222' }], nextCursor: null });
		const wrongGym = await list(request(), params);
		expect(wrongGym.status).toBe(502);
		expect(await wrongGym.text()).not.toContain(ownerInvitation.email);
		reply = () => Response.json({ items: [ownerInvitation], nextCursor: null });
		expect((await list(request('GET', '?status=SENT'), params)).status).toBe(502);
	});

	it('forwards only approved security headers and maps known invitation errors', async () => {
		reply = () => Response.json({ code: 'OWNER_INVITATION_OUTSTANDING_CONFLICT' }, { status: 409 });
		const duplicate = await create(request('POST', '', input, { Authorization: 'forged', 'x-platform-permissions': ownerInvitationPermissions.create }), params);
		expect(duplicate.status).toBe(409);
		expect(await duplicate.text()).toContain('already exists');
		const headers = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
		expect(headers.get('cookie')).toBe(`nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`);
		expect(headers.get('authorization')).toBeNull();
		expect(headers.get('x-platform-permissions')).toBeNull();
		reply = () => Response.json({ code: 'OWNER_INVITATION_AUDIT_UNAVAILABLE' }, { status: 503 });
		const unavailable = await revoke(request('POST'), revokeParams);
		expect(unavailable.status).toBe(503);
		expect(await unavailable.text()).toContain('OWNER_INVITATION_AUDIT_UNAVAILABLE');
	});
});
