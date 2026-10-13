import Link from 'next/link';

import { routes } from '@/constants/routes';
import styles from './state.module.css';

export default function NotFound() {
	return <main id="main" tabIndex={-1} className={styles.state}><h1>Page not found</h1><p>This address is not part of the administration workspace.</p><Link href={routes.dashboard}>Return to the platform</Link></main>;
}
