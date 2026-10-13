# Platform authentication

## Mandatory requirements

Reuse password -> MFA -> server session. Reissue validated backend cookies on the frontend host; do not assume api.gym.rw host-only cookies reach admin.gym.rw. Session cookie is HttpOnly; CSRF cookie is intentionally readable. Require compatible cookie attributes and explicit Origin forwarding. Challenges stay only in short-lived React state. Clear cookies after confirmed logout.

## Prohibited patterns

No second authentication database, bearer-token storage, localStorage/sessionStorage credentials, unvalidated Set-Cookie relay or browser-supplied Origin forwarding.

## Good example

Login returns a challenge and CSRF value; MFA posts the challenge plus CSRF header and receives only safe confirmation.

## Review criteria

Check production/local cookie names, expiry, SameSite, Path, __Host prefix, logout, session failure and backend password-policy mismatch.
