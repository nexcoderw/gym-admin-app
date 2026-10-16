'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft01Icon, Mail01Icon, RefreshIcon, UserAdd01Icon, UserIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import { createOwnerInvitationSchema, ownerInvitationSchema } from '@/lib/contracts/owner-invitations';
import styles from './owner-invitations.module.css';

export function OwnerInvitationForm({ organizationId, canRead, onBack, onSaved, onBusyChange, onUnconfirmed }: {
	readonly organizationId: string;
	readonly canRead: boolean;
	readonly onBack: () => void;
	readonly onSaved: () => void;
	readonly onBusyChange: (busy: boolean) => void;
	readonly onUnconfirmed: () => void;
}) {
	const id = useId();
	const router = useRouter();
	const inFlight = useRef(false);
	const mounted = useRef(true);
	const [pending, setPending] = useState(false);
	const [blocked, setBlocked] = useState(false);
	const [error, setError] = useState('');
	const [fields, setFields] = useState<{ displayName?: string; email?: string }>({});
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (inFlight.current || blocked) return;
		const values = new FormData(event.currentTarget);
		const parsed = createOwnerInvitationSchema.safeParse({ displayName: values.get('displayName'), email: values.get('email') });
		if (!parsed.success) {
			setFields({
				displayName: parsed.error.issues.find((issue) => issue.path[0] === 'displayName')?.message,
				email: parsed.error.issues.find((issue) => issue.path[0] === 'email')?.message,
			});
			setError('Check the highlighted owner details.');
			return;
		}
		inFlight.current = true;
		setPending(true);
		onBusyChange(true);
		setError('');
		setFields({});
		try {
			await browserRequest(browserApi.ownerInvitations(organizationId), 'POST', parsed.data,
				ownerInvitationSchema.refine((row) => row.organizationId === organizationId && row.status === 'PENDING_DELIVERY' && row.email === parsed.data.email && row.displayName === parsed.data.displayName),
				browserCsrf(), { domain: 'owner-invitations', expectedStatus: 201 });
			if (mounted.current) { onBusyChange(false); onSaved(); }
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof OrganizationRequestError && failure.status === 401) {
				router.replace(routes.login);
				router.refresh();
			}
			setError(failure instanceof OrganizationRequestError ? failure.message : 'The result could not be confirmed. Review invitations before retrying.');
			const mustReview = !(failure instanceof OrganizationRequestError) || failure.status >= 500 && failure.code !== 'OWNER_INVITATION_AUDIT_UNAVAILABLE';
			setBlocked(mustReview);
			if (mustReview) onUnconfirmed();
		} finally {
			inFlight.current = false;
			if (mounted.current) { setPending(false); onBusyChange(false); }
		}
	}
	return (
		<form className={styles.form} onSubmit={submit} aria-busy={pending} noValidate>
			<p className={styles.notice}>Creating this invitation records a pending owner request. No email will be sent until invitation delivery is enabled.</p>
			<Input id={`${id}-name`} name="displayName" label="Owner full name" icon={UserIcon} autoComplete="name" required disabled={pending || blocked} error={fields.displayName} data-autofocus />
			<Input id={`${id}-email`} name="email" label="Owner email address" icon={Mail01Icon} type="email" autoComplete="email" maxLength={254} required disabled={pending || blocked} error={fields.email} />
			{error ? <p role="alert" className={styles.error}>{error}</p> : null}
			{blocked && !canRead ? <p className={styles.notice}>Ask an operator with invitation-read permission to review the result before creating another invitation.</p> : null}
			<div className={styles.actions}>
				<Button icon={blocked ? RefreshIcon : ArrowLeft01Icon} variant="secondary" disabled={pending} onClick={onBack}>{blocked && canRead ? 'Review invitations' : 'Back'}</Button>
				<Button icon={UserAdd01Icon} type="submit" width="full" pending={pending} disabled={blocked}>Create invitation</Button>
			</div>
		</form>
	);
}
