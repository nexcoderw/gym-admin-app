import { Card } from '@/components/shared/card';
import styles from './stat-card.module.css';

export function StatCard({ label, value, description }: { label: string; value: number; description: string }) {
	return <Card><p className={styles.label}>{label}</p><p className={styles.value}>{new Intl.NumberFormat('en-RW').format(value)}</p><p className={styles.description}>{description}</p></Card>;
}
