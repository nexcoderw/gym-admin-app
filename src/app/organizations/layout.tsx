import type { ReactNode } from 'react';
import { AppShell } from '@/components/shared/app-shell';
import { SessionLifecycle } from '@/components/auth/session-lifecycle';
import { requirePlatformSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function OrganizationsLayout({ children }: { children: ReactNode }) {
	const session = await requirePlatformSession();
	return (
		<AppShell permissions={session.permissions} displayName={session.displayName}>
			<SessionLifecycle expiresAt={session.expiresAt} />
			{children}
		</AppShell>
	);
}
