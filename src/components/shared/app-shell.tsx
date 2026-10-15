import type { ReactNode } from 'react';
import { SecurityCheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Avatar } from './avatar';
import { BrandLogo } from './brand-logo';
import { Navbar } from './navbar';
import { ToastProvider } from './toast';
import { WorkspaceBreadcrumb } from './workspace-breadcrumb';
import styles from './app-shell.module.css';

/**
 * Authenticated workspace frame: the sidebar holds the brand and navigation, the topbar holds the
 * location and the signed-in account. The sidebar brand row and the topbar share one height token
 * so their dividing lines meet; page content uses the topbar's gutters so the edges align.
 */
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
				<aside className={styles.sidebar} aria-label="Platform workspace">
					<div className={styles.brand}>
						<BrandLogo subtitle="Platform administration" />
					</div>
					<div className={styles.navigation}>
						<Navbar permissions={permissions} />
					</div>
					<div className={styles.workspace}>
						<span className={styles.workspaceIcon} aria-hidden="true">
							<HugeiconsIcon icon={SecurityCheckIcon} size={18} color="currentColor" />
						</span>
						<div className={styles.workspaceText}>
							<p className={styles.workspaceName}>Administration workspace</p>
							<p className={styles.workspaceNote}>Platform staff only</p>
						</div>
					</div>
				</aside>
				<header className={styles.topbar}>
					<div className={styles.location}>
						<WorkspaceBreadcrumb />
					</div>
					<div className={styles.account}>
						<span className={styles.avatar}>
							<Avatar name={displayName} tone="solid" />
						</span>
						<div className={styles.identity}>
							<p className={styles.name}>{displayName}</p>
							<p className={styles.role}>Platform staff</p>
						</div>
						<div className={styles.signOut}>
							<LogoutButton />
						</div>
					</div>
				</header>
				<main id="main" tabIndex={-1} className={styles.main}>
					{children}
				</main>
			</div>
		</ToastProvider>
	);
}
