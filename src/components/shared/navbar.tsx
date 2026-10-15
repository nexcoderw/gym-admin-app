import { LogoutButton } from '@/components/auth/logout-button';
import { WorkspaceBreadcrumb } from './workspace-breadcrumb';
import styles from './navbar.module.css';

/** Top bar: where the operator is (breadcrumb) and who is signed in, with Sign out. */
export function Navbar({
	displayName,
	className = '',
}: {
	readonly displayName: string;
	/** Lets the shell place the navbar in its grid without reaching into this markup. */
	readonly className?: string;
}) {
	return (
		<header className={`${styles.navbar} ${className}`}>
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
	);
}
