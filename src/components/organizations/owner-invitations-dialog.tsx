'use client';

import { useCallback, useId, useRef, useState } from 'react';
import {
	ArrowLeft01Icon,
	RefreshIcon,
	UserAdd01Icon,
	UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { StatePanel } from '@/components/shared/state-panel';
import { useToast } from '@/components/shared/toast';
import type { Organization } from '@/lib/contracts/organizations';
import {
	ownerInvitationPermissions,
	ownerInvitationStatusContent,
	ownerInvitationStatusSchema,
	type OwnerInvitation,
	type OwnerInvitationListQuery,
} from '@/lib/contracts/owner-invitations';
import { OrganizationStatusBadge } from './organization-status-badge';
import { OwnerInvitationForm } from './owner-invitation-form';
import { OwnerInvitationList } from './owner-invitation-list';
import { OwnerInvitationRevokeDialog } from './owner-invitation-revoke-dialog';
import styles from './owner-invitations.module.css';

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'revoke'; invitation: OwnerInvitation };

export function OwnerInvitationsDialog({
	organization,
	permissions,
	returnFocus,
	onClose,
}: {
	readonly organization: Organization;
	readonly permissions: readonly string[];
	readonly returnFocus?: HTMLElement | null;
	readonly onClose: () => void;
}) {
	const toast = useToast();
	const filterId = useId();
	const canRead = permissions.includes(ownerInvitationPermissions.read);
	const [view, setView] = useState<View>({ kind: 'list' });
	const [pending, setPending] = useState(false);
	const pendingRef = useRef(false);
	const [query, setQuery] = useState<OwnerInvitationListQuery>({ limit: 20 });
	const [trail, setTrail] = useState<readonly (string | undefined)[]>([]);
	const [revision, setRevision] = useState(0);
	const [reviewRequired, setReviewRequired] = useState(canRead);
	const canCreate =
		permissions.includes(ownerInvitationPermissions.create) &&
		(organization.status === 'PENDING' || organization.status === 'ACTIVE');
	const canRevoke = permissions.includes(ownerInvitationPermissions.revoke);
	const onLoaded = useCallback(() => setReviewRequired(false), []);
	const busy = useCallback((value: boolean) => {
		pendingRef.current = value;
		setPending(value);
	}, []);
	function back() {
		if (pendingRef.current) return;
		setView({ kind: 'list' });
		setRevision((value) => value + 1);
	}
	function saved(message: string) {
		toast.success(message);
		setQuery((current) => ({ limit: current.limit, status: current.status }));
		setTrail([]);
		back();
	}
	function reload() {
		setQuery((current) => ({ limit: current.limit, status: current.status }));
		setTrail([]);
		setRevision((value) => value + 1);
	}
	return (
		<Dialog
			key={view.kind}
			size={view.kind === 'list' ? 'medium' : 'small'}
			title={
				<span className={styles.dialogTitle}>
					<HugeiconsIcon icon={UserMultiple02Icon} size={20} aria-hidden="true" />
					<span>
						{view.kind === 'create'
							? 'Create owner invitation'
							: view.kind === 'revoke'
								? 'Revoke this owner invitation?'
								: 'Owner invitations'}
					</span>
				</span>
			}
			description={
				<span className={styles.context}>
					<span>{organization.name}</span>
					<OrganizationStatusBadge status={organization.status} />
				</span>
			}
			dismissible={!pending}
			returnFocus={returnFocus}
			onClose={() => {
				if (!pendingRef.current) onClose();
			}}
			footer={
				view.kind === 'list' ? (
					<div className={styles.dialogActions}>
						<Button
							icon={ArrowLeft01Icon}
							variant="secondary"
							size="sm"
							width="auto"
							onClick={onClose}
						>
							Back to gym
						</Button>
						{canRead ? (
							<Button
								icon={RefreshIcon}
								variant="secondary"
								size="sm"
								width="auto"
								onClick={reload}
							>
								Reload invitations
							</Button>
						) : null}
					</div>
				) : undefined
			}
		>
			<div className={styles.content}>
				{view.kind === 'create' && canCreate ? (
					<OwnerInvitationForm
						organizationId={organization.id}
						canRead={canRead}
						onBack={back}
						onBusyChange={busy}
						onUnconfirmed={() => setReviewRequired(true)}
						onSaved={() => saved('Owner invitation created. Email delivery is not enabled yet.')}
					/>
				) : view.kind === 'revoke' && canRead && canRevoke ? (
					<OwnerInvitationRevokeDialog
						invitation={view.invitation}
						onBack={back}
						onBusyChange={busy}
						onUnconfirmed={() => setReviewRequired(true)}
						onSaved={() => saved('Owner invitation revoked. Existing gym ownership was not changed.')}
					/>
				) : (
					<>
						<div className={styles.toolbar}>
							{canRead ? (
								<p id={filterId} className={styles.filterLabel}>
									Invitation status
								</p>
							) : null}
							{canCreate ? (
								<Button
									icon={UserAdd01Icon}
									size="sm"
									width="auto"
									disabled={reviewRequired}
									onClick={() => setView({ kind: 'create' })}
									aria-haspopup="dialog"
									data-autofocus={!canRead || undefined}
								>
									Create invitation
								</Button>
							) : null}
						</div>
						{canRead ? (
							<div className={styles.filters} role="group" aria-labelledby={filterId}>
								{[undefined, ...ownerInvitationStatusSchema.options].map((status) => (
									<button
										key={status ?? 'all'}
										type="button"
										className={`${styles.badge} ${styles.filterBadge}`}
										data-status={status}
										aria-pressed={query.status === status}
										data-autofocus={query.status === status || undefined}
										onClick={() => {
											if (query.status === status) return;
											setQuery({ limit: query.limit, status });
											setTrail([]);
										}}
									>
										{status ? ownerInvitationStatusContent[status].label : 'All'}
									</button>
								))}
							</div>
						) : null}
						{canCreate ? (
							<p className={styles.description}>
								Creating an invitation does not send email or grant gym access.
							</p>
						) : null}
						{canRead ? (
							<OwnerInvitationList
								key={`${query.status ?? ''}:${query.cursor ?? ''}:${revision}`}
								organizationId={organization.id}
								query={query}
								canRevoke={canRevoke && !reviewRequired}
								hasPrevious={trail.length > 0}
								onLoaded={onLoaded}
								onRevoke={(invitation) => setView({ kind: 'revoke', invitation })}
								onNext={(cursor) => {
									setTrail((current) => [...current, query.cursor]);
									setQuery((current) => ({ ...current, cursor }));
								}}
								onPrevious={() => {
									const cursor = trail.at(-1);
									setTrail((current) => current.slice(0, -1));
									setQuery((current) => ({ ...current, cursor }));
								}}
							/>
						) : (
							<StatePanel
								kind="403"
								layout="compact"
								headingLevel={3}
								title="Invitation history needs permission"
								description="Your account cannot view invitation records or recipient email addresses. Creation permission is separate from history access."
							/>
						)}
					</>
				)}
			</div>
		</Dialog>
	);
}
