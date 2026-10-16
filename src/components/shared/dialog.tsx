'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

import { IconButton } from './icon-button';
import styles from './dialog.module.css';

/**
 * Mounting opens the modal and unmounting closes it. Native showModal() supplies the inert
 * background and focus containment; this component adds a labelled structure, guarded dismissal
 * and focus restoration. Mark the preferred first control with `data-autofocus`.
 */
export function Dialog({
	title,
	description,
	size = 'medium',
	dismissible = true,
	returnFocus,
	onClose,
	footer,
	children,
}: {
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly size?: 'small' | 'medium' | 'large';
	/** False while a request is pending, so Escape, backdrop and close cannot abandon it. */
	readonly dismissible?: boolean;
	/** Explicit trigger: Safari does not focus buttons on click, so activeElement is unreliable. */
	readonly returnFocus?: HTMLElement | null;
	readonly onClose: () => void;
	readonly footer?: ReactNode;
	readonly children?: ReactNode;
}) {
	const id = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const pressStartedOnBackdrop = useRef(false);
	const [restoreTarget] = useState(() => returnFocus ?? null);

	useEffect(() => {
		const element = dialog.current;
		if (!element) return;
		const previous =
			restoreTarget ??
			(document.activeElement instanceof HTMLElement ? document.activeElement : null);
		if (!element.open) element.showModal();
		element.querySelector<HTMLElement>('[data-autofocus]')?.focus();
		return () => {
			// Unmounting removes the element from the top layer; only a still-attached dialog
			// (a development effect re-run) needs closing before it can be shown again.
			if (element.open && element.isConnected) element.close();
			if (previous?.isConnected) previous.focus();
		};
	}, [restoreTarget]);

	return (
		<dialog
			ref={dialog}
			className={styles.dialog}
			data-size={size}
			aria-labelledby={`${id}-title`}
			aria-describedby={description ? `${id}-description` : undefined}
			onCancel={(event) => {
				event.preventDefault();
				if (dismissible) onClose();
			}}
			onClose={(event) => {
				// Browsers may force-close after repeated Escape. A stale event after reopening is ignored,
				// and a pending request keeps its dialog rather than losing its outcome.
				const element = event.currentTarget;
				if (element.open) return;
				if (dismissible) onClose();
				else element.showModal();
			}}
			onPointerDown={(event) => {
				pressStartedOnBackdrop.current = event.target === event.currentTarget;
			}}
			onClick={(event) => {
				const onBackdrop = pressStartedOnBackdrop.current && event.target === event.currentTarget;
				pressStartedOnBackdrop.current = false;
				if (onBackdrop && dismissible) onClose();
			}}
		>
			<div className={styles.surface}>
				<div className={styles.header}>
					<div className={styles.heading}>
						<h2 id={`${id}-title`} className={styles.title}>
							{title}
						</h2>
						{description ? (
							<p id={`${id}-description`} className={styles.description}>
								{description}
							</p>
						) : null}
					</div>
					<IconButton icon={Cancel01Icon} label="Close" onClick={onClose} disabled={!dismissible} />
				</div>
				<div className={styles.body}>{children}</div>
				{footer ? <div className={styles.footer}>{footer}</div> : null}
			</div>
		</dialog>
	);
}
