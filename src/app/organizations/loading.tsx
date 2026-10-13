import { StatePanel } from '@/components/shared/state-panel';

export default function OrganizationsLoading() {
	return (
		<StatePanel
			kind="loading"
			title="Loading organizations"
			description="Requesting current authorized gym records."
		/>
	);
}
