// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthShell } from '@/components/auth/auth-shell';

afterEach(cleanup);

function progress() {
	return within(screen.getByRole('list', { name: 'Sign-in progress' })).getAllByRole('listitem');
}

describe('sign-in shell', () => {
	it('frames the sign-in form in one main landmark with a labelled form region', () => {
		render(
			<AuthShell step="sign-in" label="Administrator sign-in">
				<h1>Welcome back</h1>
			</AuthShell>,
		);
		const main = screen.getByRole('main');
		expect(main.id).toBe('main');
		expect(within(main).getByRole('region', { name: 'Administrator sign-in' })).toBeDefined();
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getAllByText('Private workspace. Authorized platform staff only.')).toHaveLength(
			2,
		);
	});

	it('marks sign-in as the current step before verification', () => {
		render(
			<AuthShell step="sign-in" label="Administrator sign-in">
				<h1>Welcome back</h1>
			</AuthShell>,
		);
		const [signIn, verify, workspace] = progress();
		expect(signIn?.getAttribute('aria-current')).toBe('step');
		expect(verify?.getAttribute('aria-current')).toBeNull();
		expect(workspace?.getAttribute('aria-current')).toBeNull();
		expect(screen.queryByText('(completed)')).toBeNull();
	});

	it('marks password sign-in as completed and verification as current', () => {
		render(
			<AuthShell step="verification" label="Sign-in verification">
				<h1>Verify it’s you</h1>
			</AuthShell>,
		);
		const [signIn, verify] = progress();
		expect(signIn?.textContent).toContain('Sign in (completed)');
		expect(signIn?.getAttribute('aria-current')).toBeNull();
		expect(verify?.getAttribute('aria-current')).toBe('step');
		expect(screen.getByRole('region', { name: 'Sign-in verification' })).toBeDefined();
	});
});
