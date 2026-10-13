import { RecoveryState } from '@/components/shared/recovery-state';
import { routes } from '@/constants/routes';

export function OrganizationProblem({
	status,
	message,
}: {
	readonly status: number;
	readonly message: string;
}) {
	const kind =
		status === 401
			? '401'
			: status === 403
				? '403'
				: status === 404 || status === 400
					? '404'
					: status === 429
						? '429'
						: status === 500
							? '500'
							: '503';
	return (
		<RecoveryState
			kind={kind}
			title={status === 400 ? 'Check the organization request' : undefined}
			description={message}
			secondaryAction={{ href: routes.organizations, label: 'Back to gyms' }}
		/>
	);
}
