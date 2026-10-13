'use client';

import { RefreshIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Card } from '@/components/shared/card';
import { PageHeader } from '@/components/shared/page-header';

export default function DashboardError({ reset }: { reset: () => void }) {
	return (
		<>
			<PageHeader
				title="Overview unavailable"
				description="The platform summary could not be loaded. No statistics have been substituted."
			/>
			<Card>
				<Button icon={RefreshIcon} onClick={reset}>
					Try again
				</Button>
			</Card>
		</>
	);
}
