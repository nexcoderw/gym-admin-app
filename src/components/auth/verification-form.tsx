'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { routes } from '@/constants/routes';
import { useAuthChallenge } from './auth-challenge-provider';
import { MfaForm } from './mfa-form';

export function VerificationForm() {
	const router = useRouter();
	const { state, clearChallenge } = useAuthChallenge();
	const navigating = useRef(false);
	const challenge = state.phase === 'verification' ? state.challenge : null;

	useEffect(() => {
		if (navigating.current) return;
		if (!challenge) {
			router.replace(routes.login);
			return;
		}
		let timer: ReturnType<typeof setTimeout> | undefined;
		function checkExpiry() {
			if (!challenge) return;
			const remaining = Date.parse(challenge.expiresAt) - Date.now();
			if (remaining <= 0) {
				clearChallenge();
				return;
			}
			timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
		}
		checkExpiry();
		return () => clearTimeout(timer);
	}, [challenge, clearChallenge, router]);

	function navigate(destination: typeof routes.login | typeof routes.dashboard) {
		navigating.current = true;
		clearChallenge();
		router.replace(destination);
		if (destination === routes.dashboard) router.refresh();
	}

	if (!challenge) return <p role="status">Continuing securely…</p>;
	return (
		<MfaForm
			challenge={challenge}
			onRestart={() => navigate(routes.login)}
			onAuthenticated={() => navigate(routes.dashboard)}
		/>
	);
}
