import { ArrowRight01Icon, RefreshIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/shared/button';
import type { OrganizationStatus } from '@/lib/contracts/organizations';
import styles from './organization-list-controls.module.css';

type StatusFilter = { readonly value: OrganizationStatus | undefined; readonly label: string };

const filters: readonly StatusFilter[] = [
	{ value: undefined, label: 'All' },
	{ value: 'PENDING', label: 'Pending' },
	{ value: 'ACTIVE', label: 'Active' },
	{ value: 'SUSPENDED', label: 'Suspended' },
	{ value: 'ARCHIVED', label: 'Archived' },
];

/** aria-disabled keeps the pressed toggle focusable while the filtered list loads. */
export function OrganizationStatusFilter({
	status,
	pending,
	onChange,
}: {
	readonly status: OrganizationStatus | undefined;
	readonly pending: boolean;
	readonly onChange: (status: OrganizationStatus | undefined) => void;
}) {
	return (
		<div className={styles.filter} role="group" aria-label="Filter by lifecycle status">
			{filters.map((filter) => {
				const selected = filter.value === status;
				return (
					<button
						key={filter.label}
						type="button"
						className={styles.chip}
						aria-pressed={selected}
						aria-disabled={pending || undefined}
						onClick={() => {
							if (!selected && !pending) onChange(filter.value);
						}}
					>
						{selected ? (
							<HugeiconsIcon icon={Tick02Icon} size={16} color="currentColor" aria-hidden="true" />
						) : null}
						{filter.label}
					</button>
				);
			})}
		</div>
	);
}

/** Cursor paging only: no page numbers are invented and nothing beyond one result set is read. */
export function OrganizationPagination({
	cursor,
	nextCursor,
	pending,
	onRestart,
	onNext,
}: {
	readonly cursor: string | undefined;
	readonly nextCursor: string | null;
	readonly pending: boolean;
	readonly onRestart: () => void;
	readonly onNext: (cursor: string) => void;
}) {
	if (!cursor && !nextCursor) return null;
	return (
		<nav className={styles.pagination} aria-label="Organization results">
			<Button
				icon={RefreshIcon}
				variant="secondary"
				pending={pending}
				disabled={!cursor}
				onClick={onRestart}
			>
				Restart list
			</Button>
			<Button
				icon={ArrowRight01Icon}
				pending={pending}
				disabled={!nextCursor}
				onClick={() => {
					if (nextCursor) onNext(nextCursor);
				}}
			>
				Next results
			</Button>
		</nav>
	);
}
