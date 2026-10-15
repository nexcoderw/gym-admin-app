import Image from 'next/image';

import styles from './brand-logo.module.css';

/** The N monogram is decorative alongside the accessible Albert Sans wordmark. */
export function BrandLogo({
	subtitle = 'Gym platform',
	tone = 'default',
}: {
	readonly subtitle?: string;
	/** `inverse` is for placement on the solid primary surface. */
	readonly tone?: 'default' | 'inverse';
}) {
	return (
		<div className={styles.logo} data-tone={tone}>
			<Image
				src="/nexcode-mark.svg"
				alt=""
				aria-hidden="true"
				width={40}
				height={40}
				className={styles.mark}
			/>
			<div className={styles.wordmark}>
				<span className={styles.name}>NEXCODE</span>
				<span className={styles.subtitle}>{subtitle}</span>
			</div>
		</div>
	);
}
