import type { DashboardSummary } from '@/lib/contracts/dashboard';
import { Card } from '@/components/shared/card';
import { StatCard } from './stat-card';
import styles from './dashboard-overview.module.css';

export function DashboardOverview({ summary }: { summary: DashboardSummary }) {
	const statuses = [
		{ key: 'pending', label: 'Pending', description: 'Awaiting activation' },
		{ key: 'active', label: 'Active', description: 'Active staff assignments' },
		{ key: 'suspended', label: 'Suspended', description: 'Temporarily suspended assignments' },
		{ key: 'revoked', label: 'Revoked', description: 'Revoked platform assignments' },
	] as const;
	return <div className={styles.overview}>
		<section aria-label="Platform totals" className={styles.metrics}>
			<StatCard label="Global accounts" value={summary.globalUsers.total} description="All identity accounts, not gym members." />
			<StatCard label="Platform staff" value={summary.platformStaff.total} description="Staff assignments across every status." />
			<StatCard label="Platform roles" value={summary.platformRoles.total} description="Registered roles, assigned or unassigned." />
			<StatCard label="Permissions" value={summary.platformPermissions.total} description="Registered platform permissions." />
		</section>
		<Card><div className={styles.sectionHeading}><h2>Staff assignment status</h2><p>Database status—not online activity or complete access eligibility.</p></div>
			<dl className={styles.statuses}>{statuses.map((status) => <div key={status.key}><dt>{status.label}<span>{status.description}</span></dt><dd>{summary.platformStaff[status.key]}</dd></div>)}</dl>
		</Card>
		<p className={styles.timestamp}>Snapshot response generated <time dateTime={summary.generatedAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(summary.generatedAt))} UTC</time></p>
	</div>;
}
