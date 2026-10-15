import type { ReactNode } from 'react';
import { LockIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { BrandLogo } from '@/components/shared/brand-logo';
import styles from './auth-shell.module.css';

type AuthStep = 'sign-in' | 'verification';

const steps = [
	{ key: 'sign-in', title: 'Sign in', detail: 'Email address and password' },
	{ key: 'verification', title: 'Verify it’s you', detail: 'Authenticator, recovery or email code' },
	{ key: 'workspace', title: 'Open the platform', detail: 'Manage gyms and platform approvals' },
] as const;

/**
 * Standalone sign-in frame: a brand panel with the real sign-in progress on wide screens and the
 * form on a clean surface. Presentation only; each step still enforces its own server checks.
 */
export function AuthShell({
	step,
	label,
	children,
}: {
	readonly step: AuthStep;
	/** Accessible name for the form region, e.g. "Administrator sign-in". */
	readonly label: string;
	readonly children: ReactNode;
}) {
	const current = steps.findIndex((item) => item.key === step);
	return (
		<main id="main" tabIndex={-1} className={styles.page}>
			<div className={styles.brandPanel}>
				<BrandLogo subtitle="Platform administration" tone="inverse" />
				<div className={styles.pitch}>
					<p className={styles.statement}>The administration workspace for NEXCODE Gym.</p>
					<ol className={styles.steps} aria-label="Sign-in progress">
						{steps.map((item, index) => {
							const state = index < current ? 'done' : index === current ? 'current' : 'next';
							return (
								<li
									key={item.key}
									className={styles.step}
									data-state={state}
									aria-current={state === 'current' ? 'step' : undefined}
								>
									<span className={styles.marker} aria-hidden="true">
										{state === 'done' ? (
											<HugeiconsIcon icon={Tick02Icon} size={16} color="currentColor" />
										) : (
											index + 1
										)}
									</span>
									<span className={styles.stepText}>
										<span className={styles.stepTitle}>
											{item.title}
											{state === 'done' ? (
												<span className={styles.srOnly}> (completed)</span>
											) : null}
										</span>
										<span className={styles.stepDetail}>{item.detail}</span>
									</span>
								</li>
							);
						})}
					</ol>
				</div>
				<p className={styles.panelNote}>
					<HugeiconsIcon icon={LockIcon} size={16} color="currentColor" aria-hidden="true" />
					Private workspace. Authorized platform staff only.
				</p>
			</div>
			<div className={styles.content}>
				<div className={styles.compactBrand}>
					<BrandLogo subtitle="Platform administration" />
				</div>
				<section className={styles.formArea} data-step={step} aria-label={label}>
					{children}
				</section>
				<p className={styles.footer}>
					<HugeiconsIcon icon={LockIcon} size={14} color="currentColor" aria-hidden="true" />
					Private workspace. Authorized platform staff only.
				</p>
			</div>
		</main>
	);
}
