import Link from 'next/link';
import type { ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import styles from './button.module.css';

/** Navigation uses native link semantics while sharing the Button's visual system. */
export function ButtonLink({
	href,
	icon,
	variant = 'primary',
	children,
}: {
	readonly href: string;
	readonly icon: IconSvgElement;
	readonly variant?: 'primary' | 'secondary';
	readonly children: ReactNode;
}) {
	return (
		<Link href={href} className={styles.button} data-variant={variant} data-width="medium">
			<span className={styles.icon} aria-hidden="true">
				<HugeiconsIcon icon={icon} size={18} color="currentColor" />
			</span>
			<span className={styles.label}>{children}</span>
		</Link>
	);
}
