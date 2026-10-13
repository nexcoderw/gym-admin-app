'use client';

import { useId, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/shared/button';
import { routes } from '@/constants/routes';
import { organizationStatusSchema, type OrganizationListQuery } from '@/lib/contracts/organizations';
import styles from './organization-list.module.css';

export function OrganizationListControls({ query, nextCursor }: { readonly query: OrganizationListQuery; readonly nextCursor: string | null }) {
	const router = useRouter();
	const filterId = useId();
	const [pending, startTransition] = useTransition();
	function navigate(status: string, cursor?: string) {
		if (pending) return;
		const params = new URLSearchParams({ limit: String(query.limit) });
		if (organizationStatusSchema.safeParse(status).success) params.set('status', status);
		if (cursor) params.set('cursor', cursor);
		startTransition(() => { router.replace(`${routes.organizations}?${params.toString()}`); });
	}
	return (
		<div className={styles.controls} aria-busy={pending}>
			<div className={styles.filter}>
				<label htmlFor={filterId}>Lifecycle status</label>
				<select id={filterId} value={query.status ?? ''} disabled={pending} onChange={(event) => navigate(event.target.value)}>
					<option value="">All statuses</option>
					<option value="PENDING">Pending</option>
					<option value="ACTIVE">Active</option>
					<option value="SUSPENDED">Suspended</option>
					<option value="ARCHIVED">Archived</option>
				</select>
			</div>
			<div className={styles.actions}>
				<Button icon={RefreshIcon} variant="secondary" pending={pending} disabled={!query.cursor} onClick={() => navigate(query.status ?? '')}>Restart list</Button>
				<Button icon={ArrowRight01Icon} pending={pending} disabled={!nextCursor} onClick={() => { if (nextCursor) navigate(query.status ?? '', nextCursor); }}>Next results</Button>
			</div>
			<span role="status">{pending ? 'Loading current organizations…' : 'Showing one cursor-based result set.'}</span>
		</div>
	);
}
