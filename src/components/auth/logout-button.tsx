'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/shared/button';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, post } from '@/lib/client/mutations';
import styles from './logout-button.module.css';

export function LogoutButton() {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	async function signOut() {
		if (pending) return;
		setPending(true);
		setError('');
		try {
			const csrf = browserCsrf();
			if (!csrf) throw new Error('Refresh this page before signing out.');
			await post(browserApi.logout, {}, z.undefined(), csrf);
			router.replace(routes.login);
			router.refresh();
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'Sign-out failed. Try again.');
		} finally { setPending(false); }
	}
	return <div className={styles.container}><Button variant="secondary" pending={pending} onClick={signOut}>Sign out</Button>{error ? <p role="alert" className="error-message">{error}</p> : null}</div>;
}
