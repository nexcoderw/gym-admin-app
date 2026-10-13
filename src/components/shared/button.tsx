import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly pending?: boolean;
	readonly icon: IconSvgElement;
	readonly variant?: 'primary' | 'secondary';
	readonly width?: 'full' | 'medium' | 'small';
	readonly children: ReactNode;
}

export function Button({
	pending = false,
	icon,
	variant = 'primary',
	width = 'medium',
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
			data-width={width}
			className={`${styles.button} ${className}`}
		>
			<span className={styles.icon} aria-hidden="true">
				{pending ? (
					<span className={styles.spinner} data-loading-indicator />
				) : (
					<HugeiconsIcon icon={icon} size={18} color="currentColor" />
				)}
			</span>
			<span className={styles.label}>{children}</span>
		</button>
	);
}
