# Environment

## Mandatory requirements

GYM_API_BASE_URL and ADMIN_ORIGIN are server-only validated origins. Production requires HTTPS and managed secrets; local uses ignored .env.local with fake templates tracked. Cookie mode is intentionally tied to NODE_ENV and must match Nest's PLATFORM_AUTH_COOKIE_SECURE setting.

## Prohibited patterns

No NEXT_PUBLIC upstream URL, committed credentials, env guessed from request Host, or production defaults.

## Good example

Local ADMIN_ORIGIN=http://localhost:3000 must match Nest PLATFORM_ADMIN_ORIGIN exactly.

## Review criteria

Check allowed origins, no URL credentials/path/query, local-only HTTP, production scheme and no client references.
