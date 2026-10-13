import { renderToStaticMarkup } from 'react-dom/server';
import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from '@/app/dashboard/page';
import { serverContext } from '@/lib/server/session';
import { session, summary, token, csrf } from './fixtures';

vi.mock('@/lib/server/session', () => ({ serverContext: vi.fn() }));
vi.mock('next/navigation', () => ({
	redirect: vi.fn((destination: string): never => {
		throw new Error(`Redirect to ${destination}`);
	}),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	vi.mocked(redirect).mockClear();
	vi.mocked(serverContext).mockReset();
	vi.mocked(serverContext).mockResolvedValue({
		cookie: `nexcode-platform-session=${token}; nexcode-platform-csrf=${csrf}`,
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('dashboard page data-loading outcomes', () => {
	it('renders the validated summary after loading completes', async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json(session))
			.mockResolvedValueOnce(Response.json(summary));

		const markup = renderToStaticMarkup(await DashboardPage());

		expect(markup).toContain('Platform overview');
		expect(markup).toContain('Global accounts');
		expect(markup).not.toContain('Dashboard access required');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('renders permission denial without fetching the summary or redirecting', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ ...session, permissions: [] }));

		const markup = renderToStaticMarkup(await DashboardPage());

		expect(markup).toContain('Dashboard access required');
		expect(markup).not.toContain('Global accounts');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(redirect).not.toHaveBeenCalled();
	});

	it('redirects expired or invalid sessions to the fixed login route', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));

		await expect(DashboardPage()).rejects.toThrow('Redirect to /login');
		expect(redirect).toHaveBeenCalledOnce();
		expect(redirect).toHaveBeenCalledWith('/login');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('propagates service failures to the route error boundary', async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json(session))
			.mockResolvedValueOnce(Response.json({}, { status: 500 }));

		await expect(DashboardPage()).rejects.toMatchObject({ status: 502 });
		expect(redirect).not.toHaveBeenCalled();
	});

	it('propagates unexpected request-context failures unchanged', async () => {
		const failure = new Error('Fictional request-context failure');
		vi.mocked(serverContext).mockRejectedValueOnce(failure);

		await expect(DashboardPage()).rejects.toBe(failure);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(redirect).not.toHaveBeenCalled();
	});
});
