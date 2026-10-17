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
	it('defaults to authenticator and sends email only after an explicit method choice and request', async () => {
		const onAuthenticated = vi.fn<() => void>();
		fetchMock
			.mockResolvedValueOnce(
				Response.json({ status: 'sent', expiresAt: expiration, retryAfterSeconds: 60 }),
			)
			.mockResolvedValueOnce(
				Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }),
			);
		render(
			<MfaForm
				challenge={{ ...challenge, methods: ['totp', 'recovery_code', 'email_otp'] }}
				onRestart={vi.fn<() => void>()}
				onAuthenticated={onAuthenticated}
			/>,
		);
		expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
			'totp',
			'recovery_code',
			'email_otp',
		]);
		expect((screen.getByRole('radio', { name: 'Authenticator' }) as HTMLInputElement).checked).toBe(
			true,
		);
		expect(fetchMock).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('radio', { name: 'Email code' }));
		expect(screen.getByRole('button', { name: 'Open platform' }).hasAttribute('disabled')).toBe(
			true,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Send email code' }));
		await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Code sent'));
		expect(onAuthenticated).not.toHaveBeenCalled();
		fireEvent.change(screen.getByLabelText('Email verification code'), {
			target: { value: '012345' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Open platform' }));
		await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
			'/api/auth/mfa/email',
			'/api/auth/mfa/verify',
		]);
		expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
			JSON.stringify({ challengeToken: token, method: 'email_otp', emailOtpCode: '012345' }),
		);
	});

	it('offers only advertised methods and preserves recovery selection after a rejected code', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
		render(
			<MfaForm
				challenge={{ ...challenge, methods: ['recovery_code'] }}
				onRestart={vi.fn<() => void>()}
				onAuthenticated={vi.fn<() => void>()}
			/>,
		);
		expect(screen.getAllByRole('radio')).toHaveLength(1);
		fireEvent.change(screen.getByLabelText('Recovery code', { selector: 'input[name="code"]' }), {
			target: { value: 'fictional-recovery-code' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Open platform' }));
		await screen.findByRole('alert');
		expect((screen.getByRole('radio', { name: 'Recovery code' }) as HTMLInputElement).checked).toBe(
			true,
		);
		expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
			JSON.stringify({
				challengeToken: token,
				method: 'recovery_code',
				recoveryCode: 'fictional-recovery-code',
			}),
		);
	});

	it('confirms an uncertain MFA outcome through the session endpoint without replaying the code', async () => {
		const onAuthenticated = vi.fn<() => void>();
		fetchMock
			.mockResolvedValueOnce(Response.json({}, { status: 503 }))
			.mockResolvedValueOnce(Response.json(session));
		renderVerification(onAuthenticated);
		await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
			'/api/auth/mfa/verify',
			'/api/auth/session',
		]);
	});

	it('keeps email delivery failures safe and blocks verification before a confirmed send', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ private: 'provider-secret' }, { status: 503 }));
		render(
			<MfaForm
				challenge={{ ...challenge, methods: ['email_otp', 'totp'] }}
				onRestart={vi.fn<() => void>()}
				onAuthenticated={vi.fn<() => void>()}
			/>,
		);
		fireEvent.click(screen.getByRole('radio', { name: 'Email code' }));
		fireEvent.click(screen.getByRole('button', { name: 'Send email code' }));
		await screen.findByRole('alert');
		expect(screen.getByRole('alert').textContent).not.toContain('provider-secret');
		expect(screen.getByRole('button', { name: 'Open platform' }).hasAttribute('disabled')).toBe(
			true,
		);
		expect(fetchMock).toHaveBeenCalledOnce();
	});
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

	it('navigates after confirmed MFA without issuing a redundant session read', async () => {
		const onAuthenticated = vi.fn<() => void>();
		fetchMock.mockResolvedValueOnce(
			Response.json({ status: 'authenticated', expiresAt: expiration, csrfToken: csrf }),
		);
		renderVerification(onAuthenticated);
		await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/auth/mfa/verify']);
	});

	it('retries only session confirmation after an uncertain outcome, without replaying MFA', async () => {
		const onAuthenticated = vi.fn<() => void>();
		fetchMock
			.mockResolvedValueOnce(Response.json({}, { status: 503 }))
			.mockResolvedValueOnce(Response.json({ secret: 'never display' }, { status: 502 }))
			.mockResolvedValueOnce(Response.json(session));
		renderVerification(onAuthenticated);
		await screen.findByRole('alert');
		expect(onAuthenticated).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).not.toContain('never display');
		expect(screen.getByLabelText('Six-digit code').hasAttribute('disabled')).toBe(true);
		fireEvent.click(screen.getByRole('button', { name: 'Check session' }));
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
