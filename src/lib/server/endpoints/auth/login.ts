import 'server-only';

import { challengeSchema, loginRequestSchema, type LoginRequest } from '@/lib/contracts/auth';
import { upstream, type ForwardContext } from '../../http/upstream';

/** Nest PlatformAuthController.login / PlatformLoginDto. Origin is validated by the BFF. */
export function login(input: LoginRequest, context: ForwardContext) {
	return upstream(
		'/api/v1/platform/auth/login',
		'POST',
		challengeSchema,
		context,
		loginRequestSchema.parse(input),
	);
}
