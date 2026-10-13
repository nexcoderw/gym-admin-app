import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListPage from '@/app/organizations/page';
import DetailPage from '@/app/organizations/[id]/page';
import NewPage from '@/app/organizations/new/page';
import EditPage from '@/app/organizations/[id]/edit/page';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { session } from './fixtures';
import { organization, organizationEtag } from './organization-fixtures';

vi.mock('next/headers', () => ({ cookies: async () => ({ toString: () => `nexcode-platform-session=${'a'.repeat(43)}; nexcode-platform-csrf=${'b'.repeat(43)}` }) }));
vi.mock('next/navigation', () => ({
	redirect: (path: string): never => { throw new Error(`Redirect to ${path}`); },
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const fetchMock = vi.fn<typeof fetch>();
let permissions: string[];
const params = { params: Promise.resolve({ id: organization.id }) };
const pages = [
	{ label: 'list', permission: organizationPermissions.read, run: () => ListPage({ searchParams: Promise.resolve({}) }) },
	{ label: 'details', permission: organizationPermissions.read, run: () => DetailPage(params) },
	{ label: 'registration', permission: organizationPermissions.create, run: () => NewPage() },
	{ label: 'editing', permission: organizationPermissions.update, run: () => EditPage(params) },
];
beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	permissions = Object.values(organizationPermissions);
	fetchMock.mockReset();
	fetchMock.mockImplementation(async (url) => String(url).endsWith('/auth/session')
		? Response.json({ ...session, permissions })
		: Response.json(String(url).includes('/organizations?') ? { items: [organization], nextCursor: null } : organization, { headers: { ETag: organizationEtag } }));
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('independent organization page authorization', () => {
	it.each(pages)('blocks $label without $permission before any organization read', async (page) => {
		permissions = [];
		const markup = renderToStaticMarkup(await page.run());
		expect(markup).toContain('required organization permission');
		expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/auth/session'))).toBe(true);
	});
	it.each(pages)('redirects rejected sessions on $label to login only', async (page) => {
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		await expect(page.run()).rejects.toThrow('Redirect to /login');
	});
	it('renders a validated list and name-only edit with the server precondition', async () => {
		expect(renderToStaticMarkup(await ListPage({ searchParams: Promise.resolve({}) }))).toContain('Soho Gym');
		const markup = renderToStaticMarkup(await EditPage(params));
		expect(markup).toContain('Save gym name');
		expect(markup).not.toContain('name="slug"');
	});
});
