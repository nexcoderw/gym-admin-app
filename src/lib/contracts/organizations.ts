import { z } from 'zod';

export const organizationPermissions = {
	read: 'platform.organizations.read',
	create: 'platform.organizations.create',
	update: 'platform.organizations.update',
	activate: 'platform.organizations.activate',
	suspend: 'platform.organizations.suspend',
} as const;
export type OrganizationPermission = (typeof organizationPermissions)[keyof typeof organizationPermissions];

// Reviewed against gym-api's ORGANIZATION_RESERVED_SLUGS; no tenant/domain provisioning is implied.
export const reservedOrganizationSlugs = [
	'admin', 'api', 'app', 'www', 'auth', 'login', 'member', 'members', 'portal',
	'dashboard', 'billing', 'support', 'status', 'static', 'assets', 'cdn', 'mail',
	'dev', 'staging', 'test', 'localhost', 'account', 'accounts', 'oauth', 'console',
	'internal', 'health', 'metrics', 'production', 'development', 'bootstrap',
] as const;
export const organizationStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const organizationIdSchema = z.string().uuid();
export const organizationTimestampSchema = z.string().length(24).datetime().refine(
	(value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
	'Use the exact UTC timestamp from the latest organization read.',
);
export const organizationEtagSchema = z.string().length(26).refine((value) => {
	if (!value.startsWith('"') || !value.endsWith('"')) return false;
	return organizationTimestampSchema.safeParse(value.slice(1, -1)).success;
}, 'Reload the organization before saving.');
const displayNameSchema = z.string()
	.refine((value) => /[^\s\u0085]/u.test(value) && !value.includes('\u0000'), 'Enter a meaningful gym name.')
	.refine((value) => Array.from(value).length <= 160, 'Use at most 160 characters.');
const nameSchema = z.string()
	.transform((value) => value.replace(/^[\s\u0085]+|[\s\u0085]+$/gu, ''))
	.pipe(displayNameSchema);
const slugSchema = z.string().min(3).max(63)
	.regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?![\s\S])/u, 'Use lowercase letters, numbers and single hyphens.')
	.refine((value) => !reservedOrganizationSlugs.some((reserved) => reserved === value), 'This slug is reserved.');

export const organizationSchema = z.object({
	id: organizationIdSchema,
	name: displayNameSchema,
	slug: slugSchema,
	status: organizationStatusSchema,
	createdAt: organizationTimestampSchema,
	updatedAt: organizationTimestampSchema,
	activatedAt: organizationTimestampSchema.nullable(),
	suspendedAt: organizationTimestampSchema.nullable(),
	archivedAt: organizationTimestampSchema.nullable(),
}).strict();
export const organizationListSchema = z.object({
	items: z.array(organizationSchema).max(50),
	nextCursor: organizationIdSchema.nullable(),
}).strict().refine((value) => value.nextCursor === null || value.items.at(-1)?.id === value.nextCursor,
	'Pagination must use the last emitted organization UUID.');
export const organizationListQuerySchema = z.object({
	limit: z.preprocess(
		(value) => typeof value === 'string' && /^[1-9][0-9]*(?![\s\S])/u.test(value) ? Number(value) : value,
		z.number().int().min(1).max(50).default(20),
	),
	status: organizationStatusSchema.optional(),
	cursor: organizationIdSchema.optional(),
}).strict();
export const createOrganizationSchema = z.object({ name: nameSchema, slug: slugSchema }).strict();
export const updateOrganizationSchema = z.object({ name: nameSchema }).strict();
export const organizationActionSchema = z.object({ expectedUpdatedAt: organizationTimestampSchema }).strict();
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;
export type OrganizationListResponse = z.infer<typeof organizationListSchema>;
export type OrganizationListQuery = z.infer<typeof organizationListQuerySchema>;
export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationSchema>;
export type OrganizationActionRequest = z.infer<typeof organizationActionSchema>;

/** Shared safe translations; provider messages and arbitrary codes are never displayed. */
export function organizationFailure(status: number, code?: string) {
	const messages: Record<number, [string, string]> = {
		400: ['ORGANIZATION_INPUT_REJECTED', 'Check the gym details. If a list cursor is no longer available, restart the list.'],
		401: ['AUTHENTICATION_REQUIRED', 'Your session has expired. Sign in again.'],
		403: ['ACCESS_DENIED', 'Your account cannot perform this operation.'],
		404: ['ORGANIZATION_NOT_FOUND', 'This organization could not be found.'],
		409: ['ORGANIZATION_CONFLICT', 'The slug is already registered or this lifecycle change is no longer valid. Reload the current records.'],
		412: ['ORGANIZATION_STALE', 'This gym has changed. Reload its current details before making another change.'],
		429: ['RATE_LIMITED', 'Too many requests. Wait before trying again.'],
		503: ['SERVICE_UNAVAILABLE', 'Organization management is temporarily unavailable. No success has been confirmed.'],
	};
	if (status === 503 && code === 'ORGANIZATION_AUDIT_UNAVAILABLE') {
		return { status, code, message: 'Gym changes are temporarily unavailable because the platform audit setup is not complete.' };
	}
	if (status === 409 && code === 'ORGANIZATION_SLUG_CONFLICT') {
		return { status, code, message: 'This slug is already registered. Choose another slug.' };
	}
	if (status === 409 && code === 'ORGANIZATION_TRANSITION_CONFLICT') {
		return { status, code, message: 'This lifecycle change is no longer valid. Reload the gym details.' };
	}
	const match = messages[status] ?? messages[503];
	return { status: messages[status] ? status : 503, code: match?.[0] ?? 'SERVICE_UNAVAILABLE', message: match?.[1] ?? 'Organization management is unavailable.' };
}
