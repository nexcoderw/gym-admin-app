# Git workflow

## Mandatory requirements

Only the human performs Git writes. Keep one file per commit, ordered by dependencies; rule files form one uninterrupted group. Use lowercase type(scope): imperative summary under 72 characters. Provide exact git add and git commit pairs for every changed file; exclude ignored secrets/generated files. There is initially no Git repository: human initialization is a prerequisite, not an agent action.

## Prohibited patterns

No agent add/commit/push/init/reset/checkout/stash, history rewriting, blanket git add ., generated artifacts or fabricated lockfiles.

## Good example

git add src/constants/routes.ts followed by git commit -m "feat(routes): define frontend route constants".

## Review criteria

Review every file, exact paths, dependency order, secret scan, manifest/lockfile adjacency and human authorization.
