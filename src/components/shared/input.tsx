import type { InputHTMLAttributes, ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import styles from './input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	readonly id: string;
	readonly label: string;
	readonly icon: IconSvgElement;
	readonly hint?: string;
	readonly error?: string;
	readonly trailingAction?: ReactNode;
}

export function Input({
	id,
	label,
	icon,
	hint,
	error,
	trailingAction,
	className = '',
	...props
}: InputProps) {
	const describedBy =
		[hint ? `${id}-hint` : '', error ? `${id}-error` : '', props['aria-describedby'] ?? '']
			.filter(Boolean)
			.join(' ') || undefined;
	return (
		<div className={styles.field}>
			<label htmlFor={id}>{label}</label>
			<div className={styles.control} data-has-action={Boolean(trailingAction)}>
				<span className={styles.icon} aria-hidden="true">
					<HugeiconsIcon icon={icon} size={18} color="currentColor" />
				</span>
				<input
					{...props}
					id={id}
					aria-describedby={describedBy}
					aria-invalid={error ? true : props['aria-invalid']}
					className={`${styles.input} ${className}`}
				/>
				{trailingAction ? <span className={styles.action}>{trailingAction}</span> : null}
			</div>
			{hint ? (
				<p className={styles.hint} id={`${id}-hint`}>
					{hint}
				</p>
			) : null}
			{error ? (
				<p className="error-message" id={`${id}-error`}>
					{error}
				</p>
			) : null}
		</div>
	);
}
