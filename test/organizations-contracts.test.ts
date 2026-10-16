import { describe, expect, it } from 'vitest';
import {
	createOrganizationSchema,
	organizationActionSchema,
	organizationEtagSchema,
	organizationListQuerySchema,
	organizationSchema,
	organizationTrailLimit,
	reservedOrganizationSlugs,
	updateOrganizationSchema,
} from '@/lib/contracts/organizations';
import { organization, organizationEtag } from './organization-fixtures';

describe('organization contract parity', () => {
	it('accepts only the safe response and creation fields', () => {
		expect(organizationSchema.parse(organization)).toEqual(organization);
		expect(organizationSchema.parse({ ...organization, name: ' Soho Gym ' }).name).toBe(
			' Soho Gym ',
		);
		expect(
			organizationSchema.safeParse({ ...organization, ownerEmail: 'private@example.invalid' })
				.success,
		).toBe(false);
		expect(createOrganizationSchema.parse({ name: ' \u0085Soho Gym ', slug: 'soho' })).toEqual({
			name: 'Soho Gym',
			slug: 'soho',
		});
		expect(
			createOrganizationSchema.safeParse({ name: 'Soho Gym', slug: 'soho', status: 'ACTIVE' })
				.success,
		).toBe(false);
		expect(updateOrganizationSchema.safeParse({ name: 'Power Gym', slug: 'power' }).success).toBe(
			false,
		);
	});
	it.each(reservedOrganizationSlugs)('rejects the reserved slug %s', (slug) => {
		expect(createOrganizationSchema.safeParse({ name: 'Soho Gym', slug }).success).toBe(false);
	});
	it.each(['Soho', 'soho\n', 'soho--gym', '-soho', 'soho-', 'soho.gym', 'sоho', 'ab'])(
		'rejects malformed slug %s',
		(slug) => {
			expect(createOrganizationSchema.safeParse({ name: 'Soho Gym', slug }).success).toBe(false);
		},
	);
	it.each(['', '\u0085\u00a0', 'x\u0000', 'x'.repeat(161)])('rejects invalid name %#', (name) => {
		expect(updateOrganizationSchema.safeParse({ name }).success).toBe(false);
	});
	it('matches code-point name bounds and canonical UTC preconditions', () => {
		expect(updateOrganizationSchema.safeParse({ name: '😀'.repeat(160) }).success).toBe(true);
		expect(organizationEtagSchema.safeParse(organizationEtag).success).toBe(true);
		for (const value of [
			'*',
			`W/${organizationEtag}`,
			organization.updatedAt,
			'"2026-02-30T12:00:00.000Z"',
		]) {
			expect(organizationEtagSchema.safeParse(value).success).toBe(false);
		}
		expect(
			organizationActionSchema.safeParse({
				expectedUpdatedAt: organization.updatedAt,
				status: 'ACTIVE',
			}).success,
		).toBe(false);
	});
	it('bounds pagination without offset coercion or unknown query fields', () => {
		expect(organizationListQuerySchema.parse({})).toEqual({ limit: 20 });
		expect(
			organizationListQuerySchema.parse({ limit: '50', status: 'ACTIVE', cursor: organization.id }),
		).toEqual({ limit: 50, status: 'ACTIVE', cursor: organization.id });
		for (const input of [
			{ limit: '01' },
			{ limit: '51' },
			{ limit: '20\n' },
			{ cursor: '../login' },
			{ offset: '20' },
			{ status: ['ACTIVE', 'PENDING'] },
		]) {
			expect(organizationListQuerySchema.safeParse(input).success).toBe(false);
		}
	});
	it('accepts a bounded frontend page trail only alongside a cursor', () => {
		const earlier = '2b9e8f4a-1c3d-4e5f-8a7b-9c0d1e2f3a4b';
		expect(
			organizationListQuerySchema.parse({
				cursor: organization.id,
				trail: `${earlier},${earlier}`,
			}),
		).toEqual({
			limit: 20,
			cursor: organization.id,
			trail: [earlier, earlier],
		});
		const tooLong = Array.from({ length: organizationTrailLimit + 1 }, () => earlier).join(',');
		for (const input of [
			{ trail: earlier },
			{ cursor: organization.id, trail: '' },
			{ cursor: organization.id, trail: 'not-a-uuid' },
			{ cursor: organization.id, trail: tooLong },
			{ cursor: organization.id, trail: [earlier, earlier] },
		]) {
			expect(organizationListQuerySchema.safeParse(input).success).toBe(false);
		}
	});
});
