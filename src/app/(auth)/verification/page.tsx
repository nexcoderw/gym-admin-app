import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { VerificationForm } from '@/components/auth/verification-form';
import { requireAnonymousSession } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Verify your sign-in' };

export default async function VerificationPage() {
	await requireAnonymousSession();
	return (
		<AuthShell step="verification" label="Sign-in verification">
			<VerificationForm />
		</AuthShell>
	);
}
