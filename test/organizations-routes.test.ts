import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as list, POST as create } from '@/app/api/organizations/route';
import { GET as get, PATCH as update } from '@/app/api/organizations/[id]/route';
import { POST as activate } from '@/app/api/organizations/[id]/activation/route';
import { POST as suspend } from '@/app/api/organizations/[id]/suspension/route';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { upstreamFailure } from '@/lib/server/http/errors';
import { session, token, csrf } from './fixtures';
import { organization, organizationEtag } from './organization-fixtures';

const fetchMock = vi.fn<typeof fetch>();
const params = { params: Promise.resolve({ id: organization.id }) };
let permissions: string[];
let organizationResponse: () => Response;

function request(method = 'GET', path = '', body?: unknown, extra: Record<string, string> = {}) {
	return new Request(`http://localhost:4000/api/organizations${path}`, {
		method,
		headers: { Origin: 'http://localhost:4000', Cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`, 'x-platform-csrf-token': csrf, 'Content-Type': 'application/json', ...extra },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}
const operations = [
	{ permission: organizationPermissions.read, method: 'GET', path: '', status: 200, run: () => list(request()) },
	{ permission: organizationPermissions.read, method: 'GET', path: `/${organization.id}`, status: 200, run: () => get(request('GET', `/${organization.id}`), params) },
	{ permission: organizationPermissions.create, method: 'POST', path: '', status: 201, run: () => create(request('POST', '', { name: organization.name, slug: organization.slug })) },
	{ permission: organizationPermissions.update, method: 'PATCH', path: `/${organization.id}`, status: 200, run: () => update(request('PATCH', `/${organization.id}`, { name: organization.name }, { 'If-Match': organizationEtag }), params) },
	{ permission: organizationPermissions.activate, method: 'POST', path: `/${organization.id}/activation`, status: 200, run: () => activate(request('POST', `/${organization.id}/activation`, { expectedUpdatedAt: organization.updatedAt }), params) },
	{ permission: organizationPermissions.suspend, method: 'POST', path: `/${organization.id}/suspension`, status: 200, run: () => suspend(request('POST', `/${organization.id}/suspension`, { expectedUpdatedAt: organization.updatedAt }), params) },
];

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	permissions = Object.values(organizationPermissions);
	organizationResponse = () => Response.json(organization, { headers: { ETag: organizationEtag } });
	fetchMock.mockReset();
	fetchMock.mockImplementation(async (url) => {
		if (String(url).endsWith('/auth/session')) return Response.json({ ...session, permissions });
		return organizationResponse();
	});
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('organization BFF boundaries', () => {
	it.each(operations)('maps $method $path with exact $permission and status', async (operation) => {
		organizationResponse = () => Response.json(operation.path === '' && operation.method === 'GET'
			? { items: [organization], nextCursor: null }
			: { ...organization, status: operation.permission === organizationPermissions.activate ? 'ACTIVE' : operation.permission === organizationPermissions.suspend ? 'SUSPENDED' : 'PENDING' },
			{ status: operation.status, headers: { ETag: organizationEtag } });
		const response = await operation.run();
		expect(response.status).toBe(operation.status);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('set-cookie')).toBeNull();
		const call = fetchMock.mock.calls[1];
		const url = new URL(String(call?.[0]));
		expect(url.pathname).toBe(`/api/v1/platform/organizations${operation.path}`);
		expect(call?.[1]).toMatchObject({ method: operation.method, cache: 'no-store', redirect: 'error' });
	});
	it.each(operations)('denies missing $permission even with the owner role', async (operation) => {
		permissions = [];
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, roles: ['platform.owner'], permissions }));
		const response = await operation.run();
		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it('rejects anonymous access without contacting Nest and clears only supplied expired credentials', async () => {
		const response = await list(request('GET', '', undefined, { Cookie: '' }));
		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.headers.get('set-cookie')).toBeNull();
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		const revoked = await list(request());
		expect(revoked.status).toBe(401);
		expect(revoked.headers.getSetCookie()).toHaveLength(2);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it('rejects an expired session and ignores forged browser permission claims', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, expiresAt: '2000-01-01T00:00:00.000Z', permissions }));
		expect((await list(request())).status).toBe(401);
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, permissions: [] }));
		expect((await list(request('GET', '', undefined, { 'x-platform-permissions': organizationPermissions.read }))).status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
	it.each(['', 'https://foreign.example.invalid'])('rejects missing/foreign Origin before any forwarding: %s', async (origin) => {
		const response = await create(request('POST', '', { name: 'Soho Gym', slug: 'soho' }, { Origin: origin }));
		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('rejects invalid CSRF, body, UUID and If-Match before session or organization fetch', async () => {
		expect((await create(request('POST', '', {}, { 'x-platform-csrf-token': 'wrong' }))).status).toBe(403);
		expect((await create(request('POST', '', { name: 'Soho Gym', slug: 'admin' }))).status).toBe(400);
		expect((await create(request('POST', '', { name: 'Soho Gym', slug: 'soho', actorPlatformStaffId: session.platformStaffId }))).status).toBe(400);
		expect((await get(request(), { params: Promise.resolve({ id: '../auth/session' }) })).status).toBe(400);
		expect((await update(request('PATCH', `/${organization.id}`, { name: 'Power Gym' }, { 'If-Match': '*' }), params)).status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('serializes only approved query fields and rejects duplicate and malformed cursors', async () => {
		organizationResponse = () => Response.json({ items: [{ ...organization, status: 'ACTIVE' }], nextCursor: organization.id });
		const response = await list(request('GET', `?status=ACTIVE&limit=50&cursor=${organization.id}`));
		expect(response.status).toBe(200);
		const url = new URL(String(fetchMock.mock.calls[1]?.[0]));
		expect(Object.fromEntries(url.searchParams)).toEqual({ limit: '50', status: 'ACTIVE', cursor: organization.id });
		fetchMock.mockClear();
		for (const query of ['?limit=2&limit=3', '?url=https://foreign.example', '?cursor=bad', '?status=active']) {
			expect((await list(request('GET', query))).status).toBe(400);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('validates and relays detail ETag and allowlists If-Match, cookies and headers', async () => {
		const detail = await get(request(), params);
		expect(detail.headers.get('etag')).toBe(organizationEtag);
		const response = await update(request('PATCH', `/${organization.id}`, { name: organization.name }, { 'If-Match': organizationEtag, Authorization: 'not-forwarded', 'x-user-id': 'forged' }), params);
		expect(response.status).toBe(200);
		const headers = new Headers(fetchMock.mock.calls[3]?.[1]?.headers);
		expect(headers.get('if-match')).toBe(organizationEtag);
		expect(headers.get('authorization')).toBeNull();
		expect(headers.get('x-user-id')).toBeNull();
	});

	it('rejects oversized requests before forwarding and bounds incompatible provider responses', async () => {
		expect((await create(request('POST', '', { name: 'x'.repeat(9000), slug: 'soho' }))).status).toBe(413);
		expect(fetchMock).not.toHaveBeenCalled();
		organizationResponse = () => Response.json({ ...organization, name: 'x'.repeat(70_000) }, { headers: { ETag: organizationEtag } });
		const response = await get(request(), params);
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain('x'.repeat(100));
	});
	it.each([
		[400, 'ORGANIZATION_INPUT_REJECTED'],
		[409, 'ORGANIZATION_SLUG_CONFLICT'],
		[409, 'ORGANIZATION_TRANSITION_CONFLICT'],
		[412, 'ORGANIZATION_STALE'],
		[503, 'ORGANIZATION_AUDIT_UNAVAILABLE'],
		[429, 'RATE_LIMITED'],
	] as const)('returns domain-safe %s %s without provider diagnostics', async (status, code) => {
		organizationResponse = () => Response.json({ code, message: 'secret SQL internal-host' }, { status });
		const response = await create(request('POST', '', { name: 'Soho Gym', slug: 'soho' }));
		expect(response.status).toBe(status);
		const text = await response.text();
		expect(text).toContain(code);
		expect(text).not.toContain('secret SQL');
		expect(text).not.toContain('internal-host');
		expect(upstreamFailure(412).code).toBe('MFA_ENROLLMENT_REQUIRED');
	});
	it.each([
		() => Response.json({ ...organization, owner: 'private' }),
		() => Response.json(organization, { status: 201 }),
		() => Response.json(organization, { headers: { ETag: 'W/"invalid"' } }),
		() => Response.json(organization, { headers: { ETag: organizationEtag, 'Set-Cookie': 'unexpected=secret' } }),
	])('rejects incompatible responses without cookie or data leakage: %#', async (reply) => {
		organizationResponse = reply;
		const response = await get(request(), params);
		expect(response.status).toBe(502);
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(await response.text()).not.toContain('private');
	});
});
