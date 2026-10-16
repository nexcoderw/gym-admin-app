import { describe, expect, it } from 'vitest';

import {
	createOwnerInvitationSchema,
	ownerInvitationFailure,
	ownerInvitationListQuerySchema,
	ownerInvitationListSchema,
	ownerInvitationSchema,
	ownerInvitationStatusContent,
} from '@/lib/contracts/owner-invitations';
import { ownerInvitation } from './owner-invitation-fixtures';

describe('owner invitation browser-safe contracts', () => {
	it('normalizes the exact creation payload without adding authorization fields', () => {
		expect(
			createOwnerInvitationSchema.parse({
				displayName: '  Aline Uwase\u0085',
				email: ' ALINE@EXAMPLE.COM ',
			}),
		).toEqual({ displayName: 'Aline Uwase', email: 'aline@example.com' });
	});
	it.each([
		{ displayName: '', email: 'aline@example.com' },
		{ displayName: '\u0085\u00a0', email: 'aline@example.com' },
		{ displayName: 'a'.repeat(161), email: 'aline@example.com' },
		{ displayName: 'Aline', email: 'invalid' },
		{ displayName: 'Aline', email: 'é@example.com' },
		{ displayName: 'Aline', email: 'aline@example.com', verified: true },
		{ displayName: 'Ali\u0000ne', email: 'aline@example.com' },
	])('rejects invalid or unknown creation fields: %#', (input) => {
		expect(createOwnerInvitationSchema.safeParse(input).success).toBe(false);
	});
	it('validates canonical dates, UUIDs, lifecycle and response allowlists', () => {
		expect(ownerInvitationSchema.parse(ownerInvitation)).toEqual(ownerInvitation);
		for (const change of [
			{ id: 'bad' },
			{ organizationId: '../auth/session' },
			{ createdAt: '2026-10-16' },
			{ tokenDigest: 'private' },
			{ status: 'OWNER' },
			{ sentAt: ownerInvitation.createdAt },
			{ status: 'REVOKED', revokedAt: null },
		])
			expect(ownerInvitationSchema.safeParse({ ...ownerInvitation, ...change }).success).toBe(
				false,
			);
	});
	it('bounds pagination and requires the last emitted UUID cursor', () => {
		expect(ownerInvitationListQuerySchema.parse({})).toEqual({ limit: 20 });
		expect(ownerInvitationListQuerySchema.parse({ limit: '50', status: 'SENT' })).toEqual({
			limit: 50,
			status: 'SENT',
		});
		for (const input of [
			{ limit: 51 },
			{ cursor: 'bad' },
			{ status: 'sent' },
			{ search: 'Aline' },
		]) {
			expect(ownerInvitationListQuerySchema.safeParse(input).success).toBe(false);
		}
		expect(
			ownerInvitationListSchema.safeParse({ items: [], nextCursor: ownerInvitation.id }).success,
		).toBe(false);
		expect(
			ownerInvitationListSchema.safeParse({
				items: [ownerInvitation, ownerInvitation],
				nextCursor: null,
			}).success,
		).toBe(false);
	});
	it('uses accurate status copy and never maps invitation failures to MFA enrollment', () => {
		expect(ownerInvitationStatusContent.PENDING_DELIVERY.description).toContain(
			'no email has been sent',
		);
		expect(ownerInvitationStatusContent.SENT.description).toContain('receipt is not confirmed');
		expect(ownerInvitationFailure(409, 'OWNER_INVITATION_OUTSTANDING_CONFLICT').message).toContain(
			'already exists',
		);
		expect(ownerInvitationFailure(503, 'OWNER_INVITATION_AUDIT_UNAVAILABLE').code).toBe(
			'OWNER_INVITATION_AUDIT_UNAVAILABLE',
		);
		expect(ownerInvitationFailure(412).code).not.toBe('MFA_ENROLLMENT_REQUIRED');
	});
});
