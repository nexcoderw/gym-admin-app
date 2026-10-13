// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MfaForm } from '@/components/auth/mfa-form';
import { readLiveSession } from '@/lib/client/session';
import { csrf, expiration, session, token } from './fixtures';

const fetchMock = vi.fn<typeof fetch>();
const challenge = {
	challengeToken: token,
	csrfToken: csrf,
	expiresAt: expiration,
	methods: ['totp'] as const,
};

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function renderVerification(onAuthenticated: () => void) {
	render(
		<MfaForm
			challenge={{ ...challenge, methods: [...challenge.methods] }}
			onRestart={vi.fn<() => void>()}
			onAuthenticated={onAuthenticated}
		/>,
	);
	fireEvent.change(screen.getByLabelText('Six-digit code'), { target: { value: '123456' } });
	fireEvent.click(screen.getByRole('button', { name: 'Open platform' }));
}

describe('MFA to live session integration', () => {
	it('rejects an expired MFA challenge before any network request', async () => {
		const onAuthenticated = vi.fn<() => void>();
		render(
			<MfaForm
				challenge={{ ...challenge, methods: ['totp'], expiresAt: '2000-01-01T00:00:00.000Z' }}
				onRestart={vi.fn<() => void>()}
				onAuthenticated={onAuthenticated}
			/>,
		);
		fireEvent.change(screen.getByLabelText('Six-digit code'), { target: { value: '123456' } });
		fireEvent.click(screen.getByRole('button', { name: 'Open platform' }));
		await screen.findByRole('alert');
		expect(fetchMock).not.toHaveBeenCalled();
		expect(onAuthenticated).not.toHaveBeenCalled();
	});

	it('confirms a live session before granting the navigation callback', async () => {
		const onAuthenticated = vi.fn<() => void>();
		fetchMock
			.mockResolvedValueOnce(
				Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }),
			)
			.mockImplementationOnce(() => {
				expect(onAuthenticated).not.toHaveBeenCalled();
				return Promise.resolve(Response.json(session));
			});
		renderVerification(onAuthenticated);
		await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
			'/api/auth/mfa/verify',
			'/api/auth/session',
		]);
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
		});
	});

	it('retries only session confirmation after an outage, without replaying MFA', async () => {
		const onAuthenticated = vi.fn<() => void>();
		fetchMock
			.mockResolvedValueOnce(
				Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }),
			)
			.mockResolvedValueOnce(Response.json({ secret: 'never display' }, { status: 502 }))
			.mockResolvedValueOnce(Response.json(session));
		renderVerification(onAuthenticated);
		await screen.findByRole('alert');
		expect(onAuthenticated).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).not.toContain('never display');
		expect(screen.getByLabelText('Six-digit code').hasAttribute('disabled')).toBe(true);
		fireEvent.click(screen.getByRole('button', { name: 'Open platform' }));
		await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
			'/api/auth/mfa/verify',
			'/api/auth/session',
			'/api/auth/session',
		]);
	});

	it.each([401, 429, 500, 503])(
		'does not authorize a rejected session response: %s',
		async (status) => {
			fetchMock.mockResolvedValueOnce(Response.json({ secret: 'private' }, { status }));
			await expect(readLiveSession()).rejects.toThrow();
			expect(fetchMock).toHaveBeenCalledOnce();
		},
	);

	it.each([{}, { ...session, expiresAt: '2000-01-01T00:00:00.000Z' }])(
		'rejects malformed or expired successful session data',
		async (value) => {
			fetchMock.mockResolvedValueOnce(Response.json(value));
			await expect(readLiveSession()).rejects.toThrow();
		},
	);
});
