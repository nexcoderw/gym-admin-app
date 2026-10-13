'use client';

import { RecoveryState } from '@/components/shared/recovery-state';
import type { RecoveryBoundaryProps } from '@/components/shared/state-content';

export default function DashboardError({ retry, reset }: RecoveryBoundaryProps) {
	return (
		<RecoveryState
			kind="503"
			title="Overview unavailable"
			description="The platform summary could not be loaded. Try again to request current records."
			onRetry={retry ?? reset}
		/>
	);
}
