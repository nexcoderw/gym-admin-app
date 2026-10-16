'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cancel01Icon, RefreshIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import { ownerInvitationSchema, type OwnerInvitation } from '@/lib/contracts/owner-invitations';
import styles from './owner-invitations.module.css';

/** Confirmation content inside the single active Dialog, avoiding overlapping native modals. */
export function OwnerInvitationRevokeDialog({ invitation, onBack, onSaved, onBusyChange, onUnconfirmed }: {
	readonly invitation: OwnerInvitation;
	readonly onBack: () => void;
	readonly onSaved: () => void;
	readonly onBusyChange: (busy: boolean) => void;
	readonly onUnconfirmed: () => void;
}) {
	const router = useRouter();
	const inFlight = useRef(false);
	const mounted = useRef(true);
	const [pending, setPending] = useState(false);
	const [blocked, setBlocked] = useState(false);
	const [error, setError] = useState('');
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	async function revoke() {
		if (inFlight.current || blocked) return;
		inFlight.current = true;
		setPending(true);
		onBusyChange(true);
		setError('');
		try {
			await browserRequest(browserApi.revokeOwnerInvitation(invitation.organizationId, invitation.id), 'POST', undefined,
				ownerInvitationSchema.refine((row) => row.id === invitation.id && row.organizationId === invitation.organizationId && row.status === 'REVOKED'),
				browserCsrf(), { domain: 'owner-invitations', expectedStatus: 200 });
			if (mounted.current) { onBusyChange(false); onSaved(); }
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof OrganizationRequestError && failure.status === 401) {
				router.replace(routes.login);
				router.refresh();
			}
			setError(failure instanceof OrganizationRequestError ? failure.message : 'Revocation could not be confirmed. Reload invitations before another action.');
			setBlocked(true);
			onUnconfirmed();
		} finally {
			inFlight.current = false;
			if (mounted.current) { setPending(false); onBusyChange(false); }
		}
	}
	return (
		<div className={styles.content}>
			<div className={styles.notice}><strong>{invitation.displayName}</strong><p className={styles.email}>{invitation.email}</p></div>
			<p>The recipient will no longer be able to use this invitation. This does not remove any existing gym ownership.</p>
			{error ? <p role="alert" className={styles.error}>{error}</p> : null}
			<div className={styles.actions}>
				<Button icon={blocked ? RefreshIcon : Cancel01Icon} variant="secondary" disabled={pending} onClick={onBack} data-autofocus>{blocked ? 'Reload invitations' : 'Cancel'}</Button>
				<Button icon={Cancel01Icon} pending={pending} disabled={blocked} onClick={revoke}>Revoke invitation</Button>
			</div>
		</div>
	);
}
