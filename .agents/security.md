# Security

## Purpose and scope

Treat browser requests and backend responses as untrusted. The BFF is a narrow security adapter,
not a general proxy. Nest remains authoritative for sessions, authorization and business policy.

## Mandatory requirements

1. Validate the request Origin against the configured exact admin origin before processing mutation
   bodies or contacting Nest. Reject missing or foreign origins where the mutation contract requires
   them. Never derive trusted origin from arbitrary Host/forwarded headers.
2. Enforce the established double-submit CSRF contract for MFA and logout. Validate proof format and
   compare safely. A cookie alone, CORS alone or SameSite alone is not the complete defense.
3. Allowlist forwarded headers and platform cookies. Do not forward the entire incoming Cookie or
   Authorization header. Never accept client permission headers or invented identity hints.
4. Use fixed upstream origins, paths and methods. Reject upstream redirects. Apply timeout, request
   body and response body limits through the shared transport; never remove them for convenience.
5. Validate response DTOs and cookie attributes before forwarding anything. Strip unrelated fields.
   Session tokens, stack traces, internal hosts and raw upstream messages must not reach browser JSON.
6. Mark private responses no-store, use production HTTPS and secure host-only cookies, and avoid
   unsafe HTML insertion. Do not introduce user-controlled outbound URLs or `dangerouslySetInnerHTML`.
7. Keep credentials out of logs, screenshots, fixtures, examples and Git history. Redact diagnostics
   at their source; removing a secret from the displayed UI does not remove it from a log.

## Do

```text
Mutation request
  → exact Origin validation
  → bounded body + schema validation
  → session/CSRF checks required by this endpoint
  → fixed upstream operation
  → response/cookie validation
  → safe no-store response
```

Use the existing helpers for these steps; ordering is part of the security contract.

## Do not

```ts
// WRONG: arbitrary destination and unrestricted credential forwarding.
await fetch(request.nextUrl.searchParams.get('url')!, {
	headers: request.headers,
});

// WRONG: raw errors can contain SQL, credentials or internal hostnames.
return Response.json({ error: String(error) });
```

Do not weaken a failed check to make a happy-path test pass. Missing verification is a release risk,
not evidence that a defense is unnecessary.

## Prevented failures and review checklist

- Fixed destinations prevent SSRF; Origin/CSRF checks prevent cross-site mutations.
- Cookie/response allowlists prevent credential leakage and unexpected backend fields escaping.
- Review redirects, cache isolation, fixation, XSS, bounds, timeouts and sanitized failure paths.
- Security tests must include rejection cases, not only successful login.
- See [endpoints.md](endpoints.md), [authentication.md](authentication.md) and [testing.md](testing.md).
