# Testing

## Mandatory requirements

Author Vitest unit/component and BFF contract tests plus Playwright browser checks. Mock transport boundaries, never pretend mocks prove Nest/PostgreSQL integration. Test routes, input bounds, Origin, CSRF, cookie attributes, redirects, permission nav, safe errors and client/server separation. Only humans execute tooling.

## Prohibited patterns

No real credentials, production mutations, always-allow auth, broad snapshots, fabricated pass claims or shared state between tests.

## Good example

A cookie test rejects Domain=.gym.rw and a handler test rejects foreign Origin before fetch.

## Review criteria

Review negative cases, fixture scope, import guards, accessibility, browser behavior and explicit unrun status.
