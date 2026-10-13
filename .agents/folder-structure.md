# Folder ownership

## Mandatory requirements

Pages and route handlers live in src/app. Shared UI lives in components/shared; auth and dashboard components retain feature ownership. Contracts are browser-safe in lib/contracts. Upstream operations live only in lib/server/endpoints and transport in lib/server/http. Keep navigation in constants; reusable client hooks belong in hooks only when justified.

## Prohibited patterns

No backend schemas, Prisma imports, dumping-ground utils files, duplicated route registries, empty speculative modules, or sibling-project edits.

## Good example

components/dashboard/stat-card.tsx owns its module CSS; a shared button never imports dashboard services.

## Review criteria

Check each file has one owner and server dependencies cannot flow into client components.
