import type { ReactNode } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Sidebar } from './sidebar';
import { ToastProvider } from './toast';
import { WorkspaceBreadcrumb } from './workspace-breadcrumb';
import styles from './app-shell.module.css';

/** Sidebar for brand and navigation; the topbar carries the signed-in account and Sign out. */
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
				<Sidebar permissions={permissions} className={styles.sidebar} />
				<header className={styles.topbar}>
					<div className={styles.location}>
						<WorkspaceBreadcrumb />
					</div>
					<div className={styles.account}>
						<div className={styles.identity}>
							<p className={styles.name}>{displayName}</p>
							<p className={styles.label}>Platform staff</p>
						</div>
						<LogoutButton />
					</div>
				</header>
				<main id="main" tabIndex={-1} className={styles.main}>
					{children}
				</main>
			</div>
		</ToastProvider>
	);
}
