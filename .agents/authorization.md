# Authorization

## Mandatory requirements

Resolve sessions and effective permissions through Nest for every protected operation. Check dashboard permission in both BFF handlers and server page data boundaries; Nest also checks it. Navigation filtering improves UX only. Redirect anonymous page requests only to the fixed login route; represent permission denial without pretending a session is absent.

## Prohibited patterns

No authorization from role strings, browser state, hidden links, tenant IDs, or a platform.owner bypass.

## Good example

session.permissions.includes('platform.dashboard.read') gates the overview after live session validation.

## Review criteria

Test anonymous, expired, revoked, suspended, permission removal and forged-header requests; never mock guards always-allow.
