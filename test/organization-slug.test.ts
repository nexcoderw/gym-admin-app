import { describe, expect, it } from 'vitest';

import { suggestOrganizationSlug } from '@/lib/client/organization-slug';
import { createOrganizationSchema, reservedOrganizationSlugs } from '@/lib/contracts/organizations';

describe('organization slug suggestions', () => {
	it.each([
		['Soho Gym', 'soho-gym'],
		['  Kigali   Fitness -- Club! ', 'kigali-fitness-club'],
		['Élite Fitness', 'elite-fitness'],
		['Cafe\u0301 Gym', 'cafe-gym'],
		['NEXCODE’s Gym', 'nexcodes-gym'],
		['24/7 Fitness', 'gym-24-7-fitness'],
		['A', 'a-gym'],
		['AB', 'ab-gym'],
		['ADMIN', 'admin-gym'],
		['Full＿Width', 'full-width'],
	])('suggests a contract-valid slug for %s', (name, expected) => {
		const slug = suggestOrganizationSlug(name);
		expect(slug).toBe(expected);
		expect(createOrganizationSchema.safeParse({ name, slug }).success).toBe(true);
	});

	it.each(['', '   ', '---', '🏋️', '東京'])('leaves %s for explicit slug entry', (name) => {
		expect(suggestOrganizationSlug(name)).toBe('');
	});

	it.each(reservedOrganizationSlugs)('avoids the reserved slug %s', (name) => {
		const slug = suggestOrganizationSlug(name);
		expect(slug).toBe(`${name}-gym`);
		expect(createOrganizationSchema.safeParse({ name, slug }).success).toBe(true);
	});

	it('limits long suggestions without leaving a trailing hyphen', () => {
		expect(suggestOrganizationSlug('a'.repeat(100))).toBe('a'.repeat(63));
		expect(suggestOrganizationSlug(`${'a'.repeat(62)} b`)).toBe('a'.repeat(62));
	});
});
