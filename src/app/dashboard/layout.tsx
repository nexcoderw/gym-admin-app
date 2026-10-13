import type { ReactNode } from 'react';

import { AppShell } from '@/components/shared/app-shell';
import { requirePlatformSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const session = await requirePlatformSession();
	return <AppShell permissions={session.permissions} displayName={session.displayName}>{children}</AppShell>;
}
