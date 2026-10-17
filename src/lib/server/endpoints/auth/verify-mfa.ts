import 'server-only';

import { verifiedSchema, verifyMfaRequestSchema, type MfaRequest } from '@/lib/contracts/auth';
import { upstream, type ForwardContext } from '../../http/upstream';

/** Nest PlatformAuthController.verifyMfa / PlatformMfaVerifyDto. Requires challenge and CSRF. */
export function verifyMfa(input: MfaRequest, context: ForwardContext) {
	return upstream(
		'/api/v1/platform/auth/mfa/verify',
		'POST',
		verifiedSchema,
		context,
		verifyMfaRequestSchema.parse(input),
		200,
		{ policy: 'auth-command' },
	);
}
