import { BrandLogo } from './brand-logo';
import { Navbar } from './navbar';
import styles from './sidebar.module.css';

/** Workspace sidebar: brand and permitted destinations. The account lives in the topbar. */
export function Sidebar({
	permissions,
	className = '',
}: {
	readonly permissions: readonly string[];
	/** Lets the shell place the sidebar in its grid without reaching into this markup. */
	readonly className?: string;
}) {
	return (
		<aside className={`${styles.sidebar} ${className}`} aria-label="Platform workspace">
			<div className={styles.brand}>
				<BrandLogo subtitle="Platform administration" />
			</div>
			<Navbar permissions={permissions} />
		</aside>
	);
}
