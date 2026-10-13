import { z } from 'zod';

export const opaqueToken = z.string().regex(/^[A-Za-z0-9_-]{32,256}$/u);
const utcDate = z.string().datetime();

export const loginRequestSchema = z
	.object({
		email: z.string().trim().toLowerCase().email().max(254),
		// Matches the currently implemented Nest DTO, not the separate bootstrap policy.
		password: z.string().min(12).max(1024),
	})
	.strict();

export const challengeSchema = z.object({
	challengeToken: opaqueToken,
	csrfToken: opaqueToken,
	expiresAt: utcDate,
	methods: z
		.array(z.enum(['totp', 'recovery_code']))
		.min(1)
		.max(2),
});

export const verifyMfaRequestSchema = z.discriminatedUnion('method', [
	z
		.object({
			challengeToken: opaqueToken,
			method: z.literal('totp'),
			totpCode: z.string().regex(/^\d{6}$/u),
		})
		.strict(),
	z
		.object({
			challengeToken: opaqueToken,
			method: z.literal('recovery_code'),
			recoveryCode: z.string().min(12).max(128),
		})
		.strict(),
]);

export const verifiedSchema = z.object({
	status: z.literal('authenticated'),
	expiresAt: utcDate,
	csrfToken: opaqueToken,
});

export const sessionSchema = z.object({
	userId: z.string().uuid(),
	displayName: z.string().max(160),
	email: z.string().email().max(254),
	platformStaffId: z.string().uuid(),
	expiresAt: utcDate,
	// The backend DTO declares string arrays; the transport bounds the complete response size.
	roles: z.array(z.string()),
	permissions: z.array(z.string()),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type MfaRequest = z.infer<typeof verifyMfaRequestSchema>;
export type MfaChallenge = z.infer<typeof challengeSchema>;
export type PlatformSession = z.infer<typeof sessionSchema>;
