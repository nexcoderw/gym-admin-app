/** Presentation only: these states never establish authentication or an HTTP response status. */
export const stateContent = {
	'401': {
		code: '401',
		title: 'Sign in to continue',
		description:
			'Your session may have ended. Sign in and verify your identity to open the workspace.',
		hint: 'Your password and authenticator are required.',
	},
	'403': {
		code: '403',
		title: 'This area needs permission',
		description:
			'Your account does not have access to this area. Contact your platform operator if you need access.',
		hint: 'Signing in does not automatically grant every permission.',
	},
	'404': {
		code: '404',
		title: 'Page not found',
		description:
			'This address does not lead to a workspace page. Check the link or return to your overview.',
		hint: 'Your workspace is one click away.',
	},
	'429': {
		code: '429',
		title: 'Let’s pause for a moment',
		description: 'Too many requests were made in a short time. Wait a little before trying again.',
		hint: 'Repeated attempts can keep you waiting longer.',
	},
	'500': {
		code: '500',
		title: 'Something interrupted this page',
		description: 'We could not finish loading the workspace. Try again, or return to the overview.',
		hint: 'If this continues, contact your platform operator.',
	},
	'503': {
		code: '503',
		title: 'Workspace temporarily unavailable',
		description: 'We could not reach the information needed for this page. Try again in a moment.',
		hint: 'Unavailable information is never replaced with made-up statistics.',
	},
	empty: {
		code: '',
		title: 'No staff assignments yet',
		description:
			'Staff assignment statuses will appear here once accounts are provisioned. Refresh to check for updates.',
		hint: 'This is an empty result, not a connection error.',
	},
	loading: {
		title: 'Loading your overview',
	},
} as const;

export type StateKind = keyof typeof stateContent;

/** Supports both Next 16.4 retry and older reset callers without inspecting raw errors. */
export interface RecoveryBoundaryProps {
	readonly error?: Error & { readonly digest?: string };
	readonly retry?: () => void;
	readonly reset?: () => void;
}
