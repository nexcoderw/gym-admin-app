import type { Metadata } from 'next';

import { RecoveryState } from '@/components/shared/recovery-state';

export const metadata: Metadata = { title: 'Workspace error' };

export default function ServerErrorPage() {
	return <RecoveryState kind="500" />;
}
