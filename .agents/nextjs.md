# Next.js App Router

## Mandatory requirements

Read installed Next version documentation before modifying framework APIs. Default to Server Components, await cookies/headers, authenticate pages and handlers independently, and use Node runtime for BFF crypto. Keep private fetches no-store. Cache Components stays disabled for this simple private foundation until a measured, reviewed strategy exists.

## Prohibited patterns

No root use client, use cache for identity data, arbitrary proxies, self-HTTP calls from RSC, or reliance on layout checks alone.

## Good example

A dashboard page calls requirePlatformSession and its typed summary operation, never fetch('/api/dashboard/summary') on the server.

## Review criteria

Check rendering mode, cache isolation, client serialization, error boundaries and Next-version compatibility.
