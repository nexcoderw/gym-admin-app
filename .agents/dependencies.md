# Dependencies

## Mandatory requirements

Preserve reviewed Next/React versions. Humans install official Hugeicons, server-only, Zod and test tooling with --save-exact and generate the lockfile. Review peer support, Node engines, licenses and security before release. Keep npm lockfile paired with manifest changes.

## Prohibited patterns

No agent installs, fabricated lockfiles, latest in committed manifests, Tailwind, UI frameworks, extra icon packages or speculative libraries.

## Good example

npm install --save-exact @hugeicons/react @hugeicons/core-free-icons server-only zod is a human command.

## Review criteria

Check resolved versions, React compatibility, transitive scope, dependency purpose and legitimate lockfile generation.
