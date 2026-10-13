'use client';

import { RecoveryState } from '@/components/shared/recovery-state';
import type { RecoveryBoundaryProps } from '@/components/shared/state-content';

export default function ErrorPage({ retry, reset }: RecoveryBoundaryProps) {
	return <RecoveryState kind="500" onRetry={retry ?? reset} />;
}
