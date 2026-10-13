# Hooks

## Mandatory requirements

Create a hook only for repeated stateful browser behavior with a clear lifecycle. Keep mutation state local, abort stale requests where appropriate, derive simple state during render, and clean up subscriptions. Server fetching belongs in server modules.

## Prohibited patterns

No useEffect fetch loops for server-owned data, one-use abstractions without benefit, secret storage hooks, or hooks in Server Components.

## Good example

A reusable request hook may own pending/error/abort state but cannot import lib/server.

## Review criteria

Check dependencies, teardown, race handling, error visibility and justified reuse.
