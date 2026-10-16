'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Archive03Icon,
	ArrowRight01Icon,
	Cancel01Icon,
	CheckmarkCircle01Icon,
	PauseIcon,
	RefreshIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import {
	organizationPermissions,
	organizationSchema,
	type Organization,
} from '@/lib/contracts/organizations';
import { OrganizationStatusBadge } from './organization-status-badge';
import styles from './organization-lifecycle-actions.module.css';

export type LifecycleAction = 'activation' | 'suspension' | 'archival';
type Confirmation = { readonly action: LifecycleAction; readonly trigger: HTMLElement };

const actions = {
	activation: {
		trigger: 'Activate',
		verb: 'Activate',
		confirm: 'Confirm',
		icon: CheckmarkCircle01Icon,
		next: 'ACTIVE',
		description:
			'This records platform approval. It does not activate a subscription or provision a subdomain.',
	},
	suspension: {
		trigger: 'Suspend',
		verb: 'Suspend',
		confirm: 'Confirm',
		icon: PauseIcon,
		next: 'SUSPENDED',
		description:
			'This changes the gym lifecycle to suspended. It does not delete members or cancel subscription billing.',
	},
	archival: {
		trigger: 'Archive',
		verb: 'Archive',
		confirm: 'Confirm',
		icon: Archive03Icon,
		next: 'ARCHIVED',
		description:
			'This permanently removes the gym from normal use while retaining its registry record and audit history. Its slug remains reserved and this interface cannot restore it.',
	},
} as const;

/** Presentation only: Nest re-checks the permission and the transition for every request. */
export function availableLifecycleActions(
	organization: Organization,
	permissions: readonly string[],
): readonly LifecycleAction[] {
	const available: LifecycleAction[] = [];
	if (
		permissions.includes(organizationPermissions.activate) &&
		(organization.status === 'PENDING' || organization.status === 'SUSPENDED')
	) {
		available.push('activation');
	}
	if (permissions.includes(organizationPermissions.suspend) && organization.status === 'ACTIVE') {
		available.push('suspension');
	}
	if (permissions.includes(organizationPermissions.archive) && organization.status !== 'ARCHIVED') {
		available.push('archival');
	}
	return available;
}

export function OrganizationLifecycleActions({
	organization,
	permissions,
	onComplete,
	onReload,
}: {
	readonly organization: Organization;
	readonly permissions: readonly string[];
	readonly onComplete: (organization: Organization, action: LifecycleAction) => void;
	readonly onReload: () => void;
}) {
	const router = useRouter();
	const inFlight = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const [confirming, setConfirming] = useState<Confirmation | null>(null);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [blocked, setBlocked] = useState(false);
	function open(action: LifecycleAction, trigger: HTMLElement) {
		if (!blocked) setError('');
		setConfirming({ action, trigger });
	}
	function close() {
		if (inFlight.current) return;
		setConfirming(null);
	}
	async function confirm() {
		if (inFlight.current || confirming === null || blocked) return;
		const { action } = confirming;
		inFlight.current = true;
		setPending(true);
		setError('');
		try {
			// A new read must not silently replace the version the administrator confirmed.
			const latest = await browserRequest(
				browserApi.organization(organization.id),
				'GET',
				undefined,
				organizationSchema,
				undefined,
				{ domain: 'organizations', expectedStatus: 200 },
			);
			if (!mounted.current) return;
			if (latest.updatedAt !== organization.updatedAt || latest.status !== organization.status) {
				throw new OrganizationRequestError(
					412,
					'ORGANIZATION_STALE',
					'This gym has changed. Reload its current details and confirm the action again.',
				);
			}
			const mutationPath = {
				activation: browserApi.activateOrganization,
				suspension: browserApi.suspendOrganization,
				archival: browserApi.archiveOrganization,
			}[action](organization.id);
			const updated = await browserRequest(
				mutationPath,
				'POST',
				{ expectedUpdatedAt: latest.updatedAt },
				organizationSchema,
				browserCsrf(),
				{ domain: 'organizations', expectedStatus: 200 },
			);
			if (!mounted.current) return;
			inFlight.current = false;
			setConfirming(null);
			onComplete(updated, action);
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof OrganizationRequestError && failure.status === 401) {
				router.replace(routes.login);
				router.refresh();
			}
			setError(
				failure instanceof OrganizationRequestError
					? failure.message
					: 'The change could not be confirmed. Reload the current gym details.',
			);
			setBlocked(true);
		} finally {
			inFlight.current = false;
			if (mounted.current) setPending(false);
		}
	}
	const active = confirming ? actions[confirming.action] : null;
	return (
		<>
			{availableLifecycleActions(organization, permissions).map((action) => (
				<Button
					key={action}
					icon={actions[action].icon}
					variant={action === 'activation' ? 'primary' : 'secondary'}
					size="sm"
					width="auto"
					aria-haspopup="dialog"
					aria-label={`${actions[action].trigger} gym`}
					onClick={(event) => open(action, event.currentTarget)}
				>
					{actions[action].trigger}
				</Button>
			))}
			{confirming && active ? (
				<Dialog
					size="small"
					title={`${active.verb} ${organization.name}?`}
					description={active.description}
					dismissible={!pending}
					returnFocus={confirming.trigger}
					onClose={close}
					footer={
						<>
							{blocked ? (
								<Button icon={RefreshIcon} variant="secondary" width="full" onClick={onReload}>
									Reload gym
								</Button>
							) : (
								<Button
									icon={Cancel01Icon}
									variant="secondary"
									width="full"
									disabled={pending}
									onClick={close}
									data-autofocus
								>
									Cancel
								</Button>
							)}
							<Button
								icon={active.icon}
								width="full"
								pending={pending}
								disabled={blocked}
								aria-label={`Confirm ${confirming.action}`}
								onClick={confirm}
							>
								{active.confirm}
							</Button>
						</>
					}
				>
					<div className={styles.body}>
						<div className={styles.change}>
							<span className={styles.label}>Lifecycle change</span>
							<OrganizationStatusBadge status={organization.status} />
							<HugeiconsIcon
								icon={ArrowRight01Icon}
								size={16}
								color="currentColor"
								aria-hidden="true"
							/>
							<span className={styles.srOnly}>to</span>
							<OrganizationStatusBadge status={active.next} />
						</div>
						{error ? (
							<p role="alert" className={`error-message ${styles.alert}`}>
								{error}
							</p>
						) : null}
					</div>
				</Dialog>
			) : null}
		</>
	);
}
