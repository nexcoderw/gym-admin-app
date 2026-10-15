import type { ReactNode } from 'react';

import { Sidebar } from './sidebar';
import { ToastProvider } from './toast';
import styles from './app-shell.module.css';

export function AppShell({
	children,
	permissions,
	displayName,
}: {
	children: ReactNode;
	permissions: readonly string[];
	displayName: string;
}) {
	return (
		<ToastProvider>
			<div className={styles.shell}>
				<Sidebar permissions={permissions} displayName={displayName} />
				<div className={styles.content}>
					<div className={styles.topbar}>
						NEXCODE Gym <span>Administration workspace</span>
					</div>
					<main id="main" tabIndex={-1} className={styles.main}>
						{children}
					</main>
				</div>
			</div>
		</ToastProvider>
	);
}
