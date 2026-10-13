import { StatePanel } from '@/components/shared/state-panel';
import { RecoveryLayout } from '@/components/shared/recovery-layout';

export default function Loading() {
	return (
		<RecoveryLayout>
			<StatePanel kind="loading" layout="page" />
		</RecoveryLayout>
	);
}
