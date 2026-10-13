import type { InputHTMLAttributes } from 'react';

import styles from './input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	readonly id: string;
	readonly label: string;
	readonly hint?: string;
	readonly error?: string;
}

export function Input({ id, label, hint, error, className = '', ...props }: InputProps) {
	const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '', props['aria-describedby'] ?? ''].filter(Boolean).join(' ') || undefined;
	return <div className={styles.field}>
		<label htmlFor={id}>{label}</label>
		<input {...props} id={id} aria-describedby={describedBy} aria-invalid={error ? true : props['aria-invalid']} className={`${styles.input} ${className}`} />
		{hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
		{error ? <p className="error-message" id={`${id}-error`}>{error}</p> : null}
	</div>;
}
