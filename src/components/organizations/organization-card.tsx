import { ArrowRight01Icon, Link01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { IconButton } from '@/components/shared/icon-button';
import type { Organization } from '@/lib/contracts/organizations';
import { formatOrganizationDate } from './organization-dates';
import { OrganizationStatusBadge } from './organization-status-badge';
import styles from './organization-card.module.css';

/** Decorative initials from the first two words; the full name is always visible beside them. */
function monogram(name: string): string {
	return name
		.trim()
		.split(/\s+/u)
		.slice(0, 2)
		.map((word) => Array.from(word)[0] ?? '')
		.join('')
		.toLocaleUpperCase('en');
}

/**
 * The name button's overlay makes the whole card open the details dialog while assistive
 * technology still meets one clearly named control; the edit action sits above that overlay.
 */
export function OrganizationCard({
	organization,
	canUpdate,
	onOpen,
	onEdit,
}: {
	readonly organization: Organization;
	readonly canUpdate: boolean;
	readonly onOpen: (trigger: HTMLElement) => void;
	readonly onEdit: (trigger: HTMLElement) => void;
}) {
	const nameId = `organization-${organization.id}-name`;
	return (
		<article className={styles.card} aria-labelledby={nameId}>
			<div className={styles.top}>
				<span className={styles.monogram} aria-hidden="true">
					{monogram(organization.name)}
				</span>
				<OrganizationStatusBadge status={organization.status} />
			</div>
			<div className={styles.identity}>
				<h2 id={nameId} className={styles.name}>
					<button
						type="button"
						className={styles.open}
						aria-haspopup="dialog"
						onClick={(event) => onOpen(event.currentTarget)}
					>
						{organization.name}
					</button>
				</h2>
				<p className={styles.slug}>
					<HugeiconsIcon icon={Link01Icon} size={14} color="currentColor" aria-hidden="true" />
					<span>{organization.slug}</span>
				</p>
			</div>
			<dl className={styles.meta}>
				<div>
					<dt>Registered</dt>
					<dd>
						<time dateTime={organization.createdAt}>
							{formatOrganizationDate(organization.createdAt)}
						</time>
					</dd>
				</div>
				<div>
					<dt>Last updated</dt>
					<dd>
						<time dateTime={organization.updatedAt}>
							{formatOrganizationDate(organization.updatedAt)}
						</time>
					</dd>
				</div>
			</dl>
			<div className={styles.footer}>
				<span className={styles.cue} aria-hidden="true">
					Details
					<HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" />
				</span>
				{canUpdate ? (
					<IconButton
						icon={PencilEdit01Icon}
						label={`Edit ${organization.name}`}
						variant="outline"
						className={styles.edit}
						aria-haspopup="dialog"
						onClick={(event) => onEdit(event.currentTarget)}
					/>
				) : null}
			</div>
		</article>
	);
}
