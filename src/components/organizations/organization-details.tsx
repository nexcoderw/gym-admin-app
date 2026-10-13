import { PencilEdit01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { ButtonLink } from '@/components/shared/button-link';
import { Card } from '@/components/shared/card';
import { routes } from '@/constants/routes';
import { organizationPermissions, type Organization } from '@/lib/contracts/organizations';
import { OrganizationStatusBadge } from './organization-status-badge';
import { OrganizationLifecycleActions } from './organization-lifecycle-actions';
import styles from './organization-details.module.css';

const dates = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kigali' });
export function OrganizationDetails({ organization, permissions }: { readonly organization: Organization; readonly permissions: readonly string[] }) {
	const entries = [
		['Registered', organization.createdAt],
		['Last updated', organization.updatedAt],
		['Last activated', organization.activatedAt],
		['Last suspended', organization.suspendedAt],
		['Archived', organization.archivedAt],
	] as const;
	return (
		<div className={styles.details}>
			<Card>
				<div className={styles.heading}><h2>Organization record</h2><OrganizationStatusBadge status={organization.status} /></div>
				<dl className={styles.fields}>
					<div><dt>Gym name</dt><dd>{organization.name}</dd></div>
					<div><dt>Slug</dt><dd>{organization.slug}</dd></div>
					<div><dt>Organization UUID</dt><dd>{organization.id}</dd></div>
					{entries.map(([label, value]) => value ? <div key={label}><dt>{label} (Kigali)</dt><dd><time dateTime={value}>{dates.format(new Date(value))}</time></dd></div> : null)}
				</dl>
			</Card>
			<Card>
				<h2>Future address preview</h2>
				<p className={styles.preview}>{organization.slug}.gym.rw</p>
				<p className={styles.note}>Preview only. This subdomain has not been provisioned by this interface.</p>
			</Card>
			<div className={styles.actions}>
				{permissions.includes(organizationPermissions.update) ? <ButtonLink href={routes.editOrganization(organization.id)} icon={PencilEdit01Icon}>Edit gym name</ButtonLink> : null}
				<OrganizationLifecycleActions organization={organization} permissions={permissions} />
				<ButtonLink href={routes.organizations} icon={ArrowLeft01Icon} variant="secondary">All organizations</ButtonLink>
			</div>
		</div>
	);
}
