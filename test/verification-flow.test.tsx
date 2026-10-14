// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthChallengeProvider } from '@/components/auth/auth-challenge-provider';
import { LoginForm } from '@/components/auth/login-form';
import { VerificationForm } from '@/components/auth/verification-form';
import { csrf, session, token } from './fixtures';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	vi.clearAllMocks();
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

async function enterVerification(expiresAt = new Date(Date.now() + 300_000).toISOString()) {
	fetchMock.mockResolvedValueOnce(
		Response.json({ challengeToken: token, csrfToken: csrf, expiresAt, methods: ['totp'] }),
	);
	const view = render(
		<AuthChallengeProvider>
			<LoginForm />
		</AuthChallengeProvider>,
	);
	fireEvent.change(screen.getByLabelText('Email address'), {
		target: { value: 'operator@example.invalid' },
	});
	fireEvent.change(screen.getByLabelText('Password'), {
		target: { value: 'fictional long password' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Continue to verification' }));
	await waitFor(() => expect(router.push).toHaveBeenCalledWith('/verification'));
	expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
	expect(screen.queryByRole('heading', { name: 'Verify it’s you' })).toBeNull();
	view.rerender(
		<AuthChallengeProvider>
			<VerificationForm />
		</AuthChallengeProvider>,
	);
	return view;
}

describe('separate verification page flow', () => {
	it('carries the challenge in the shared layout and clears it on restart', async () => {
		const view = await enterVerification();
		expect(screen.getByRole('heading', { name: 'Verify it’s you' })).toBeDefined();
		expect(screen.queryByLabelText('Password')).toBeNull();
		expect(window.localStorage.length).toBe(0);
		expect(window.sessionStorage.length).toBe(0);
		fireEvent.click(screen.getByRole('button', { name: 'Start sign-in again' }));
		expect(router.replace).toHaveBeenCalledWith('/login');
		expect(screen.queryByLabelText('Six-digit code')).toBeNull();
		view.unmount();
	});

	it('returns a direct visit or a fresh page load to login without sending a request', () => {
		render(
			<AuthChallengeProvider>
				<VerificationForm />
			</AuthChallengeProvider>,
		);
		expect(router.replace).toHaveBeenCalledWith('/login');
		expect(screen.queryByRole('button', { name: 'Open platform' })).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('discards the previous challenge when the user returns to login', async () => {
		const view = await enterVerification();
		view.rerender(
			<AuthChallengeProvider>
				<LoginForm />
			</AuthChallengeProvider>,
		);
		view.rerender(
			<AuthChallengeProvider>
				<VerificationForm />
			</AuthChallengeProvider>,
		);
		expect(router.replace).toHaveBeenCalledWith('/login');
		expect(screen.queryByLabelText('Six-digit code')).toBeNull();
	});

	it('clears an expired challenge and returns to login', async () => {
		await enterVerification('2000-01-01T00:00:00.000Z');
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
		expect(screen.queryByLabelText('Six-digit code')).toBeNull();
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('confirms the live session before navigating to the dashboard', async () => {
		await enterVerification();
		fetchMock
			.mockResolvedValueOnce(
				Response.json({ status: 'authenticated', expiresAt: session.expiresAt, csrfToken: csrf }),
			)
			.mockResolvedValueOnce(Response.json(session));
		fireEvent.change(screen.getByLabelText('Six-digit code'), { target: { value: '123456' } });
		fireEvent.click(screen.getByRole('button', { name: 'Open platform' }));
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
		expect(router.replace).not.toHaveBeenCalledWith('/login');
		expect(router.refresh).toHaveBeenCalledOnce();
		expect(screen.queryByLabelText('Six-digit code')).toBeNull();
	});

	it('ignores a password response that arrives after leaving the page', async () => {
		let resolveResponse: ((response: Response) => void) | undefined;
		fetchMock.mockReturnValueOnce(
			new Promise<Response>((resolve) => {
				resolveResponse = resolve;
			}),
		);
		const view = render(
			<AuthChallengeProvider>
				<LoginForm />
			</AuthChallengeProvider>,
		);
		fireEvent.change(screen.getByLabelText('Email address'), {
			target: { value: 'operator@example.invalid' },
		});
		fireEvent.change(screen.getByLabelText('Password'), {
			target: { value: 'fictional long password' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Continue to verification' }));
		view.unmount();
		await act(async () => {
			if (!resolveResponse) throw new Error('Expected a pending password request.');
			resolveResponse(
				Response.json({
					challengeToken: token,
					csrfToken: csrf,
					expiresAt: new Date(Date.now() + 300_000).toISOString(),
					methods: ['totp'],
				}),
			);
		});
		expect(router.push).not.toHaveBeenCalled();
	});
});
