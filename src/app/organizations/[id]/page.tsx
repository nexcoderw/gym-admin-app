import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { OrganizationDetails } from '@/components/organizations/organization-details';
import { OrganizationProblem } from '@/components/organizations/organization-problem';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { getOrganization } from '@/lib/server/endpoints/organizations/get';
import { organizationPage } from '@/lib/server/organization-pages';
import { serverContext } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Gym details' };

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
	const result = await organizationPage(organizationPermissions.read, async () => getOrganization((await params).id, await serverContext()));
	if (!result.ok) return <OrganizationProblem status={result.status} message={result.message} />;
	return (
		<>
			<PageHeader
				title={result.value.organization.name}
				description="The current registry record and platform lifecycle."
			/>
			<OrganizationDetails
				organization={result.value.organization}
				permissions={result.permissions}
			/>
		</>
	);
}
