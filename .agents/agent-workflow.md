# Agent execution boundary

## Mandatory requirements

Inspect first, read applicable rules, edit only authorized files, preserve user changes and statically review source. The human runs scaffolding, installs, formatting, linting, typechecks, tests, builds, servers, browser verification, Git writes and deployment. Supply exact commands and honest verification status.

## Prohibited patterns

No execution through wrappers, installs, servers, screenshots requiring startup, fabricated results, database operations or external repository creation.

## Good example

After authoring BFF tests, report them as not run and provide npm test for the human.

## Review criteria

Confirm only inspection/file edits occurred; document assumptions, blockers, allowed next steps and per-file commits.
