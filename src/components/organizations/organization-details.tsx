import { Building03Icon, PencilEdit01Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
	const canManageInvitations =
		onManageOwnerInvitations !== undefined &&
		Object.values(ownerInvitationPermissions).some((permission) =>
			permissions.includes(permission),
		);
	const hasActions =
		canUpdate ||
		canManageInvitations ||
		availableLifecycleActions(organization, permissions).length > 0;
	const timeline = [
		['Registered', organization.createdAt],
		['Last updated', organization.updatedAt],
		['Last activated', organization.activatedAt],
		['Last suspended', organization.suspendedAt],
		['Archived', organization.archivedAt],
	] as const;
	return (
		<Dialog
			title={
				<span className={styles.title}>
					<HugeiconsIcon icon={Building03Icon} size={20} aria-hidden="true" />
					<span>{organization.name}</span>
				</span>
			}
			returnFocus={returnFocus}
			onClose={onClose}
			footer={
				hasActions ? (
					<div className={styles.actions}>
						{canManageInvitations ? (
							<Button
								icon={UserMultiple02Icon}
								variant="secondary"
								size="sm"
								width="auto"
								aria-haspopup="dialog"
								aria-label="Manage owner invitations"
								data-autofocus={focusInvitations || undefined}
								onClick={onManageOwnerInvitations}
							>
								invitations
							</Button>
						) : null}
						{canUpdate ? (
							<Button
								icon={PencilEdit01Icon}
								variant="secondary"
								size="sm"
								width="auto"
								aria-haspopup="dialog"
								aria-label="Edit gym name"
								onClick={onEdit}
							>
								Edit
							</Button>
						) : null}
						<OrganizationLifecycleActions
							organization={organization}
							permissions={permissions}
							onComplete={onLifecycleChange}
							onReload={onReload}
						/>
					</div>
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
							<dt>Slug</dt>
							<dd>{organization.slug}</dd>
						</div>
						<div>
							<dt>Organization UUID</dt>
							<dd className={styles.identifier}>{organization.id}</dd>
						</div>
					</dl>
				</section>
				<section className={styles.section}>
					<div className={styles.sectionHeading}>
						<h3>Lifecycle dates</h3>
						<span className={styles.note}>Kigali time (UTC+2)</span>
					</div>
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
				<details className={styles.preview}>
					<summary className={styles.previewToggle}>
						<span>Address preview</span>
						<span className={styles.note}>Preview only</span>
					</summary>
					<p className={styles.address}>{organization.slug}.gym.rw</p>
					<p className={styles.note}>Not provisioned.</p>
				</details>
			</div>
		</Dialog>
	);
}
