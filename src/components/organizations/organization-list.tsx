'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Add01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatePanel } from '@/components/shared/state-panel';
import { useToast } from '@/components/shared/toast';
import { routes } from '@/constants/routes';
import {
	organizationPermissions,
	organizationTrailLimit,
	type Organization,
	type OrganizationListQuery,
	type OrganizationListResponse,
	type OrganizationStatus,
} from '@/lib/contracts/organizations';
import { OrganizationCard } from './organization-card';
import { OrganizationDetails } from './organization-details';
import { OrganizationForm } from './organization-form';
import type { LifecycleAction } from './organization-lifecycle-actions';
import { OrganizationSearch } from './organization-search';
import { OrganizationStatusFilter } from './organization-status-filter';
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
	archival: (name) => `${name} has been archived and retained for audit history.`,
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
	const [term, setTerm] = useState('');
	const canCreate = permissions.includes(organizationPermissions.create);
	const canUpdate = permissions.includes(organizationPermissions.update);
	const count = data.items.length;
	const trail = query.trail ?? [];
	const page = query.cursor ? trail.length + 2 : 1;
	// Moving forward appends the current cursor; stop where the URL trail reaches its cap.
	const nextTrailLength = query.cursor ? trail.length + 1 : 0;
	const canGoNext = data.nextCursor !== null && nextTrailLength <= organizationTrailLimit;
	const noun = count === 1 ? 'gym' : 'gyms';
	// Matches only the records loaded in this view; the list API has no server-side search.
	const needle = term.trim().toLocaleLowerCase('en');
	const visible = needle
		? data.items.filter(
				(item) =>
					item.name.toLocaleLowerCase('en').includes(needle) || item.slug.includes(needle),
			)
		: data.items;
	const scope = query.status ? `${query.status.toLowerCase()} ` : '';
	const more = data.nextCursor ? ' · more results available' : '';
	const summary = needle
		? `${visible.length} of ${count} ${noun} in this view match “${term.trim()}”`
		: `${count} ${scope}${noun} in this view${more}`;
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
	function navigate(
		status: OrganizationStatus | undefined,
		cursor?: string,
		pageTrail: readonly string[] = [],
	) {
		if (refreshing) return;
		const params = new URLSearchParams({ limit: String(query.limit) });
		if (status) params.set('status', status);
		if (cursor) params.set('cursor', cursor);
		if (cursor && pageTrail.length > 0) params.set('trail', pageTrail.join(','));
		startRefresh(() => {
			router.replace(`${routes.organizations}?${params.toString()}`);
		});
	}
	/** Page 1 has no cursor; page k > 1 was reached with trail[k - 2], or nextCursor for the next. */
	function goToPage(target: number) {
		if (target === 1) navigate(query.status);
		else if (target === page + 1 && canGoNext && data.nextCursor) {
			navigate(query.status, data.nextCursor, query.cursor ? [...trail, query.cursor] : []);
		} else {
			const cursor = trail[target - 2];
			if (cursor) navigate(query.status, cursor, trail.slice(0, target - 2));
		}
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
					<p className={styles.summary} role="status">
						{refreshing ? 'Loading current organizations…' : summary}
					</p>
					<div className={styles.tools}>
						<OrganizationSearch term={term} onTermChange={setTerm} />
						<OrganizationStatusFilter
							status={query.status}
							pending={refreshing}
							onChange={(status) => navigate(status)}
						/>
					</div>
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
									? 'Choose another status or go back to page 1 to see current records.'
									: canCreate
										? 'Register a gym to add a pending organization to the platform registry.'
										: 'An authorized platform operator can register the first gym.'
							}
						/>
					</div>
				) : visible.length === 0 ? (
					<div className={styles.empty}>
						<StatePanel
							kind="empty"
							layout="compact"
							headingLevel={2}
							title={`No gyms in this view match “${term.trim()}”`}
							description={
								data.nextCursor
									? 'Search checks only the gyms on this page, by name or slug. Try another term, or clear the search and open the next page.'
									: 'Search checks the gyms on this page, by name or slug. Try another term or clear the search.'
							}
						>
							<Button icon={Cancel01Icon} variant="secondary" onClick={() => setTerm('')}>
								Clear search
							</Button>
						</StatePanel>
					</div>
				) : (
					<ul className={styles.grid} role="list">
						{visible.map((organization) => (
							<li key={organization.id} className={styles.item}>
								<OrganizationCard
									organization={organization}
									canUpdate={canUpdate && organization.status !== 'ARCHIVED'}
									onOpen={(trigger) => setDialog({ kind: 'details', organization, trigger })}
									onEdit={(trigger) => setDialog({ kind: 'edit', organization, trigger })}
								/>
							</li>
						))}
					</ul>
				)}
				<Pagination
					label="Organization pages"
					page={page}
					pageCount={canGoNext ? page + 1 : page}
					pageSize={query.limit}
					itemCount={count}
					pending={refreshing}
					onPageChange={goToPage}
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
