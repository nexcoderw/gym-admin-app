import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { AppShell } from '@/components/shared/app-shell';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { OrganizationProblem } from '@/components/organizations/organization-problem';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { getOrganization } from '@/lib/server/endpoints/organizations/get';
import { organizationPage } from '@/lib/server/organization-pages';
import { serverContext } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Edit gym name' };

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
	const result = await organizationPage(organizationPermissions.update, async () => getOrganization((await params).id, await serverContext()));
	if (!result.ok) return <OrganizationProblem status={result.status} message={result.message} />;
	return (
		<AppShell permissions={result.permissions} displayName={result.displayName}>
			<PageHeader
				title="Edit gym name"
				description="Save a conditional name change without replacing concurrent updates."
			/>
			<OrganizationForm mode="edit" {...result.value} key={result.value.etag} />
		</AppShell>
	);
}
