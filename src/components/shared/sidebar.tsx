'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';

import { isCurrentDestination, visibleNavigation } from '@/constants/navigation';
import { BrandLogo } from './brand-logo';
import styles from './sidebar.module.css';

/** Brand and permitted destinations. Link visibility is presentation; pages still authorize. */
export function Sidebar({
	permissions,
	className = '',
}: {
	readonly permissions: readonly string[];
	/** Lets the shell place the sidebar in its grid without reaching into this markup. */
	readonly className?: string;
}) {
	const pathname = usePathname();
	return (
		<aside className={`${styles.sidebar} ${className}`} aria-label="Platform workspace">
			<div className={styles.brand}>
				<BrandLogo subtitle="Platform administration" />
			</div>
			<nav aria-label="Platform navigation" className={styles.nav}>
				{visibleNavigation(permissions).map((item) => (
					<Link
						key={item.key}
						href={item.href}
						prefetch={false}
						aria-current={isCurrentDestination(pathname, item.href) ? 'page' : undefined}
						className={styles.link}
					>
						<HugeiconsIcon icon={item.icon} size={20} color="currentColor" aria-hidden="true" />
						{item.label}
					</Link>
				))}
			</nav>
		</aside>
	);
}
