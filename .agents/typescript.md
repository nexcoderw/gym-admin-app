# TypeScript

## Mandatory requirements

Keep strict TypeScript, noUncheckedIndexedAccess and unknown boundary inputs. Infer DTOs from Zod schemas, validate before mapping, use type-only imports and explicit public contracts. Prefer discriminated state for password/MFA phases.

## Prohibited patterns

No any, unchecked assertions, non-null assertions for secrets, ts-ignore, duplicated DTO guesses or runtime trust in interfaces.

## Good example

Parse incoming JSON with loginRequestSchema.safeParse and use only parsed.data.

## Review criteria

Check nullable states, server/browser imports, inference, error paths and schema parity.
