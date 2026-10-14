import type { Metadata } from 'next';

import { VerificationForm } from '@/components/auth/verification-form';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Card } from '@/components/shared/card';
import { requireAnonymousSession } from '@/lib/server/session';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Verify your sign-in' };

export default async function VerificationPage() {
	await requireAnonymousSession();
	return (
		<main id="main" tabIndex={-1} className={`${styles.page} ${styles.verification}`}>
			<header className={styles.brandHeader}>
				<BrandLogo />
			</header>
			<section className={styles.signIn} aria-label="Sign-in verification">
				<Card className={styles.panel}>
					<VerificationForm />
				</Card>
			</section>
			<p className={styles.footer}>Private workspace. Authorized platform staff only.</p>
		</main>
	);
}
