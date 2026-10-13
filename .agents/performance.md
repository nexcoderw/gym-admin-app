# Performance

## Mandatory requirements

Prefer RSC, small client islands, direct endpoint calls and request-scoped React.cache for session deduplication. Avoid waterfalls for independent reads, but authenticate before privileged fetching. Target p75 LCP <=2.5s, INP <=200ms and CLS <=0.1, measured on representative devices; these are targets, not claimed results.

## Prohibited patterns

No polling, unnecessary global providers, speculative memoization, heavy animation dependencies, global private caches or unmeasured optimization claims.

## Good example

Keep the shell server-rendered and only login/logout interactions client-side.

## Review criteria

Inspect client bundles, icon imports, layout stability, network waterfalls, slow mobile behavior and real metrics.
