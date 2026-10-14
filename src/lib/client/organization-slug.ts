import { reservedOrganizationSlugs } from '@/lib/contracts/organizations';

/** Suggests a valid ASCII slug; only the server can confirm that it is available. */
export function suggestOrganizationSlug(name: string): string {
	let slug = name
		.normalize('NFKD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
		.replace(/['’]/gu, '')
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '');

	// Do not invent an unrelated identifier when the name has no ASCII representation.
	if (!slug) return '';
	if (!/^[a-z]/u.test(slug)) slug = `gym-${slug}`;
	if (slug.length < 3 || reservedOrganizationSlugs.some((reserved) => reserved === slug)) {
		slug = `${slug}-gym`;
	}
	return slug.slice(0, 63).replace(/-+$/u, '');
}
