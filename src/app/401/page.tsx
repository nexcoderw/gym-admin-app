import type { Metadata } from 'next';

import { RecoveryState } from '@/components/shared/recovery-state';

export const metadata: Metadata = { title: 'Sign-in required' };

export default function UnauthorizedPage() {
	return <RecoveryState kind="401" />;
}
