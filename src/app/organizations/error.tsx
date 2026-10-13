'use client';

import { RecoveryState } from '@/components/shared/recovery-state';
import type { RecoveryBoundaryProps } from '@/components/shared/state-content';

export default function OrganizationsError({ retry, reset }: RecoveryBoundaryProps) {
	return (
		<RecoveryState
			kind="503"
			title="Organizations unavailable"
			description="Current gym records could not be loaded. No empty registry or successful change has been inferred."
			onRetry={retry ?? reset}
		/>
	);
}
