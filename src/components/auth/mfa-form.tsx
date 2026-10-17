'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
	ArrowLeft01Icon,
	Key01Icon,
	Mail01Icon,
	ShieldKeyIcon,
	SmartPhone01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { browserApi } from '@/constants/routes';
import { emailOtpSentSchema, verifiedSchema, type MfaChallenge } from '@/lib/contracts/auth';
import { AuthRequestError, post } from '@/lib/client/mutations';
import { readLiveSession } from '@/lib/client/session';
import styles from './mfa-form.module.css';

const methodDetails = {
	totp: { label: 'Authenticator', icon: SmartPhone01Icon },
	recovery_code: { label: 'Recovery code', icon: Key01Icon },
	email_otp: { label: 'Email code', icon: Mail01Icon },
} as const;

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
	const [method, setMethod] = useState<'email_otp' | 'totp' | 'recovery_code'>(
		challenge.methods.includes('totp')
			? 'totp'
			: challenge.methods.includes('recovery_code')
				? 'recovery_code'
				: 'email_otp',
	);
	const [pending, setPending] = useState(false);
	const [sending, setSending] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [retryAt, setRetryAt] = useState(0);
	const inFlight = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	useEffect(() => {
		if (retryAt === 0) return;
		const timer = setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
		return () => clearTimeout(timer);
	}, [retryAt]);
	const [verificationOutcomeUnconfirmed, setVerificationOutcomeUnconfirmed] = useState(false);
	const [error, setError] = useState('');
	const busy = pending || sending;
	const numericCode = method !== 'recovery_code';
	async function sendEmail() {
		if (inFlight.current || retryAt !== 0 || verificationOutcomeUnconfirmed) return;
		inFlight.current = true;
		setSending(true);
		setError('');
		setEmailSent(false);
		try {
			if (Date.parse(challenge.expiresAt) <= Date.now())
				throw new Error('Verification expired. Start sign-in again.');
			setRetryAt(Date.now() + 60_000);
			const sent = await post(
				browserApi.sendEmailOtp,
				{ challengeToken: challenge.challengeToken },
				emailOtpSentSchema,
				challenge.csrfToken,
			);
			if (!mounted.current) return;
			setEmailSent(true);
			setRetryAt(Date.now() + sent.retryAfterSeconds * 1000);
		} catch (failure) {
			if (mounted.current)
				setError(
					failure instanceof Error ? failure.message : 'Email could not be sent. Try again.',
				);
		} finally {
			inFlight.current = false;
			if (mounted.current) setSending(false);
		}
	}
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (
			inFlight.current ||
			(method === 'email_otp' && !emailSent && !verificationOutcomeUnconfirmed)
		)
			return;
		inFlight.current = true;
		const form = event.currentTarget;
		const code = new FormData(form).get('code');
		setPending(true);
		setError('');
		let submittedVerification = false;
		try {
			if (verificationOutcomeUnconfirmed) {
				await readLiveSession();
				if (mounted.current) onAuthenticated();
				return;
			}
			if (Date.parse(challenge.expiresAt) <= Date.now())
				throw new Error('Verification expired. Start sign-in again.');
			submittedVerification = true;
			await post(
				browserApi.verifyMfa,
				{
					challengeToken: challenge.challengeToken,
					method,
					...(method === 'email_otp'
						? { emailOtpCode: code }
						: method === 'totp'
							? { totpCode: code }
							: { recoveryCode: code }),
				},
				verifiedSchema,
				challenge.csrfToken,
			);
			if (!mounted.current) return;
			if (mounted.current) onAuthenticated();
		} catch (failure) {
			if (
				submittedVerification &&
				failure instanceof AuthRequestError &&
				failure.status >= 500
			) {
				if (mounted.current) setVerificationOutcomeUnconfirmed(true);
				try {
					await readLiveSession();
					if (mounted.current) {
						onAuthenticated();
					}
					return;
				} catch {
					/* The verification outcome remains unconfirmed; retain the original safe error. */
				}
			}
			if (mounted.current)
				setError(failure instanceof Error ? failure.message : 'Verification failed. Try again.');
		} finally {
			const input = form.elements.namedItem('code');
			if (input instanceof HTMLInputElement) input.value = '';
			inFlight.current = false;
			if (mounted.current) setPending(false);
		}
	}
	return (
		<form
			method="post"
			action={browserApi.verifyMfa}
			onSubmit={submit}
			className={styles.form}
			aria-busy={busy}
		>
			<div className={styles.heading}>
				<p className={styles.eyebrow}>Step 2 of 2</p>
				<h1 ref={heading} tabIndex={-1}>
					Verify it’s you
				</h1>
				<p className={styles.help}>Choose a method and enter your code to securely continue.</p>
			</div>
			<fieldset disabled={busy || verificationOutcomeUnconfirmed} className={styles.methods}>
				<legend>Verification method</legend>
				<div className={styles.methodOptions}>
					{(['totp', 'recovery_code', 'email_otp'] as const)
						.filter((value) => challenge.methods.includes(value))
						.map((value) => (
							<label key={value} data-selected={method === value}>
								<span className={styles.methodIcon} aria-hidden="true">
									<HugeiconsIcon icon={methodDetails[value].icon} size={20} color="currentColor" />
								</span>
								<span className={styles.methodChoice}>
									<input
										type="radio"
										name="method"
										value={value}
										checked={method === value}
										onChange={() => {
											setMethod(value);
											setError('');
										}}
									/>
									<span>{methodDetails[value].label}</span>
								</span>
							</label>
						))}
				</div>
			</fieldset>
			{method === 'email_otp' ? (
				<div>
					<Button
						icon={Mail01Icon}
						width="full"
						variant="secondary"
						onClick={sendEmail}
						pending={sending}
						disabled={pending || verificationOutcomeUnconfirmed || retryAt !== 0}
					>
						Send email code
					</Button>
					<p className={styles.help} role="status">
						{emailSent
							? 'Code sent to your verified account email. Enter the newest six-digit code.'
							: 'Request a code at your verified account email.'}
						{retryAt !== 0 ? ' Wait at least 60 seconds before requesting another code.' : ''}
					</p>
				</div>
			) : null}
			<Input
				key={method}
				id="verification-code"
				name="code"
				label={
					method === 'email_otp'
						? 'Email verification code'
						: numericCode
							? 'Six-digit code'
							: 'Recovery code'
				}
				icon={method === 'email_otp' ? Mail01Icon : numericCode ? ShieldKeyIcon : Key01Icon}
				placeholder={numericCode ? '000000' : 'Enter a recovery code'}
				autoComplete={numericCode ? 'one-time-code' : 'off'}
				inputMode={numericCode ? 'numeric' : 'text'}
				pattern={numericCode ? '[0-9]{6}' : undefined}
				minLength={numericCode ? 6 : 12}
				maxLength={numericCode ? 6 : 128}
				required
				disabled={
					busy || verificationOutcomeUnconfirmed || (method === 'email_otp' && !emailSent)
				}
			/>
			{error ? (
				<p role="alert" className="error-message">
					{error}
				</p>
			) : null}
			<div className={styles.actions}>
				<Button
					type="submit"
					icon={ShieldKeyIcon}
					width="full"
					pending={pending}
					disabled={
						sending ||
						(method === 'email_otp' && !emailSent && !verificationOutcomeUnconfirmed)
					}
				>
					{verificationOutcomeUnconfirmed ? 'Check session' : 'Open platform'}
				</Button>
				<Button
					variant="secondary"
					icon={ArrowLeft01Icon}
					width="full"
					onClick={onRestart}
					disabled={busy}
				>
					Start sign-in again
				</Button>
			</div>
		</form>
	);
}
