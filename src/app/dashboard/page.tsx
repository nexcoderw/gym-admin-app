import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/shared/card';
import { routes } from '@/constants/routes';
import type { DashboardSummary } from '@/lib/contracts/dashboard';
import { getSummary } from '@/lib/server/endpoints/dashboard/get-summary';
import { BffError } from '@/lib/server/http/errors';
import { serverContext } from '@/lib/server/session';

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
			<>
				<PageHeader
					title="Dashboard access required"
					description="Your session is valid, but it does not include the dashboard permission."
				/>
				<Card>
					<p>
						Ask an authorized platform operator to review your access. A role name alone does not
						grant dashboard access.
					</p>
				</Card>
			</>
		);
	}

	return (
		<>
			<PageHeader
				title="Platform overview"
				description="A current view of platform identity and authorization records."
			/>
			<DashboardOverview summary={summary} />
		</>
	);
}
