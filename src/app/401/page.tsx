import type { Metadata } from 'next';

import { RecoveryState } from '@/components/shared/recovery-state';
import { requireAnonymousSession } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Sign-in required' };

export default async function UnauthorizedPage() {
	await requireAnonymousSession();
	return <RecoveryState kind="401" />;
}
