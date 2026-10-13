import type { Metadata } from 'next';

import { RecoveryState } from '@/components/shared/recovery-state';

export const metadata: Metadata = { title: 'Access restricted' };

export default function ForbiddenPage() {
	return <RecoveryState kind="403" />;
}
