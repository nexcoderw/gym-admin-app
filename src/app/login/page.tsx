import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/login-form';
import { Card } from '@/components/shared/card';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
	return (
		<main id="main" tabIndex={-1} className={styles.page}>
			<section className={styles.introduction} aria-labelledby="welcome-title">
				<p className={styles.brand}>
					NEXCODE <span>Platform</span>
				</p>
				<div>
					<h1 id="welcome-title">
						One platform.
						<br />A clear perspective.
					</h1>
					<p className={styles.description}>
						A private workspace for the people responsible for NEXCODE Gym.
					</p>
				</div>
				<p className={styles.boundary}>
					Platform administration only.
					<br />
					Gym management and member services live in their own workspaces.
				</p>
			</section>
			<section className={styles.signIn} aria-label="Administrator sign-in">
				<Card>
					<LoginForm />
				</Card>
				<p className={styles.footer}>Access is limited to authorized platform staff.</p>
			</section>
		</main>
	);
}
