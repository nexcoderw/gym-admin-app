'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { FilterIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { IconButton } from '@/components/shared/icon-button';
import type { OrganizationStatus } from '@/lib/contracts/organizations';
import styles from './organization-status-filter.module.css';

type StatusFilter = { readonly value: OrganizationStatus | undefined; readonly label: string };

const filters: readonly StatusFilter[] = [
	{ value: undefined, label: 'All' },
	{ value: 'PENDING', label: 'Pending' },
	{ value: 'ACTIVE', label: 'Active' },
	{ value: 'SUSPENDED', label: 'Suspended' },
	{ value: 'ARCHIVED', label: 'Archived' },
];

/**
 * Filter icon that discloses the lifecycle statuses. Escape, an outside press or tabbing away
 * closes it; arrow keys move between options and focus returns to the icon after a choice.
 */
export function OrganizationStatusFilter({
	status,
	pending,
	onChange,
}: {
	readonly status: OrganizationStatus | undefined;
	readonly pending: boolean;
	readonly onChange: (status: OrganizationStatus | undefined) => void;
}) {
	const menuId = useId();
	const wrapper = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const currentLabel = filters.find((filter) => filter.value === status)?.label ?? 'All';
	useEffect(() => {
		if (!open) return;
		function closeOnOutsidePress(event: PointerEvent) {
			if (event.target instanceof Node && wrapper.current?.contains(event.target)) return;
			setOpen(false);
		}
		document.addEventListener('pointerdown', closeOnOutsidePress);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsidePress);
		};
	}, [open]);
	function close() {
		setOpen(false);
		trigger.current?.focus();
	}
	function choose(value: OrganizationStatus | undefined) {
		if (pending) return;
		close();
		if (value !== status) onChange(value);
	}
	function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
		if (!open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}
		const options = Array.from(
			event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-status-option]'),
		);
		// From the icon (index -1), ArrowDown enters at the first option and ArrowUp at the last.
		const index = options.findIndex((option) => option === document.activeElement);
		const last = options.length - 1;
		const moves: Record<string, number> = {
			ArrowDown: index >= last ? 0 : index + 1,
			ArrowUp: index <= 0 ? last : index - 1,
			Home: 0,
			End: last,
		};
		const next = moves[event.key];
		if (next === undefined) return;
		event.preventDefault();
		options[next]?.focus();
	}
	return (
		<div
			ref={wrapper}
			className={styles.filter}
			onKeyDown={handleKeys}
			onBlur={(event) => {
				const destination = event.relatedTarget;
				if (!(destination instanceof Node) || !event.currentTarget.contains(destination)) {
					setOpen(false);
				}
			}}
		>
			<IconButton
				ref={trigger}
				icon={FilterIcon}
				label={`Filter by status: ${currentLabel}`}
				variant="outline"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				onClick={() => setOpen((value) => !value)}
			/>
			{status ? <span className={styles.indicator} aria-hidden="true" /> : null}
			{open ? (
				<div
					id={menuId}
					className={styles.menu}
					role="group"
					aria-label="Filter by lifecycle status"
				>
					<p className={styles.heading} aria-hidden="true">
						Status
					</p>
					{filters.map((filter) => {
						const selected = filter.value === status;
						return (
							<button
								key={filter.label}
								type="button"
								className={styles.option}
								aria-pressed={selected}
								aria-disabled={pending || undefined}
								autoFocus={selected}
								data-status-option
								onClick={() => choose(filter.value)}
							>
								<span className={styles.check} aria-hidden="true">
									{selected ? (
										<HugeiconsIcon icon={Tick02Icon} size={16} color="currentColor" />
									) : null}
								</span>
								{filter.label}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
