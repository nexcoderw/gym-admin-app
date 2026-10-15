'use client';

import { useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';

import { isCurrentDestination, visibleNavigation } from '@/constants/navigation';
import styles from './navbar.module.css';

/** One registry renders both layouts; CSS switches between the compact row and the sidebar list. */
export function Navbar({ permissions }: { permissions: readonly string[] }) {
	const id = useId();
	const pathname = usePathname();
	const items = visibleNavigation(permissions);
	const groups = [...new Set(items.map((item) => item.group))];
	return (
		<nav aria-label="Platform navigation" className={styles.nav}>
			{groups.map((group) => (
				<div key={group} className={styles.group}>
					<p id={`${id}-${group}`} className={styles.groupLabel}>
						{group}
					</p>
					<ul className={styles.list} role="list" aria-labelledby={`${id}-${group}`}>
						{items
							.filter((item) => item.group === group)
							.map((item) => (
								<li key={item.key}>
									<Link
										href={item.href}
										prefetch={false}
										aria-current={isCurrentDestination(pathname, item.href) ? 'page' : undefined}
										className={styles.link}
									>
										<span className={styles.icon} aria-hidden="true">
											<HugeiconsIcon icon={item.icon} size={20} color="currentColor" />
										</span>
										<span className={styles.label}>{item.label}</span>
									</Link>
								</li>
							))}
					</ul>
				</div>
			))}
		</nav>
	);
}
