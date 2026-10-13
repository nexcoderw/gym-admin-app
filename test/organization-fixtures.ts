import type { Organization } from '@/lib/contracts/organizations';

export const organization: Organization = {
	id: '1d899ab0-c9d3-4abe-a053-55817c8c59e0',
	name: 'Soho Gym',
	slug: 'soho',
	status: 'PENDING',
	createdAt: '2026-10-13T12:00:00.000Z',
	updatedAt: '2026-10-13T12:00:00.000Z',
	activatedAt: null,
	suspendedAt: null,
	archivedAt: null,
};
export const organizationEtag = `"${organization.updatedAt}"`;
