import type { OwnerInvitation } from '@/lib/contracts/owner-invitations';
import { organization } from './organization-fixtures';

export const ownerInvitation: OwnerInvitation = {
	id: '11111111-1111-4111-8111-111111111111',
	organizationId: organization.id,
	displayName: 'Aline Uwase',
	email: 'aline@example.com',
	status: 'PENDING_DELIVERY',
	createdAt: '2026-10-16T08:00:00.000Z',
	updatedAt: '2026-10-16T08:00:00.000Z',
	sentAt: null,
	expiresAt: null,
	acceptedAt: null,
	revokedAt: null,
};
