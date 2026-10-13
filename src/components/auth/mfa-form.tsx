'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DashboardSquare01Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { browserApi } from '@/constants/routes';
import { verifiedSchema, type MfaChallenge } from '@/lib/contracts/auth';
import { post } from '@/lib/client/mutations';
import styles from './mfa-form.module.css';

export function MfaForm({ challenge, onRestart, onAuthenticated }: { challenge: MfaChallenge; onRestart: () => void; onAuthenticated: () => void }) {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => { heading.current?.focus(); }, []);
	const [method, setMethod] = useState<'totp' | 'recovery_code'>(challenge.methods.includes('totp') ? 'totp' : 'recovery_code');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		const form = event.currentTarget;
		const code = new FormData(form).get('code');
		setPending(true);
		setError('');
		try {
			if (Date.parse(challenge.expiresAt) <= Date.now()) throw new Error('Verification expired. Start sign-in again.');
			await post(browserApi.verifyMfa, { challengeToken: challenge.challengeToken, method, ...(method === 'totp' ? { totpCode: code } : { recoveryCode: code }) }, verifiedSchema, challenge.csrfToken);
			onAuthenticated();
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'Verification failed. Try again.');
		} finally {
			form.reset();
			setPending(false);
		}
	}
	return <form method="post" action={browserApi.verifyMfa} onSubmit={submit} className={styles.form} aria-busy={pending}>
		<div><h2 ref={heading} tabIndex={-1}>Verify it’s you</h2><p className={styles.help}>Complete this one-time check to open your platform.</p></div>
		<fieldset disabled={pending} className={styles.methods}><legend>Verification method</legend>
			{challenge.methods.map((value) => <label key={value}><input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} />{value === 'totp' ? 'Authenticator' : 'Recovery code'}</label>)}
		</fieldset>
		<Input key={method} id="verification-code" name="code" label={method === 'totp' ? 'Six-digit code' : 'Recovery code'} autoComplete={method === 'totp' ? 'one-time-code' : 'off'} inputMode={method === 'totp' ? 'numeric' : 'text'} pattern={method === 'totp' ? '[0-9]{6}' : undefined} minLength={method === 'totp' ? 6 : 12} maxLength={method === 'totp' ? 6 : 128} required disabled={pending} />
		{error ? <p role="alert" className="error-message">{error}</p> : null}
		<Button type="submit" pending={pending}>{pending ? null : <HugeiconsIcon icon={DashboardSquare01Icon} size={18} color="currentColor" aria-hidden="true" />}{pending ? 'Verifying…' : 'Open platform'}</Button>
		<Button variant="secondary" onClick={onRestart} disabled={pending}>Start sign-in again</Button>
	</form>;
}
