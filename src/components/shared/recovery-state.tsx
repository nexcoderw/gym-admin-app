'use client';

import { useState, useTransition } from 'react';
import { DashboardSquare01Icon, Login01Icon, RefreshIcon } from '@hugeicons/core-free-icons';

import { routes } from '@/constants/routes';
import { Button } from './button';
import { ButtonLink } from './button-link';
import { StatePanel } from './state-panel';
import { RecoveryLayout } from './recovery-layout';
import type { StateKind } from './state-content';

/** Retry is operator-triggered only; errors never start an automatic credential/request loop. */
export function RecoveryState({
	kind,
	layout = 'page',
	title,
	description,
	onRetry,
	secondaryAction,
}: {
	readonly kind: Exclude<StateKind, 'loading'>;
	readonly layout?: 'page' | 'section' | 'compact';
	readonly title?: string;
	readonly description?: string;
	readonly onRetry?: () => void | Promise<void>;
	readonly secondaryAction?: { readonly href: string; readonly label: string };
}) {
	const [transitionPending, startTransition] = useTransition();
	const [reloading, setReloading] = useState(false);
	const pending = transitionPending || reloading;
	const canRetry =
		kind !== '401' &&
		kind !== '404' &&
		(onRetry !== undefined || layout !== 'page' || secondaryAction !== undefined);
	const panel = (
		<StatePanel
			kind={kind}
			layout={layout}
			headingLevel={layout === 'compact' ? 2 : 1}
			title={title}
			description={description}
		>
			{canRetry ? (
				<Button
					icon={RefreshIcon}
					pending={pending}
					onClick={() => {
						if (onRetry) startTransition(onRetry);
						else {
							setReloading(true);
							window.location.reload();
						}
					}}
				>
					{kind === 'empty' ? 'Refresh records' : kind === '403' ? 'Check access' : 'Try again'}
				</Button>
			) : (
				<ButtonLink
					href={kind === '401' ? routes.login : routes.dashboard}
					icon={kind === '401' ? Login01Icon : DashboardSquare01Icon}
				>
					{kind === '401' ? 'Sign in' : kind === '404' ? 'Go to overview' : 'Try overview'}
				</ButtonLink>
			)}
			{layout !== 'compact' ? (
				<ButtonLink
					href={secondaryAction?.href ?? (kind === '401' ? routes.home : routes.login)}
					icon={
						secondaryAction ? RefreshIcon : kind === '401' ? DashboardSquare01Icon : Login01Icon
					}
					variant="secondary"
				>
					{secondaryAction?.label ?? (kind === '401' ? 'Workspace home' : 'Sign in')}
				</ButtonLink>
			) : null}
		</StatePanel>
	);
	return layout === 'page' ? <RecoveryLayout>{panel}</RecoveryLayout> : panel;
}
