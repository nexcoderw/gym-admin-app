import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { OrganizationList } from '@/components/organizations/organization-list';
import { OrganizationProblem } from '@/components/organizations/organization-problem';
import { organizationPermissions, organizationListQuerySchema } from '@/lib/contracts/organizations';
import { listOrganizations } from '@/lib/server/endpoints/organizations/list';
import { organizationInput } from '@/lib/server/organizations-access';
import { organizationPage } from '@/lib/server/organization-pages';
import { serverContext } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Organizations' };

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
	const result = await organizationPage(organizationPermissions.read, async () => {
		const query = organizationInput(organizationListQuerySchema, await searchParams);
		return { query, data: await listOrganizations(query, await serverContext()) };
	});
	if (!result.ok) return <OrganizationProblem status={result.status} message={result.message} />;
	return (
		<>
			<PageHeader title="Organizations" description="Manage the gym registry and platform lifecycle approvals." />
			<OrganizationList {...result.value} canCreate={result.permissions.includes(organizationPermissions.create)} />
		</>
	);
}
