import Link from 'next/link';
import { Add01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { ButtonLink } from '@/components/shared/button-link';
import { Card } from '@/components/shared/card';
import { StatePanel } from '@/components/shared/state-panel';
import { routes } from '@/constants/routes';
import type { OrganizationListQuery, OrganizationListResponse } from '@/lib/contracts/organizations';
import { OrganizationStatusBadge } from './organization-status-badge';
import { OrganizationListControls } from './organization-list-controls';
import styles from './organization-list.module.css';

const registeredDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Kigali' });

export function OrganizationList({ data, query, canCreate }: { readonly data: OrganizationListResponse; readonly query: OrganizationListQuery; readonly canCreate: boolean }) {
	return (
		<section aria-label="Organization registry" className={styles.registry}>
			{canCreate ? <ButtonLink href={routes.newOrganization} icon={Add01Icon}>Register Gym</ButtonLink> : null}
			<OrganizationListControls query={query} nextCursor={data.nextCursor} />
			{data.items.length === 0 ? (
				<StatePanel
					kind="empty"
					layout="compact"
					headingLevel={2}
					title={query.cursor ? 'No more gyms in this result set' : query.status ? 'No gyms with this status' : 'No gyms registered yet'}
					description={query.cursor || query.status ? 'Choose another status or restart the list to see current records.' : canCreate ? 'Register a gym to add a pending organization to the platform registry.' : 'An authorized platform operator can register the first gym.'}
				/>
			) : (
				<Card className={styles.panel}>
					<table className={styles.table}>
						<caption className={styles.caption}>Current organization records</caption>
						<thead><tr><th scope="col">Gym</th><th scope="col">Slug</th><th scope="col">Status</th><th scope="col" className={styles.registered}>Registered</th><th scope="col">Details</th></tr></thead>
						<tbody>{data.items.map((organization) => (
							<tr key={organization.id}>
								<th scope="row"><Link href={routes.organization(organization.id)} prefetch={false}>{organization.name}</Link></th>
								<td data-label="Slug">{organization.slug}</td>
								<td data-label="Status"><OrganizationStatusBadge status={organization.status} /></td>
								<td className={styles.registered}><time dateTime={organization.createdAt}>{registeredDate.format(new Date(organization.createdAt))}</time></td>
								<td><ButtonLink href={routes.organization(organization.id)} icon={ArrowRight01Icon} variant="secondary">View gym<span className={styles.srOnly}> {organization.name}</span></ButtonLink></td>
							</tr>
						))}</tbody>
					</table>
				</Card>
			)}
		</section>
	);
}
