import { ArrowRight01Icon, RefreshIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import styles from './organization-list-controls.module.css';

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
