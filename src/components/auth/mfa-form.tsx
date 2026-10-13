'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft01Icon, Key01Icon, ShieldKeyIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { browserApi } from '@/constants/routes';
import { verifiedSchema, type MfaChallenge } from '@/lib/contracts/auth';
import { post } from '@/lib/client/mutations';
import { readLiveSession } from '@/lib/client/session';
import styles from './mfa-form.module.css';

export function MfaForm({
	challenge,
	onRestart,
	onAuthenticated,
}: {
	challenge: MfaChallenge;
	onRestart: () => void;
	onAuthenticated: () => void;
}) {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		heading.current?.focus();
	}, []);
	const [method, setMethod] = useState<'totp' | 'recovery_code'>(
		challenge.methods.includes('totp') ? 'totp' : 'recovery_code',
	);
	const [pending, setPending] = useState(false);
	const [sessionEstablished, setSessionEstablished] = useState(false);
	const [error, setError] = useState('');
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		const form = event.currentTarget;
		const code = new FormData(form).get('code');
		setPending(true);
		setError('');
		try {
			if (!sessionEstablished) {
				if (Date.parse(challenge.expiresAt) <= Date.now())
					throw new Error('Verification expired. Start sign-in again.');
				await post(
					browserApi.verifyMfa,
					{
						challengeToken: challenge.challengeToken,
						method,
						...(method === 'totp' ? { totpCode: code } : { recoveryCode: code }),
					},
					verifiedSchema,
					challenge.csrfToken,
				);
				setSessionEstablished(true);
			}
			await readLiveSession();
			onAuthenticated();
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'Verification failed. Try again.');
		} finally {
			form.reset();
			setPending(false);
		}
	}
	return (
		<form
			method="post"
			action={browserApi.verifyMfa}
			onSubmit={submit}
			className={styles.form}
			aria-busy={pending}
		>
			<div>
				<h1 ref={heading} tabIndex={-1}>
					Verify it’s you
				</h1>
				<p className={styles.help}>Complete this one-time check to open your platform.</p>
			</div>
			<fieldset disabled={pending || sessionEstablished} className={styles.methods}>
				<legend>Verification method</legend>
				{challenge.methods.map((value) => (
					<label key={value}>
						<input
							type="radio"
							name="method"
							value={value}
							checked={method === value}
							onChange={() => setMethod(value)}
						/>
						{value === 'totp' ? 'Authenticator' : 'Recovery code'}
					</label>
				))}
			</fieldset>
			<Input
				key={method}
				id="verification-code"
				name="code"
				label={method === 'totp' ? 'Six-digit code' : 'Recovery code'}
				icon={method === 'totp' ? ShieldKeyIcon : Key01Icon}
				placeholder={method === 'totp' ? '000000' : 'Enter a recovery code'}
				autoComplete={method === 'totp' ? 'one-time-code' : 'off'}
				inputMode={method === 'totp' ? 'numeric' : 'text'}
				pattern={method === 'totp' ? '[0-9]{6}' : undefined}
				minLength={method === 'totp' ? 6 : 12}
				maxLength={method === 'totp' ? 6 : 128}
				required
				disabled={pending || sessionEstablished}
			/>
			{error ? (
				<p role="alert" className="error-message">
					{error}
				</p>
			) : null}
			<Button type="submit" icon={ShieldKeyIcon} width="full" pending={pending}>
				Open platform
			</Button>
			<Button
				variant="secondary"
				icon={ArrowLeft01Icon}
				width="full"
				onClick={onRestart}
				disabled={pending}
			>
				Start sign-in again
			</Button>
		</form>
	);
}
