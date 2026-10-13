'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cancel01Icon, CheckmarkCircle01Icon, PauseIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/shared/button';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import { organizationPermissions, organizationSchema, type Organization } from '@/lib/contracts/organizations';
import styles from './organization-lifecycle-actions.module.css';

export function OrganizationLifecycleActions({ organization, permissions }: { readonly organization: Organization; readonly permissions: readonly string[] }) {
	const router = useRouter();
	const dialogId = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const trigger = useRef<HTMLButtonElement | null>(null);
	const cancel = useRef<HTMLButtonElement>(null);
	const inFlight = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const [action, setAction] = useState<'activation' | 'suspension' | null>(null);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [blocked, setBlocked] = useState(false);
	const canActivate = permissions.includes(organizationPermissions.activate) && ['PENDING', 'SUSPENDED'].includes(organization.status);
	const canSuspend = permissions.includes(organizationPermissions.suspend) && organization.status === 'ACTIVE';
	useEffect(() => {
		if (action !== null) {
			dialog.current?.showModal();
			cancel.current?.focus();
		}
	}, [action]);
	function close() {
		if (inFlight.current) return;
		dialog.current?.close();
		setAction(null);
		trigger.current?.focus();
	}
	async function confirm() {
		if (inFlight.current || action === null || blocked) return;
		inFlight.current = true;
		setPending(true);
		setError('');
		try {
			// A new read must not silently replace the version the administrator confirmed.
			const latest = await browserRequest(browserApi.organization(organization.id), 'GET', undefined, organizationSchema, undefined, { domain: 'organizations', expectedStatus: 200 });
			if (!mounted.current) return;
			if (latest.updatedAt !== organization.updatedAt || latest.status !== organization.status) {
				throw new OrganizationRequestError(412, 'ORGANIZATION_STALE', 'This gym has changed. Reload its current details and confirm the action again.');
			}
			await browserRequest(action === 'activation' ? browserApi.activateOrganization(organization.id) : browserApi.suspendOrganization(organization.id), 'POST', { expectedUpdatedAt: latest.updatedAt }, organizationSchema, browserCsrf(), { domain: 'organizations', expectedStatus: 200 });
			if (!mounted.current) return;
			inFlight.current = false;
			close();
			router.refresh();
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof OrganizationRequestError && failure.status === 401) {
				router.replace(routes.login);
				router.refresh();
			}
			setError(failure instanceof OrganizationRequestError ? failure.message : 'The change could not be confirmed. Reload the current gym details.');
			setBlocked(true);
		} finally {
			inFlight.current = false;
			if (mounted.current) setPending(false);
		}
	}
	return (
		<div className={styles.actions}>
			{canActivate ? <Button icon={CheckmarkCircle01Icon} onClick={(event) => { trigger.current = event.currentTarget; setAction('activation'); if (!blocked) setError(''); }}>Activate gym</Button> : null}
			{canSuspend ? <Button icon={PauseIcon} variant="secondary" onClick={(event) => { trigger.current = event.currentTarget; setAction('suspension'); if (!blocked) setError(''); }}>Suspend gym</Button> : null}
			<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`} onCancel={(event) => { event.preventDefault(); close(); }}>
				<h2 id={`${dialogId}-title`}>{action === 'activation' ? 'Activate' : 'Suspend'} {organization.name}?</h2>
				<p id={`${dialogId}-description`}>{action === 'activation' ? 'This records platform approval. It does not activate a subscription or provision a subdomain.' : 'This changes the gym lifecycle to suspended. It does not delete members or cancel subscription billing.'}</p>
				{error ? <p role="alert" className="error-message">{error}</p> : null}
				<div className={styles.actions}>
					<Button icon={action === 'activation' ? CheckmarkCircle01Icon : PauseIcon} pending={pending} disabled={blocked} onClick={confirm}>Confirm {action === 'activation' ? 'activation' : 'suspension'}</Button>
					<Button ref={cancel} icon={Cancel01Icon} variant="secondary" disabled={pending} onClick={close}>Cancel</Button>
					{blocked ? <Button icon={RefreshIcon} variant="secondary" onClick={() => window.location.reload()}>Reload gym</Button> : null}
				</div>
			</dialog>
		</div>
	);
}
