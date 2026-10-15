import type { ButtonHTMLAttributes } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import styles from './icon-button.module.css';

interface IconButtonProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> {
	readonly icon: IconSvgElement;
	/** Required accessible name, also exposed as the native tooltip for pointer users. */
	readonly label: string;
	readonly variant?: 'ghost' | 'outline';
}

/** Icon-only actions keep a 44px target and a mandatory name; text actions use Button. */
export function IconButton({
	icon,
	label,
	variant = 'ghost',
	className = '',
	type = 'button',
	...props
}: IconButtonProps) {
	return (
		<button
			{...props}
			type={type}
			aria-label={label}
			title={label}
			data-variant={variant}
			className={`${styles.button} ${className}`}
		>
			<HugeiconsIcon icon={icon} size={18} color="currentColor" aria-hidden="true" />
		</button>
	);
}
