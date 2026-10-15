'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Add01Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { PageHeader } from '@/components/shared/page-header';
import { StatePanel } from '@/components/shared/state-panel';
import { useToast } from '@/components/shared/toast';
import { routes } from '@/constants/routes';
import {
	organizationPermissions,
	type Organization,
	type OrganizationListQuery,
	type OrganizationListResponse,
	type OrganizationStatus,
} from '@/lib/contracts/organizations';
import { OrganizationCard } from './organization-card';
import { OrganizationDetails } from './organization-details';
import { OrganizationForm } from './organization-form';
import type { LifecycleAction } from './organization-lifecycle-actions';
import { OrganizationPagination, OrganizationStatusFilter } from './organization-list-controls';
import styles from './organization-list.module.css';

/** Dialogs keep the record snapshot the operator opened; a background refresh cannot alter it. */
type ActiveDialog =
	| { readonly kind: 'none' }
	| { readonly kind: 'create'; readonly trigger: HTMLElement }
	| { readonly kind: 'details'; readonly organization: Organization; readonly trigger: HTMLElement }
	| { readonly kind: 'edit'; readonly organization: Organization; readonly trigger: HTMLElement };

const lifecycleMessages: Record<LifecycleAction, (name: string) => string> = {
	activation: (name) => `${name} is now active.`,
	suspension: (name) => `${name} has been suspended.`,
};

export function OrganizationList({
	data,
	query,
	permissions,
}: {
	readonly data: OrganizationListResponse;
	readonly query: OrganizationListQuery;
	readonly permissions: readonly string[];
}) {
	const router = useRouter();
	const toast = useToast();
	const [refreshing, startRefresh] = useTransition();
	const [dialog, setDialog] = useState<ActiveDialog>({ kind: 'none' });
	const canCreate = permissions.includes(organizationPermissions.create);
	const canUpdate = permissions.includes(organizationPermissions.update);
	const count = data.items.length;
	const scope = query.status ? `${query.status.toLowerCase()} ` : '';
	const more = data.nextCursor ? ' · more results available' : '';
	const summary = `${count} ${scope}${count === 1 ? 'gym' : 'gyms'} in this view${more}`;
	function close() {
		setDialog({ kind: 'none' });
	}
	function refresh() {
		startRefresh(() => {
			router.refresh();
		});
	}
	function reload() {
		close();
		refresh();
	}
	/** Runs only after the BFF confirmed the change, then re-reads server-owned records. */
	function confirmed(message: string) {
		close();
		toast.success(message);
		refresh();
	}
	function navigate(status: OrganizationStatus | undefined, cursor?: string) {
		if (refreshing) return;
		const params = new URLSearchParams({ limit: String(query.limit) });
		if (status) params.set('status', status);
		if (cursor) params.set('cursor', cursor);
		startRefresh(() => {
			router.replace(`${routes.organizations}?${params.toString()}`);
		});
	}
	return (
		<>
			<PageHeader
				title="Organizations"
				description="Register gyms, review their registry records and manage platform lifecycle approvals."
				actions={
					canCreate ? (
						<Button
							icon={Add01Icon}
							aria-haspopup="dialog"
							onClick={(event) => setDialog({ kind: 'create', trigger: event.currentTarget })}
						>
							Register Gym
						</Button>
					) : null
				}
			/>
			<section className={styles.registry} aria-label="Organization registry" aria-busy={refreshing}>
				<div className={styles.toolbar}>
					<OrganizationStatusFilter
						status={query.status}
						pending={refreshing}
						onChange={(status) => navigate(status)}
					/>
					<p className={styles.summary} role="status">
						{refreshing ? 'Loading current organizations…' : summary}
					</p>
				</div>
				{count === 0 ? (
					<div className={styles.empty}>
						<StatePanel
							kind="empty"
							layout="compact"
							headingLevel={2}
							title={
								query.cursor
									? 'No more gyms in this result set'
									: query.status
										? 'No gyms with this status'
										: 'No gyms registered yet'
							}
							description={
								query.cursor || query.status
									? 'Choose another status or restart the list to see current records.'
									: canCreate
										? 'Register a gym to add a pending organization to the platform registry.'
										: 'An authorized platform operator can register the first gym.'
							}
						/>
					</div>
				) : (
					<ul className={styles.grid} role="list">
						{data.items.map((organization) => (
							<li key={organization.id} className={styles.item}>
								<OrganizationCard
									organization={organization}
									canUpdate={canUpdate}
									onOpen={(trigger) => setDialog({ kind: 'details', organization, trigger })}
									onEdit={(trigger) => setDialog({ kind: 'edit', organization, trigger })}
								/>
							</li>
						))}
					</ul>
				)}
				<OrganizationPagination
					cursor={query.cursor}
					nextCursor={data.nextCursor}
					pending={refreshing}
					onRestart={() => navigate(query.status)}
					onNext={(cursor) => navigate(query.status, cursor)}
				/>
			</section>
			{dialog.kind === 'create' ? (
				<OrganizationForm
					mode="create"
					returnFocus={dialog.trigger}
					onClose={close}
					onReload={reload}
					onSaved={(row) => confirmed(`${row.name} was registered as a pending gym.`)}
				/>
			) : null}
			{dialog.kind === 'edit' ? (
				<OrganizationForm
					mode="edit"
					organization={dialog.organization}
					returnFocus={dialog.trigger}
					onClose={close}
					onReload={reload}
					onSaved={(row) => confirmed(`Gym name saved as ${row.name}.`)}
				/>
			) : null}
			{dialog.kind === 'details' ? (
				<OrganizationDetails
					organization={dialog.organization}
					permissions={permissions}
					returnFocus={dialog.trigger}
					onClose={close}
					onReload={reload}
					onEdit={() =>
						setDialog({ kind: 'edit', organization: dialog.organization, trigger: dialog.trigger })
					}
					onLifecycleChange={(row, action) => confirmed(lifecycleMessages[action](row.name))}
				/>
			) : null}
		</>
	);
}
