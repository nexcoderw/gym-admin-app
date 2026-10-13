# Comments and TSDoc

## Mandatory requirements

Document non-obvious cookie, CSRF, caching, authorization and transport invariants near implementation. Public reusable contracts explain inputs, safe failures and ownership. Keep comments accurate and concise.

## Prohibited patterns

No syntax narration, dead code, credentials, vague TODOs or security guarantees stronger than implementation.

## Good example

Explain that server cookie relay changes the issuing host without widening Domain.

## Review criteria

Check comments match behavior and preserve security intent without exposing secrets.
