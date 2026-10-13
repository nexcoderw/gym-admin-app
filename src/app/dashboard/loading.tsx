import { Card } from '@/components/shared/card';
import { PageHeader } from '@/components/shared/page-header';
import styles from './loading.module.css';

export default function Loading() {
	return (
		<>
			<PageHeader
				title="Platform overview"
				description="Reading your authorized platform summary."
			/>
			<Card className={styles.placeholder}>
				<p role="status">Loading current platform records…</p>
			</Card>
		</>
	);
}
