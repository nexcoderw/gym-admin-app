import { StatePanel } from '@/components/shared/state-panel';
import { RecoveryLayout } from '@/components/shared/recovery-layout';

export default function OrganizationsLoading() {
	return (
		<RecoveryLayout>
			<StatePanel
				kind="loading"
				layout="page"
				title="Loading organizations"
				description="Requesting current authorized gym records."
			/>
		</RecoveryLayout>
	);
}
