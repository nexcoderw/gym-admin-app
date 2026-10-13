import type { Metadata } from 'next';

import { RecoveryState } from '@/components/shared/recovery-state';

export const metadata: Metadata = { title: 'Workspace unavailable' };

export default function ServiceUnavailablePage() {
	return <RecoveryState kind="503" />;
}
