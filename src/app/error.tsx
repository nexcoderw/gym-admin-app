'use client';

import { RefreshIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import styles from './state.module.css';

export default function ErrorPage({ reset }: { reset: () => void }) {
	return (
		<main id="main" tabIndex={-1} className={styles.state}>
			<h1>Workspace unavailable</h1>
			<p>The request could not be completed. Try again or contact your platform operator.</p>
			<Button icon={RefreshIcon} onClick={reset}>
				Try again
			</Button>
		</main>
	);
}
