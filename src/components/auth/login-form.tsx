'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight01Icon, LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { browserApi, routes } from '@/constants/routes';
import { challengeSchema, type MfaChallenge } from '@/lib/contracts/auth';
import { post } from '@/lib/client/mutations';
import { MfaForm } from './mfa-form';
import styles from './login-form.module.css';

export function LoginForm() {
	const router = useRouter();
	const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		const form = event.currentTarget;
		const data = new FormData(form);
		setPending(true);
		setError('');
		try {
			setChallenge(
				await post(
					browserApi.login,
					{ email: data.get('email'), password: data.get('password') },
					challengeSchema,
				),
			);
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'Sign-in could not be completed.');
		} finally {
			const password = form.elements.namedItem('password');
			if (password instanceof HTMLInputElement) password.value = '';
			setPending(false);
		}
	}

	if (challenge)
		return (
			<MfaForm
				challenge={challenge}
				onRestart={() => {
					setChallenge(null);
					setError('');
				}}
				onAuthenticated={() => {
					setChallenge(null);
					router.replace(routes.dashboard);
					router.refresh();
				}}
			/>
		);
	return (
		<form
			method="post"
			action={browserApi.login}
			className={styles.form}
			onSubmit={submit}
			aria-busy={pending}
		>
			<div className={styles.heading}>
				<h1>Welcome back</h1>
				<p>Sign in to your NEXCODE administrator account.</p>
			</div>
			<Input
				id="email"
				name="email"
				label="Email address"
				icon={Mail01Icon}
				placeholder="name@example.com"
				type="email"
				autoComplete="username"
				maxLength={254}
				required
				disabled={pending}
			/>
			<Input
				id="password"
				name="password"
				label="Password"
				icon={LockPasswordIcon}
				placeholder="Enter your password"
				type="password"
				autoComplete="current-password"
				minLength={12}
				maxLength={1024}
				required
				disabled={pending}
			/>
			{error ? (
				<p role="alert" className="error-message">
					{error}
				</p>
			) : null}
			<Button type="submit" icon={ArrowRight01Icon} width="full" pending={pending}>
				Continue to verification
			</Button>
			<p className={styles.note}>
				Your authenticator or a recovery code is required in the next step.
			</p>
		</form>
	);
}
