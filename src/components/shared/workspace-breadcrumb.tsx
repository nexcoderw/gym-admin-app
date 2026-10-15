'use client';

import { usePathname } from 'next/navigation';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { currentDestination } from '@/constants/navigation';
import styles from './workspace-breadcrumb.module.css';

/** Shows where the operator is; the label comes from the navigation registry and grants nothing. */
export function WorkspaceBreadcrumb() {
	const pathname = usePathname();
	const current = currentDestination(pathname);
	return (
		<nav aria-label="Breadcrumb" className={styles.breadcrumb}>
			<ol className={styles.list}>
				<li className={styles.root}>NEXCODE Gym</li>
				{current ? (
					<li className={styles.item}>
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={14}
							color="currentColor"
							aria-hidden="true"
						/>
						<span aria-current="page" className={styles.current}>
							{current.label}
						</span>
					</li>
				) : null}
			</ol>
		</nav>
	);
}
