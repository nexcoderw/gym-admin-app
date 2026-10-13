import type { OrganizationStatus } from '@/lib/contracts/organizations';
import styles from './organization-status-badge.module.css';

const labels: Record<OrganizationStatus, string> = { PENDING: 'Pending', ACTIVE: 'Active', SUSPENDED: 'Suspended', ARCHIVED: 'Archived' };
export function OrganizationStatusBadge({ status }: { readonly status: OrganizationStatus }) {
	return <span className={styles.badge} data-status={status}>{labels[status]}</span>;
}
