import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListPage from '@/app/organizations/page';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { session } from './fixtures';
import { organization, organizationEtag } from './organization-fixtures';

vi.mock('next/headers', () => ({
	cookies: async () => ({
		toString: () =>
			`nexcode-platform-session=${'a'.repeat(43)}; nexcode-platform-csrf=${'b'.repeat(43)}`,
	}),
}));
vi.mock('next/navigation', () => ({
	redirect: (path: string): never => {
		throw new Error(`Redirect to ${path}`);
	},
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
	usePathname: () => '/organizations',
}));
const fetchMock = vi.fn<typeof fetch>();
let permissions: string[];
const runList = () => ListPage({ searchParams: Promise.resolve({}) });
beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	permissions = Object.values(organizationPermissions);
	fetchMock.mockReset();
	fetchMock.mockImplementation(async (url) =>
		String(url).endsWith('/auth/session')
			? Response.json({ ...session, permissions })
			: Response.json(
					String(url).includes('/organizations?')
						? { items: [organization], nextCursor: null }
						: organization,
					{ headers: { ETag: organizationEtag } },
				),
	);
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('independent organization page authorization', () => {
	it('blocks the registry without read permission before any organization read', async () => {
		permissions = [];
		const markup = renderToStaticMarkup(await runList());
		expect(markup).toContain('required organization permission');
		expect(markup).not.toContain('Administration workspace');
		expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/auth/session'))).toBe(true);
	});
	it('redirects rejected sessions to login only', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		await expect(runList()).rejects.toThrow('Redirect to /login');
	});
	it('renders validated cards with dialog triggers and no dialog or sub-page links', async () => {
		const markup = renderToStaticMarkup(await runList());
		expect(markup).toContain('Soho Gym');
		expect(markup).toContain('Administration workspace');
		expect(markup).toContain('Register Gym');
		expect(markup).toContain('Edit Soho Gym');
		expect(markup).not.toContain('<dialog');
		expect(markup).not.toContain(`/organizations/${organization.id}`);
	});
	it('hides registration and editing triggers without their permissions', async () => {
		permissions = [organizationPermissions.read];
		const markup = renderToStaticMarkup(await runList());
		expect(markup).toContain('Soho Gym');
		expect(markup).not.toContain('Register Gym');
		expect(markup).not.toContain('Edit Soho Gym');
	});
});
