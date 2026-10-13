import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { PageHeader } from '@/components/shared/page-header';
import { AppShell } from '@/components/shared/app-shell';
import { RecoveryState } from '@/components/shared/recovery-state';
import { routes } from '@/constants/routes';
import type { DashboardSummary } from '@/lib/contracts/dashboard';
import { getSummary } from '@/lib/server/endpoints/dashboard/get-summary';
import { BffError } from '@/lib/server/http/errors';
import { requirePlatformSession, serverContext } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Overview' };

async function loadDashboardSummary(): Promise<DashboardSummary | null> {
	try {
		return await getSummary(await serverContext());
	} catch (error) {
		if (error instanceof BffError && error.status === 401) redirect(routes.login);
		if (error instanceof BffError && error.status === 403) return null;
		throw error;
	}
}

export default async function DashboardPage() {
	const summary = await loadDashboardSummary();

	if (summary === null) {
		return (
			<RecoveryState
				kind="403"
				title="Dashboard access required"
				description="Your session is valid, but it does not include the dashboard permission. Ask your platform operator to review your access."
			/>
		);
	}
	const session = await requirePlatformSession();

	return (
		<AppShell permissions={session.permissions} displayName={session.displayName}>
			<PageHeader
				title="Platform overview"
				description="A current view of platform identity and authorization records."
			/>
			<DashboardOverview summary={summary} />
		</AppShell>
	);
}
