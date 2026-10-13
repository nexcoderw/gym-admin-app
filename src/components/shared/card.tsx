import type { HTMLAttributes } from 'react';

import styles from './card.module.css';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={`${styles.card} ${className}`}>{children}</div>;
}
