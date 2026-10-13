# Security

## Mandatory requirements

Treat all browser and upstream input as untrusted. Validate exact configured Origin before mutations, enforce double-submit CSRF for MFA/logout, allowlist forwarded cookies and headers, bound input and upstream bodies, reject redirects upstream, and translate errors without raw details. Nest remains authoritative. Use HTTPS and host-only secure cookies in production.

## Prohibited patterns

No secrets or internal hosts in client bundles/errors/logs, arbitrary outbound URLs, session tokens in JSON, wildcard cookie Domain, or permission hints from headers.

## Good example

Only the platform session and CSRF cookies cross the BFF-to-Nest boundary; response DTOs strip unknown fields.

## Review criteria

Review SSRF, CSRF, cookie fixation, redirects, caching, XSS, error disclosure, request size and credential retention.
