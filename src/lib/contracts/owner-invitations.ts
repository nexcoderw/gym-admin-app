import { z } from 'zod';

import { organizationTimestampSchema } from './organizations';

export const ownerInvitationPermissions = {
	read: 'platform.organizations.owners.read',
	create: 'platform.organizations.owners.invite',
	revoke: 'platform.organizations.owners.revoke-invitation',
	send: 'platform.organizations.owners.send-invitation',
} as const;
export type OwnerInvitationPermission =
	(typeof ownerInvitationPermissions)[keyof typeof ownerInvitationPermissions];

export const ownerInvitationIdSchema = z.string().uuid();
export const ownerInvitationStatusSchema = z.enum([
	'PENDING_DELIVERY',
	'SENT',
	'ACCEPTED',
	'REVOKED',
]);
export const ownerInvitationDeliverySchema = z
	.object({
		status: z.enum(['QUEUED', 'PROCESSING', 'CONFIRMED', 'FAILED', 'UNCERTAIN']),
		message: z.string().min(1).max(240),
	})
	.strict();
const name = z
	.string()
	.refine(
		(value) => /[^\s\u0085]/u.test(value) && !value.includes('\u0000'),
		'Enter a meaningful full name.',
	)
	.refine((value) => Array.from(value).length <= 160, 'Use at most 160 characters.');
const email = z.string().min(3).max(254).pipe(z.email());

export const createOwnerInvitationSchema = z
	.object({
		displayName: z
			.string()
			.transform((value) => value.replace(/^[\s\u0085]+|[\s\u0085]+$/gu, ''))
			.pipe(name),
		email: z
			.string()
			.transform((value) => value.trim().toLowerCase())
			.pipe(email),
	})
	.strict();

export const ownerInvitationSchema = z
	.object({
		id: ownerInvitationIdSchema,
		organizationId: ownerInvitationIdSchema,
		displayName: name,
		email,
		status: ownerInvitationStatusSchema,
		deliveryStatus: z.enum(['QUEUED', 'PROCESSING', 'CONFIRMED', 'FAILED', 'UNCERTAIN']).nullable(),
		createdAt: organizationTimestampSchema,
		updatedAt: organizationTimestampSchema,
		sentAt: organizationTimestampSchema.nullable(),
		expiresAt: organizationTimestampSchema.nullable(),
		acceptedAt: organizationTimestampSchema.nullable(),
		revokedAt: organizationTimestampSchema.nullable(),
	})
	.strict()
	.refine((row) => {
		const pairedDelivery = (row.sentAt === null) === (row.expiresAt === null);
		if (!pairedDelivery) return false;
		if (row.sentAt && row.expiresAt && row.expiresAt <= row.sentAt) return false;
		switch (row.status) {
			case 'PENDING_DELIVERY':
				return row.sentAt === null && row.acceptedAt === null && row.revokedAt === null;
			case 'SENT':
				return row.sentAt !== null && row.acceptedAt === null && row.revokedAt === null;
			case 'ACCEPTED':
				return (
					row.sentAt !== null &&
					row.expiresAt !== null &&
					row.acceptedAt !== null &&
					row.acceptedAt >= row.sentAt &&
					row.acceptedAt <= row.expiresAt &&
					row.revokedAt === null
				);
			case 'REVOKED':
				return row.revokedAt !== null && row.acceptedAt === null;
		}
	}, 'The invitation lifecycle is incompatible.');

export const ownerInvitationListQuerySchema = z
	.object({
		limit: z.preprocess(
			(value) =>
				typeof value === 'string' && /^[1-9][0-9]*$/u.test(value) ? Number(value) : value,
			z.number().int().min(1).max(50).default(20),
		),
		status: ownerInvitationStatusSchema.optional(),
		cursor: ownerInvitationIdSchema.optional(),
	})
	.strict();
export const ownerInvitationListSchema = z
	.object({
		items: z.array(ownerInvitationSchema).max(50),
		nextCursor: ownerInvitationIdSchema.nullable(),
	})
	.strict()
	.refine(
		(value) =>
			new Set(value.items.map((row) => row.id)).size === value.items.length &&
			(value.nextCursor === null || value.items.at(-1)?.id === value.nextCursor),
		'The invitation cursor is incompatible.',
	);

export type OwnerInvitationStatus = z.infer<typeof ownerInvitationStatusSchema>;
export type OwnerInvitation = z.infer<typeof ownerInvitationSchema>;
export type OwnerInvitationListResponse = z.infer<typeof ownerInvitationListSchema>;
export type OwnerInvitationListQuery = z.infer<typeof ownerInvitationListQuerySchema>;
export type CreateOwnerInvitationRequest = z.infer<typeof createOwnerInvitationSchema>;

export const ownerInvitationStatusContent: Record<
	OwnerInvitationStatus,
	{ label: string; description: string }
> = {
	PENDING_DELIVERY: {
		label: 'Pending delivery',
		description: 'The invitation is recorded, but no email has been sent.',
	},
	SENT: {
		label: 'Sent',
		description:
			'The email provider accepted the delivery request. Recipient receipt is not confirmed.',
	},
	ACCEPTED: {
		label: 'Accepted',
		description: 'The invitation has been accepted according to the backend record.',
	},
	REVOKED: { label: 'Revoked', description: 'This invitation can no longer be used.' },
};

/** Shared safe translations; never display arbitrary provider messages or error codes. */
export function ownerInvitationFailure(status: number, code?: string) {
	if (status === 409 && code === 'OWNER_INVITATION_OUTSTANDING_CONFLICT') {
		return {
			status,
			code,
			message:
				'An outstanding invitation already exists for this email and gym. Review invitations before creating another.',
		};
	}
	if (status === 503 && code === 'OWNER_INVITATION_AUDIT_UNAVAILABLE') {
		return {
			status,
			code,
			message:
				'Owner invitation changes are temporarily unavailable. No success has been confirmed.',
		};
	}
	const messages: Record<number, readonly [string, string]> = {
		400: ['OWNER_INVITATION_INVALID_INPUT', 'Check the invitation details, status and cursor.'],
		401: ['AUTHENTICATION_REQUIRED', 'Your session has expired. Sign in again.'],
		403: [
			'ACCESS_DENIED',
			'Your account cannot perform this invitation operation, or its security proof was not accepted.',
		],
		404: ['OWNER_INVITATION_NOT_FOUND', 'This gym or owner invitation is no longer available.'],
		409: [
			'OWNER_INVITATION_CONFLICT',
			'This invitation has changed or cannot be revoked. Reload invitations before continuing.',
		],
		429: ['RATE_LIMITED', 'Too many requests. Wait before trying again.'],
		502: [
			'OUTCOME_UNCONFIRMED',
			'The invitation result could not be confirmed. Reload invitations before retrying a change.',
		],
		503: [
			'OUTCOME_UNCONFIRMED',
			'Owner invitations are temporarily unavailable. Reload invitations before retrying a change.',
		],
	};
	const entry = messages[status] ?? messages[502];
	return {
		status: messages[status] ? status : 502,
		code: entry?.[0] ?? 'OUTCOME_UNCONFIRMED',
		message: entry?.[1] ?? 'Owner invitations are unavailable.',
	};
}
