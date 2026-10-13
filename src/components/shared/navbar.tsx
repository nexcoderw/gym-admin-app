'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';

import { visibleNavigation } from '@/constants/navigation';
import styles from './navbar.module.css';

export function Navbar({ permissions }: { permissions: readonly string[] }) {
	const pathname = usePathname();
	return (
		<nav aria-label="Platform navigation" className={styles.nav}>
			{visibleNavigation(permissions).map((item) => (
				<Link
					key={item.key}
					href={item.href}
					prefetch={false}
					aria-current={pathname === item.href ? 'page' : undefined}
					className={styles.link}
				>
					<HugeiconsIcon icon={item.icon} size={20} color="currentColor" aria-hidden="true" />
					{item.label}
				</Link>
			))}
		</nav>
	);
}
