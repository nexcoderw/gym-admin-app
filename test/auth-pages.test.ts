import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/login/page';
import UnauthorizedPage from '@/app/401/page';
import { getSession } from '@/lib/server/endpoints/auth/get-session';
import { BffError } from '@/lib/server/http/errors';
import { requireAnonymousSession, requirePlatformSession } from '@/lib/server/session';
import { session } from './fixtures';

vi.mock('next/headers', () => ({
	cookies: vi.fn(() => Promise.resolve({ toString: () => '' })),
}));
vi.mock('next/navigation', () => ({
	redirect: vi.fn((destination: string): never => {
		throw new Error(`Redirect to ${destination}`);
	}),
}));
vi.mock('@/lib/server/endpoints/auth/get-session', () => ({ getSession: vi.fn() }));

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'development');
	vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4000');
	vi.stubEnv('GYM_API_BASE_URL', 'http://127.0.0.1:3000');
	vi.mocked(getSession).mockReset();
	vi.mocked(redirect).mockClear();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('server-established authentication page access', () => {
	it.each([LoginPage, UnauthorizedPage])(
		'redirects valid sessions before rendering auth UI',
		async (page) => {
			vi.mocked(getSession).mockResolvedValue(session);
			await expect(page()).rejects.toThrow('Redirect to /dashboard');
			expect(redirect).toHaveBeenCalledWith('/dashboard');
		},
	);

	it.each([LoginPage, UnauthorizedPage])(
		'allows sign-in only for confirmed unauthenticated sessions',
		async (page) => {
			vi.mocked(getSession).mockRejectedValue(
				new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in again.'),
			);
			await expect(page()).resolves.toBeDefined();
			expect(redirect).not.toHaveBeenCalled();
		},
	);

	it.each([403, 429, 502, 503])(
		'does not treat a %s failure as an expired session',
		async (status) => {
			const failure = new BffError(status, 'SERVICE_UNAVAILABLE', 'Fictional unavailable service');
			vi.mocked(getSession).mockRejectedValue(failure);
			await expect(requireAnonymousSession()).rejects.toBe(failure);
			expect(redirect).not.toHaveBeenCalled();
		},
	);

	it('returns expired protected sessions to login rather than the dashboard', async () => {
		vi.mocked(getSession).mockRejectedValue(
			new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in again.'),
		);
		await expect(requirePlatformSession()).rejects.toThrow('Redirect to /login');
		expect(redirect).toHaveBeenCalledWith('/login');
	});
});
