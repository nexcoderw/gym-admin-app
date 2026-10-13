import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/login-form';
import { Card } from '@/components/shared/card';
import { BrandLogo } from '@/components/shared/brand-logo';
import { requireAnonymousSession } from '@/lib/server/session';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
	await requireAnonymousSession();
	return (
		<main id="main" tabIndex={-1} className={styles.page}>
			<header className={styles.brandHeader}>
				<BrandLogo />
			</header>
			<section className={styles.signIn} aria-label="Administrator sign-in">
				<Card className={styles.panel}>
					<LoginForm />
				</Card>
			</section>
			<p className={styles.footer}>Private workspace. Authorized platform staff only.</p>
		</main>
	);
}
