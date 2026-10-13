# Errors and empty states

## Mandatory requirements

Use stable safe BFF errors with no-store. Distinguish validation/auth/permission/rate-limit/upstream failures without echoing upstream messages. Provide actionable loading, error and not-found pages. Zero real records is a valid empty state; failure must not become zero statistics.

## Prohibited patterns

No stack traces, internal hostnames, raw backend errors, console logging tokens or fabricated fallback data.

## Good example

A failed summary says it could not be loaded and offers retry; a verified empty database displays real zeroes.

## Review criteria

Check pending layout, retry, expired sessions, rate limits, network aborts and sensitive information disclosure.
