# Endpoint registration and BFF boundary

## Purpose

Expose a small, explicit frontend API while keeping Nest URLs and credentials server-only.
Each BFF handler adapts one verified Nest operation; it must never become an arbitrary proxy.

## Mandatory requirements

1. Inspect the actual Nest controller, DTO and permission requirement before adding or changing an
   operation. Do not infer endpoint names or payloads from UI requirements.
2. Register browser paths in `src/constants/routes.ts` using only frontend-owned `/api/...` paths.
   Keep fixed upstream paths inside `src/lib/server/endpoints/` modules marked `server-only`.
3. Use one explicit endpoint module per operation and its matching route handler. Declare method,
   fixed path, request/response schemas, session needs, permission needs, Origin/CSRF and cookie flow.
4. Route handlers orchestrate shared validation/transport/error helpers. Do not duplicate cookie
   parsing, security checks or generic fetch policy inside each handler.
5. Server Components call the server operation directly, not the frontend's own HTTP route.
   Browser components use only the frontend route constant.
6. Validate incoming JSON and outgoing DTOs, allowlist data and headers, preserve safe status/error
   semantics and apply no-store. Never forward raw backend response bodies blindly.
7. Update the README endpoint table and author positive and negative contract tests in the same task.

## Do

```text
Browser: POST /api/auth/login
  → src/app/api/auth/login/route.ts
  → src/lib/server/endpoints/auth/login.ts
  → Nest: POST /api/v1/platform/auth/login

Contract: verified login DTO; exact Origin required; no pre-existing session.
Response: safe challenge fields + separately validated cookies; no session token JSON.
```

Illustrative browser call:

```ts
await fetch(browserApi.login, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(validatedInput),
});
```

The caller still needs safe error and pending handling.

## Do not

```ts
// WRONG: backend configuration and arbitrary routing leak into browser code.
fetch(process.env.NEXT_PUBLIC_API_URL + userSelectedPath);
```

No catch-all `[...path]` forwarding, client-selected methods, unrestricted header relay, browser
Nest URLs or new endpoint guesses. A concealed URL is not authorization.

## Prevented failures and review checklist

- Explicit registration prevents accidental exposure of unrelated backend operations.
- Server-only paths and fixed transport prevent bundle leaks and SSRF.
- Confirm source DTO parity, method/path, Origin, CSRF, permissions, cookie policy and safe errors.
- See [folder-structure.md](folder-structure.md), [security.md](security.md) and [documentation.md](documentation.md).
