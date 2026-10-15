'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { IconButton } from './icon-button';
import styles from './toast.module.css';

type Toast = { readonly id: number; readonly message: string };
type ToastApi = { readonly success: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);
const visibleMs = 5_000;
const maxVisible = 3;

/**
 * Confirmed-success feedback for the workspace. Show a toast only after the server confirmed the
 * change; failures stay inline beside the action that needs correcting.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
	const [toasts, setToasts] = useState<readonly Toast[]>([]);
	const dismiss = useCallback((id: number) => {
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);
	const api = useMemo<ToastApi>(
		() => ({
			success: (message) => {
				setToasts((current) => {
					// Items are appended in order, so the last id is the largest one still shown.
					const id = (current.at(-1)?.id ?? 0) + 1;
					return [...current, { id, message }].slice(-maxVisible);
				});
			},
		}),
		[],
	);
	return (
		<ToastContext value={api}>
			{children}
			<div className={styles.viewport} aria-live="polite" aria-relevant="additions">
				{toasts.length > 0 ? (
					<ol className={styles.list} aria-label="Notifications">
						{toasts.map((toast) => (
							<ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
						))}
					</ol>
				) : null}
			</div>
		</ToastContext>
	);
}

export function useToast(): ToastApi {
	const api = use(ToastContext);
	if (!api) throw new Error('useToast must be rendered inside ToastProvider.');
	return api;
}

/** Hover or keyboard focus pauses dismissal so the message can be read and acted on. */
function ToastItem({
	toast,
	onDismiss,
}: {
	readonly toast: Toast;
	readonly onDismiss: (id: number) => void;
}) {
	const [paused, setPaused] = useState(false);
	useEffect(() => {
		if (paused) return;
		const timer = window.setTimeout(() => onDismiss(toast.id), visibleMs);
		return () => {
			window.clearTimeout(timer);
		};
	}, [paused, toast.id, onDismiss]);
	return (
		<li
			className={styles.toast}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
		>
			<span className={styles.icon} aria-hidden="true">
				<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color="currentColor" />
			</span>
			<p className={styles.message}>{toast.message}</p>
			<IconButton
				icon={Cancel01Icon}
				label="Dismiss notification"
				onClick={() => onDismiss(toast.id)}
			/>
		</li>
	);
}
