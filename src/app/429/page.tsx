import type { Metadata } from 'next';

import { RecoveryState } from '@/components/shared/recovery-state';

export const metadata: Metadata = { title: 'Too many requests' };

export default function RateLimitedPage() {
	return <RecoveryState kind="429" />;
}
