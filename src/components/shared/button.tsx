import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly ref?: Ref<HTMLButtonElement>;
	readonly pending?: boolean;
	readonly icon: IconSvgElement;
	readonly variant?: 'primary' | 'secondary';
	readonly size?: 'md' | 'sm';
	readonly width?: 'full' | 'medium' | 'small' | 'auto';
	readonly children: ReactNode;
}

export function Button({
	pending = false,
	icon,
	variant = 'primary',
	size = 'md',
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
			data-size={size}
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
