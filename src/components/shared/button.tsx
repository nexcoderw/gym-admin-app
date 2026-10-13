import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly pending?: boolean;
	readonly variant?: 'primary' | 'secondary';
	readonly children: ReactNode;
}

export function Button({
	pending = false,
	variant = 'primary',
	disabled,
	className = '',
	children,
	type = 'button',
	...props
}: ButtonProps) {
	return (
		<button
			{...props}
			type={type}
			disabled={disabled || pending}
			aria-busy={pending}
			data-variant={variant}
			className={`${styles.button} ${className}`}
		>
			{pending ? <span className={styles.spinner} aria-hidden="true" /> : null}
			{children}
		</button>
	);
}
