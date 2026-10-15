import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { requireAnonymousSession } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
	await requireAnonymousSession();
	return (
		<AuthShell step="sign-in" label="Administrator sign-in">
			<LoginForm />
		</AuthShell>
	);
}
