import { z } from 'zod';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const total = z.object({ total: count });

export const summarySchema = z.object({
	generatedAt: z.string().datetime(),
	globalUsers: total,
	platformStaff: z.object({
		total: count,
		pending: count,
		active: count,
		suspended: count,
		revoked: count,
	}),
	platformRoles: total,
	platformPermissions: total,
}).refine(({ platformStaff }) => platformStaff.total === platformStaff.pending + platformStaff.active + platformStaff.suspended + platformStaff.revoked);

export type DashboardSummary = z.infer<typeof summarySchema>;
