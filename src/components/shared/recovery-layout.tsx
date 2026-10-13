import type { ReactNode } from 'react';

import styles from './recovery-layout.module.css';

/** Standalone recovery canvas: never includes account navigation or workspace chrome. */
export function RecoveryLayout({ children }: { readonly children: ReactNode }) {
	return (
		<main id="main" tabIndex={-1} className={styles.layout}>
			{children}
		</main>
	);
}
