import { LogoutButton } from '@/components/auth/logout-button';
import { BrandLogo } from './brand-logo';
import { Navbar } from './navbar';
import styles from './sidebar.module.css';

/** Workspace sidebar: brand, permitted destinations and the signed-in account with Sign out. */
export function Sidebar({
	permissions,
	displayName,
}: {
	readonly permissions: readonly string[];
	readonly displayName: string;
}) {
	return (
		<aside className={styles.sidebar} aria-label="Platform workspace">
			<div className={styles.brand}>
				<BrandLogo subtitle="Platform administration" />
			</div>
			<Navbar permissions={permissions} />
			<div className={styles.account}>
				<p className={styles.name}>{displayName}</p>
				<p className={styles.label}>Platform staff</p>
				<LogoutButton />
			</div>
		</aside>
	);
}
