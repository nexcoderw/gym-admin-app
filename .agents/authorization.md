# Authorization

## Purpose

Nest's current effective permissions authorize operations. UI visibility is only presentation.
Authentication establishes who is signed in; authorization establishes what that identity may do.

## Mandatory requirements

1. Resolve the current session and effective permissions through Nest at every protected data or
   mutation boundary. Reuse the established request-scoped session helper, not a browser assertion.
2. Protect the server page/data operation and its BFF route independently. A layout check alone
   cannot secure an independently invoked route handler or nested data operation.
3. Require the exact permission for the operation. Dashboard access requires
   `platform.dashboard.read`; no special role string automatically bypasses the check.
4. Filter navigation with validated permissions to avoid dead-end links, but enforce authorization
   again at the server and Nest. Hiding a button never makes its API safe.
5. Distinguish unauthenticated requests from insufficient permission. Redirect anonymous pages to a
   fixed login route; return a safe forbidden state for authenticated users without access.
6. Do not trust tenant IDs, permission headers, query parameters or client state as authority.
   Scope future organization/branch operations using backend-established policy, not frontend guesses.

## Do

After resolving a live server session:

```ts
const canReadDashboard = session.permissions.includes('platform.dashboard.read');

if (!canReadDashboard) {
	throw new BffError(403, 'PERMISSION_DENIED', 'You do not have access to this page.');
}
```

Use the shared authorization helpers where available rather than duplicating policy everywhere.

## Do not

```ts
// WRONG: role names and browser storage do not establish effective permissions.
const allowed = localStorage.getItem('role') === 'platform.owner';

// WRONG: treating a browser display flag as an authorization decision.
const authorizedForDashboardRequest = allowed;
```

Never add `platform.owner` bypasses or always-allow guards to make tests pass.

## Prevented failures and review checklist

- Independent server checks prevent direct-URL and direct-handler bypasses.
- Live effective permissions prevent revoked access persisting in cached browser state.
- Cover anonymous, expired, revoked, suspended, removed-permission and forged-header requests.
- Verify denied requests cannot fetch privileged data before the permission check.
- See [navigation.md](navigation.md), [nextjs.md](nextjs.md) and [testing.md](testing.md).
