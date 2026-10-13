import 'server-only';

import { z } from 'zod';

import { upstream, type ForwardContext } from '../../http/upstream';

/** Nest PlatformAuthController.logout. Idempotent; requires validated Origin and CSRF. */
export function logout(context: ForwardContext) {
	return upstream('/api/v1/platform/auth/logout', 'POST', z.undefined(), context, undefined, 204);
}
