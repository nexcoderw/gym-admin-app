import type { ReactNode } from 'react';

import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { ToastProvider } from './toast';
import styles from './app-shell.module.css';

/** Places the sidebar (brand and links), the navbar (location and account) and page content. */
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
				<Navbar displayName={displayName} className={styles.navbar} />
				<main id="main" tabIndex={-1} className={styles.main}>
					{children}
				</main>
			</div>
		</ToastProvider>
	);
}
