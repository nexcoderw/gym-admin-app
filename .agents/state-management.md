# State ownership

## Mandatory requirements

Use RSC for session/data ownership and component state for temporary form interaction. Derive permission navigation from server-resolved permissions. Refresh server state after successful mutations; keep credential values only for the current submission and clear them promptly.

## Prohibited patterns

No global auth store, cached browser role authority, localStorage sessions, or unnecessary state libraries.

## Good example

An MFA challenge lives in the login form state and is discarded on restart or successful verification.

## Review criteria

Check stale state, mutation synchronization, credential retention and request isolation.
