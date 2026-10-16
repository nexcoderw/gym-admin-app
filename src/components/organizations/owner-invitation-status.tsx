import {
	ownerInvitationStatusContent,
	type OwnerInvitationStatus,
} from '@/lib/contracts/owner-invitations';
import styles from './owner-invitations.module.css';

export function OwnerInvitationStatusBadge({ status }: { readonly status: OwnerInvitationStatus }) {
	return (
		<span className={styles.badge} data-status={status}>
			{ownerInvitationStatusContent[status].label}
		</span>
	);
}
