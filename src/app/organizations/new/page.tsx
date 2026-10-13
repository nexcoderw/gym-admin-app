import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { AppShell } from '@/components/shared/app-shell';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { OrganizationProblem } from '@/components/organizations/organization-problem';
import { organizationPermissions } from '@/lib/contracts/organizations';
import { organizationPage } from '@/lib/server/organization-pages';

export const metadata: Metadata = { title: 'Register Gym' };

export default async function NewOrganizationPage() {
	const result = await organizationPage(organizationPermissions.create, () => Promise.resolve(null));
	if (!result.ok) return <OrganizationProblem status={result.status} message={result.message} />;
	return (
		<AppShell permissions={result.permissions} displayName={result.displayName}>
			<PageHeader
				title="Register Gym"
				description="Add a pending organization. Registration does not activate access or a subscription."
			/>
			<OrganizationForm mode="create" />
		</AppShell>
	);
}
