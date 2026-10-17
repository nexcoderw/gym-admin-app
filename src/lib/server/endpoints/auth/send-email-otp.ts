import 'server-only';

import { emailOtpRequestSchema, emailOtpSentSchema } from '@/lib/contracts/auth';
import { upstream, type ForwardContext } from '../../http/upstream';

/** Fixed Nest operation; password challenge and CSRF required, no client-selected recipient. */
export function sendEmailOtp(input: { readonly challengeToken: string }, context: ForwardContext) {
	return upstream(
		'/api/v1/platform/auth/mfa/email',
		'POST',
		emailOtpSentSchema,
		context,
		emailOtpRequestSchema.parse(input),
		200,
		{ policy: 'auth-command' },
	);
}
