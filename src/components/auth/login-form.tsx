'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
	LockPasswordIcon,
	Mail01Icon,
	SecurityCheckIcon,
	ShieldKeyIcon,
	ViewIcon,
	ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { browserApi, routes } from '@/constants/routes';
import { challengeSchema } from '@/lib/contracts/auth';
import { post } from '@/lib/client/mutations';
import { useAuthChallenge } from './auth-challenge-provider';
import styles from './login-form.module.css';

export function LoginForm() {
	const router = useRouter();
	const { beginVerification, clearChallenge } = useAuthChallenge();
	const mounted = useRef(false);
	const inFlight = useRef(false);
	useEffect(() => {
		mounted.current = true;
		clearChallenge();
		return () => {
			mounted.current = false;
		};
	}, [clearChallenge]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [passwordVisible, setPasswordVisible] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (inFlight.current) return;
		inFlight.current = true;
		const form = event.currentTarget;
		const data = new FormData(form);
		setPasswordVisible(false);
		setPending(true);
		setError('');
		try {
			const challenge = await post(
				browserApi.login,
				{ email: data.get('email'), password: data.get('password') },
				challengeSchema,
			);
			if (!mounted.current) return;
			beginVerification(challenge);
			router.push(routes.verification);
		} catch (failure) {
			if (mounted.current) {
				setError(failure instanceof Error ? failure.message : 'Sign-in could not be completed.');
				inFlight.current = false;
				setPending(false);
			}
		} finally {
			const password = form.elements.namedItem('password');
			if (password instanceof HTMLInputElement) password.value = '';
		}
	}

	return (
		<form
			method="post"
			action={browserApi.login}
			className={styles.form}
			onSubmit={submit}
			aria-busy={pending}
		>
			<div className={styles.heading}>
				<p className={styles.eyebrow}>Step 1 of 2</p>
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
				type={passwordVisible ? 'text' : 'password'}
				autoComplete="current-password"
				minLength={12}
				maxLength={1024}
				required
				disabled={pending}
				trailingAction={
					<button
						type="button"
						className={styles.revealButton}
						aria-label={passwordVisible ? 'Hide password' : 'Show password'}
						aria-controls="password"
						aria-pressed={passwordVisible}
						disabled={pending}
						onClick={() => setPasswordVisible((visible) => !visible)}
					>
						<HugeiconsIcon
							icon={passwordVisible ? ViewOffSlashIcon : ViewIcon}
							size={18}
							color="currentColor"
							aria-hidden="true"
						/>
					</button>
				}
			/>
			{error ? (
				<p role="alert" className="error-message">
					{error}
				</p>
			) : null}
			<Button type="submit" icon={ShieldKeyIcon} width="full" pending={pending}>
				Continue to verification
			</Button>
			<p className={styles.note}>
				<HugeiconsIcon icon={SecurityCheckIcon} size={16} color="currentColor" aria-hidden="true" />
				Next, verify your identity using one of your available sign-in methods.
			</p>
		</form>
	);
}
