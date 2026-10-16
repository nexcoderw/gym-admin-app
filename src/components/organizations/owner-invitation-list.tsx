'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	Cancel01Icon,
	MailSend01Icon,
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { StatePanel } from '@/components/shared/state-panel';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import {
	ownerInvitationDeliverySchema,
	ownerInvitationListSchema,
	ownerInvitationStatusContent,
	type OwnerInvitation,
	type OwnerInvitationListQuery,
	type OwnerInvitationListResponse,
} from '@/lib/contracts/owner-invitations';
import { formatOrganizationDateTime } from './organization-dates';
import { OwnerInvitationStatusBadge } from './owner-invitation-status';
import styles from './owner-invitations.module.css';

type ReadState =
	| { readonly phase: 'loading' }
	| { readonly phase: 'error'; readonly status: number; readonly message: string }
	| { readonly phase: 'ready'; readonly data: OwnerInvitationListResponse };

/** Mounted only with read permission, and keyed by query/revision to discard stale private data. */
export function OwnerInvitationList({
	organizationId,
	query,
	canRevoke,
	canSend,
	hasPrevious,
	onPrevious,
	onNext,
	onRevoke,
	onLoaded,
	onDeliveryQueued,
}: {
	readonly organizationId: string;
	readonly query: OwnerInvitationListQuery;
	readonly canRevoke: boolean;
	readonly canSend: boolean;
	readonly hasPrevious: boolean;
	readonly onPrevious: () => void;
	readonly onNext: (cursor: string) => void;
	readonly onRevoke: (invitation: OwnerInvitation) => void;
	readonly onLoaded: () => void;
	readonly onDeliveryQueued: (message: string) => void;
}) {
	const router = useRouter();
	const [state, setState] = useState<ReadState>({ phase: 'loading' });
	const [sendingId, setSendingId] = useState<string | null>(null);
	const { limit, status, cursor } = query;
	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			const params = new URLSearchParams({ limit: String(limit) });
			if (status) params.set('status', status);
			if (cursor) params.set('cursor', cursor);
			try {
				const data = await browserRequest(
					`${browserApi.ownerInvitations(organizationId)}?${params}`,
					'GET',
					undefined,
					ownerInvitationListSchema.refine(
						(page) =>
							page.items.length <= limit &&
							page.items.every(
								(row) =>
									row.organizationId === organizationId &&
									(status === undefined || row.status === status),
							),
					),
					undefined,
					{ domain: 'owner-invitations', expectedStatus: 200, signal: controller.signal },
				);
				if (controller.signal.aborted) return;
				setState({ phase: 'ready', data });
				onLoaded();
			} catch (failure) {
				if (controller.signal.aborted) return;
				const code = failure instanceof OrganizationRequestError ? failure.status : 503;
				setState({
					phase: 'error',
					status: code,
					message:
						failure instanceof OrganizationRequestError
							? failure.message
							: 'Owner invitations could not be loaded. Try again.',
				});
				if (code === 401) {
					router.replace(routes.login);
					router.refresh();
				}
			}
		}
		void load();
		return () => controller.abort();
	}, [organizationId, limit, status, cursor, onLoaded, router]);

	if (state.phase === 'loading')
		return (
			<StatePanel
				kind="loading"
				layout="compact"
				headingLevel={2}
				title={cursor ? 'Loading more invitations' : 'Loading owner invitations'}
			/>
		);
	if (state.phase === 'error')
		return (
			<StatePanel
				kind={state.status === 403 ? '403' : '503'}
				layout="compact"
				headingLevel={2}
				title={state.status === 403 ? 'Invitation access denied' : 'Invitations unavailable'}
				description={state.message}
			/>
		);
	return (
		<div className={styles.content}>
			{state.data.items.length === 0 ? (
				<StatePanel
					kind="empty"
					layout="compact"
					headingLevel={2}
					title={
						status
							? 'No invitations with this status'
							: cursor
								? 'No more invitations'
								: 'No owner invitations yet'
					}
					description={
						status || cursor
							? 'Choose another status or return to the first results.'
							: 'Create a pending owner invitation when you have the recipient’s details.'
					}
				/>
			) : (
				<ul className={styles.list} aria-label="Owner invitations">
					{state.data.items.map((invitation) => (
						<li className={styles.item} key={invitation.id}>
							<div className={styles.heading}>
								<h3>{invitation.displayName}</h3>
								<OwnerInvitationStatusBadge status={invitation.status} />
							</div>
							<p className={styles.email}>{invitation.email}</p>
							<p className={styles.description}>
								{ownerInvitationStatusContent[invitation.status].description}
							</p>
							{invitation.deliveryStatus ? (
								<p className={styles.description}>
									Delivery: {invitation.deliveryStatus.toLowerCase().replace('_', ' ')}.
								</p>
							) : null}
							<dl className={styles.dates}>
								{(
									[
										['Created', invitation.createdAt],
										['Sent', invitation.sentAt],
										['Expires', invitation.expiresAt],
										['Accepted', invitation.acceptedAt],
										['Revoked', invitation.revokedAt],
									] as const
								).map(([label, value]) =>
									value ? (
										<div key={label}>
											<dt>{label} (Kigali time)</dt>
											<dd>
												<time dateTime={value}>{formatOrganizationDateTime(value)}</time>
											</dd>
										</div>
									) : null,
								)}
							</dl>
							{canRevoke &&
							(invitation.status === 'PENDING_DELIVERY' || invitation.status === 'SENT') ? (
								<Button
									icon={Cancel01Icon}
									variant="secondary"
									size="sm"
									width="auto"
									className={styles.revokeAction}
									aria-haspopup="dialog"
									onClick={() => onRevoke(invitation)}
								>
									Revoke invitation
								</Button>
							) : null}
							{canSend && invitation.status === 'PENDING_DELIVERY' ? (
								<Button
									icon={MailSend01Icon}
									size="sm"
									width="auto"
									disabled={sendingId !== null}
									onClick={async () => {
										setSendingId(invitation.id);
										try {
											const result = await browserRequest(
												browserApi.sendOwnerInvitation(organizationId, invitation.id),
												'POST',
												undefined,
												ownerInvitationDeliverySchema,
												browserCsrf(),
												{ domain: 'owner-invitations', expectedStatus: 202 },
											);
											onDeliveryQueued(result.message);
										} catch (failure) {
											setState({
												phase: 'error',
												status: failure instanceof OrganizationRequestError ? failure.status : 503,
												message:
													failure instanceof OrganizationRequestError
														? failure.message
														: 'Delivery could not be queued.',
											});
										} finally {
											setSendingId(null);
										}
									}}
								>
									{sendingId === invitation.id ? 'Queueing…' : 'Send invitation'}
								</Button>
							) : null}
						</li>
					))}
				</ul>
			)}
			{hasPrevious || state.data.nextCursor !== null ? (
				<div className={styles.actions} aria-label="Invitation pagination">
					<Button
						icon={ArrowLeft01Icon}
						variant="secondary"
						size="sm"
						width="auto"
						disabled={!hasPrevious}
						onClick={onPrevious}
					>
						Previous results
					</Button>
					<Button
						icon={ArrowRight01Icon}
						variant="secondary"
						size="sm"
						width="auto"
						disabled={state.data.nextCursor === null}
						onClick={() => {
							if (state.data.nextCursor) onNext(state.data.nextCursor);
						}}
					>
						Next results
					</Button>
				</div>
			) : null}
		</div>
	);
}
