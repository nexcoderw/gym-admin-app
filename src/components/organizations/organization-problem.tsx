import { RefreshIcon } from '@hugeicons/core-free-icons';
import { ButtonLink } from '@/components/shared/button-link';
import { RecoveryState } from '@/components/shared/recovery-state';
import { routes } from '@/constants/routes';

export function OrganizationProblem({ status, message }: { readonly status: number; readonly message: string }) {
	const kind = status === 403 ? '403' : status === 404 || status === 400 ? '404' : status === 429 ? '429' : '503';
	return (
		<>
			<RecoveryState
				kind={kind}
				layout="section"
				title={status === 400 ? 'Check the organization request' : undefined}
				description={message}
			/>
			<ButtonLink href={routes.organizations} icon={RefreshIcon} variant="secondary">
				Restart organization list
			</ButtonLink>
		</>
	);
}
