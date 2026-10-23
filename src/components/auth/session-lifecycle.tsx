'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { browserApi, routes } from '@/constants/routes';
import { SESSION_CONFIRMATION_TIMEOUT_MS } from '@/lib/client/session';

/** Expiry/focus checks only: background polling would silently extend server-side idle lifetime. */
export function SessionLifecycle({ expiresAt }: { readonly expiresAt: string }) {
	const router = useRouter();
	useEffect(() => {
		let request: AbortController | undefined;
		let disposed = false;
		async function checkSession(): Promise<void> {
			if (disposed || request || document.visibilityState === 'hidden') return;
			const controller = new AbortController();
			request = controller;
			const deadline = window.setTimeout(() => controller.abort(), SESSION_CONFIRMATION_TIMEOUT_MS);
			try {
				const response = await fetch(browserApi.session, {
					credentials: 'same-origin',
					cache: 'no-store',
					redirect: 'error',
					signal: controller.signal,
				});
				await response.body?.cancel();
				if (!disposed && response.status === 401) {
					router.replace(routes.login);
					router.refresh();
				}
			} catch {
				// Network/timeout failures are not proof of logout; protected operations still fail closed.
			} finally {
				window.clearTimeout(deadline);
				request = undefined;
			}
		}
		const recheck = () => {
			void checkSession();
		};
		const timer = window.setTimeout(recheck, Math.max(0, Date.parse(expiresAt) - Date.now()));
		document.addEventListener('visibilitychange', recheck);
		window.addEventListener('focus', recheck);
		return () => {
			disposed = true;
			window.clearTimeout(timer);
			request?.abort();
			document.removeEventListener('visibilitychange', recheck);
			window.removeEventListener('focus', recheck);
		};
	}, [expiresAt, router]);
	return null;
}
