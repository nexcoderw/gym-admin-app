import type { ReactNode } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Navbar } from './navbar';
import styles from './app-shell.module.css';

export function AppShell({ children, permissions, displayName }: { children: ReactNode; permissions: readonly string[]; displayName: string }) {
	return <div className={styles.shell}>
		<aside className={styles.sidebar} aria-label="Platform workspace">
			<div className={styles.brand}>NEXCODE<span>Platform administration</span></div>
			<Navbar permissions={permissions} />
			<div className={styles.account}><p className={styles.name}>{displayName}</p><p className={styles.label}>Platform staff</p><LogoutButton /></div>
		</aside>
		<div className={styles.content}><div className={styles.topbar}>NEXCODE Gym <span>Administration workspace</span></div><main id="main" tabIndex={-1} className={styles.main}>{children}</main></div>
	</div>;
}
