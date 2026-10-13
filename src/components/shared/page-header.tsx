import styles from './page-header.module.css';

export function PageHeader({ title, description }: { title: string; description: string }) {
	return <header className={styles.header}><h1>{title}</h1><p>{description}</p></header>;
}
