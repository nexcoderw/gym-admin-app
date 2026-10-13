# Endpoint registration and BFF boundary

## Mandatory requirements

Register exactly one verified Nest operation per server-only endpoint module and one matching route.ts. Browser code uses constants containing only /api frontend paths. Every endpoint declares its method, fixed upstream path, Zod request/response contract, cookie needs and safe errors. RSC calls endpoint modules directly. Follow README registration table and backend source DTOs before adding an operation.

## Prohibited patterns

No catch-all forwarding, browser backend URLs, NEXT_PUBLIC upstream configuration, arbitrary paths or methods, blindly forwarded headers, or authorization by obscurity.

## Good example

Browser POST /api/auth/login -> src/app/api/auth/login/route.ts -> src/lib/server/endpoints/auth/login.ts -> POST /api/v1/platform/auth/login; login DTO; Origin required; no session required.

## Review criteria

Confirm path against backend source, strict input validation, response allowlisting, no-store, Origin/CSRF, cookies, permissions, tests and documentation.
