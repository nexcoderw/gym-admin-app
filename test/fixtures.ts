export const token = 'a'.repeat(43);
export const csrf = 'b'.repeat(43);
export const expiration = '2035-01-01T08:00:00.000Z';
export const session = {
	userId: '2f5298af-cf42-4e66-8968-a42be74cb34b',
	platformStaffId: 'a652ac64-47b5-499e-a849-dca02166c46b',
	displayName: 'Fictional Operator', email: 'operator@example.invalid', expiresAt: expiration,
	roles: ['platform.auditor'], permissions: ['platform.dashboard.read'],
};
export const summary = {
	generatedAt: '2030-01-01T00:00:00.000Z', globalUsers: { total: 4 },
	platformStaff: { total: 2, pending: 1, active: 1, suspended: 0, revoked: 0 },
	platformRoles: { total: 1 }, platformPermissions: { total: 2 },
};
