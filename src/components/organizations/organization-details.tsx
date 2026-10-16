import { PencilEdit01Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { organizationPermissions, type Organization } from '@/lib/contracts/organizations';
import { ownerInvitationPermissions } from '@/lib/contracts/owner-invitations';
import { formatOrganizationDateTime } from './organization-dates';
import {
	availableLifecycleActions,
	OrganizationLifecycleActions,
	type LifecycleAction,
} from './organization-lifecycle-actions';
import { OrganizationStatusBadge } from './organization-status-badge';
import styles from './organization-details.module.css';

/** Read-only record view; every change it offers opens its own confirmed operation. */
export function OrganizationDetails({
	organization,
	permissions,
	returnFocus,
	onClose,
	onEdit,
	onLifecycleChange,
	onReload,
	onManageOwnerInvitations,
	focusInvitations = false,
}: {
	readonly organization: Organization;
	readonly permissions: readonly string[];
	readonly returnFocus?: HTMLElement | null;
	readonly onClose: () => void;
	readonly onEdit: () => void;
	readonly onLifecycleChange: (organization: Organization, action: LifecycleAction) => void;
	readonly onReload: () => void;
	readonly onManageOwnerInvitations?: () => void;
	readonly focusInvitations?: boolean;
}) {
	const canUpdate =
		organization.status !== 'ARCHIVED' && permissions.includes(organizationPermissions.update);
	const canManageInvitations = onManageOwnerInvitations !== undefined && Object.values(ownerInvitationPermissions).some((permission) => permissions.includes(permission));
	const hasActions = canUpdate || canManageInvitations || availableLifecycleActions(organization, permissions).length > 0;
	const timeline = [
		['Registered', organization.createdAt],
		['Last updated', organization.updatedAt],
		['Last activated', organization.activatedAt],
		['Last suspended', organization.suspendedAt],
		['Archived', organization.archivedAt],
	] as const;
	return (
		<Dialog
			size="large"
			title={organization.name}
			description="The current registry record and platform lifecycle."
			returnFocus={returnFocus}
			onClose={onClose}
			footer={
				hasActions ? (
					<>
						{canManageInvitations ? (
							<Button icon={UserMultiple02Icon} variant="secondary" width="full" aria-haspopup="dialog" data-autofocus={focusInvitations || undefined} onClick={onManageOwnerInvitations}>
								Manage owner invitations
							</Button>
						) : null}
						{canUpdate ? (
							<Button
								icon={PencilEdit01Icon}
								variant="secondary"
								width="full"
								aria-haspopup="dialog"
								onClick={onEdit}
							>
								Edit gym name
							</Button>
						) : null}
						<OrganizationLifecycleActions
							organization={organization}
							permissions={permissions}
							onComplete={onLifecycleChange}
							onReload={onReload}
						/>
					</>
				) : undefined
			}
		>
			<div className={styles.details}>
				<section className={styles.section}>
					<div className={styles.sectionHeading}>
						<h3>Registry record</h3>
						<OrganizationStatusBadge status={organization.status} />
					</div>
					<dl className={styles.fields}>
						<div>
							<dt>Gym name</dt>
							<dd>{organization.name}</dd>
						</div>
						<div>
							<dt>Slug</dt>
							<dd>{organization.slug}</dd>
						</div>
						<div className={styles.wide}>
							<dt>Organization UUID</dt>
							<dd className={styles.identifier}>{organization.id}</dd>
						</div>
					</dl>
				</section>
				<section className={styles.section}>
					<h3>Lifecycle timeline (Kigali time)</h3>
					<dl className={styles.timeline}>
						{timeline.map(([label, value]) =>
							value ? (
								<div key={label}>
									<dt>{label}</dt>
									<dd>
										<time dateTime={value}>{formatOrganizationDateTime(value)}</time>
									</dd>
								</div>
							) : null,
						)}
					</dl>
				</section>
				<section className={styles.preview}>
					<h3>Future address preview</h3>
					<p className={styles.address}>{organization.slug}.gym.rw</p>
					<p className={styles.note}>
						Preview only. This subdomain has not been provisioned by this interface.
					</p>
				</section>
			</div>
		</Dialog>
	);
}
