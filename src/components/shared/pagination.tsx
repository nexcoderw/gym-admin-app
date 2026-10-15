'use client';

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import styles from './pagination.module.css';

type Slot = number | 'gap';

/** First, last, and the pages around the current one; a single skipped page is shown, not "…". */
function pageSlots(page: number, pageCount: number): readonly Slot[] {
	const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])]
		.filter((value) => value >= 1 && value <= pageCount)
		.sort((left, right) => left - right);
	const slots: Slot[] = [];
	for (const value of wanted) {
		const previous = slots.at(-1);
		if (typeof previous === 'number' && value - previous === 2) slots.push(previous + 1);
		else if (typeof previous === 'number' && value - previous > 2) slots.push('gap');
		slots.push(value);
	}
	return slots;
}

/**
 * Shared page navigation. `pageCount` is the highest page the caller can actually reach: the real
 * total for APIs that report one, or one past the current page for cursor APIs with more results.
 * Never pass an estimated count. Renders nothing when there is only one page.
 */
export function Pagination({
	label,
	page,
	pageCount,
	pageSize,
	itemCount,
	totalItems,
	pending = false,
	onPageChange,
}: {
	/** Accessible name, e.g. "Organization pages". */
	readonly label: string;
	readonly page: number;
	readonly pageCount: number;
	readonly pageSize: number;
	/** Items on the current page, used for the "Showing 21–40" range. */
	readonly itemCount: number;
	/** Only when the API reports a verified total. */
	readonly totalItems?: number;
	/** While loading, controls stay focusable but ignore presses. */
	readonly pending?: boolean;
	readonly onPageChange: (page: number) => void;
}) {
	if (pageCount <= 1) return null;
	const start = (page - 1) * pageSize + 1;
	const end = start + itemCount - 1;
	function go(target: number) {
		if (pending || target === page || target < 1 || target > pageCount) return;
		onPageChange(target);
	}
	return (
		<nav className={styles.pagination} aria-label={label} aria-busy={pending}>
			{itemCount > 0 ? (
				<p className={styles.range}>
					Showing{' '}
					<strong>
						{start}–{end}
					</strong>
					{totalItems === undefined ? null : <> of {totalItems}</>}
				</p>
			) : null}
			<ol className={styles.controls}>
				<li>
					<button
						type="button"
						className={styles.step}
						aria-label="Previous page"
						title="Previous page"
						disabled={page <= 1}
						onClick={() => go(page - 1)}
					>
						<HugeiconsIcon
							icon={ArrowLeft01Icon}
							size={18}
							color="currentColor"
							aria-hidden="true"
						/>
					</button>
				</li>
				{pageSlots(page, pageCount).map((slot, index) =>
					slot === 'gap' ? (
						<li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
							…
						</li>
					) : (
						<li key={slot} className={styles.slot} data-current={slot === page}>
							<button
								type="button"
								className={styles.page}
								aria-label={`Page ${slot}`}
								aria-current={slot === page ? 'page' : undefined}
								aria-disabled={pending || undefined}
								onClick={() => go(slot)}
							>
								{slot}
							</button>
						</li>
					),
				)}
				<li>
					<button
						type="button"
						className={styles.step}
						aria-label="Next page"
						title="Next page"
						disabled={page >= pageCount}
						onClick={() => go(page + 1)}
					>
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={18}
							color="currentColor"
							aria-hidden="true"
						/>
					</button>
				</li>
			</ol>
		</nav>
	);
}
