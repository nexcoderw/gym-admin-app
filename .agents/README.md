# gym-admin engineering rules

## Precedence and mandatory reading

Human instructions take precedence, followed by root AGENTS.md/CLAUDE.md, this index and applicable topic rules. All agents must read this index and every relevant topic file completely before editing. Read git.md and agent-workflow.md for every task. Prefer the safer authentication, privacy and cache interpretation when unclear.

## Rule index

- [design](design.md)
- [endpoints](endpoints.md)
- [folder-structure](folder-structure.md)
- [file-naming](file-naming.md)
- [components](components.md)
- [styling](styling.md)
- [icons](icons.md)
- [nextjs](nextjs.md)
- [typescript](typescript.md)
- [code-quality](code-quality.md)
- [performance](performance.md)
- [security](security.md)
- [authentication](authentication.md)
- [authorization](authorization.md)
- [hooks](hooks.md)
- [state-management](state-management.md)
- [forms](forms.md)
- [navigation](navigation.md)
- [accessibility](accessibility.md)
- [responsive](responsive.md)
- [error-handling](error-handling.md)
- [testing](testing.md)
- [environment](environment.md)
- [dependencies](dependencies.md)
- [documentation](documentation.md)
- [prettier](prettier.md)
- [comments](comments.md)
- [git](git.md)
- [agent-workflow](agent-workflow.md)

## Prohibited patterns

Do not skip rules because tooling is available, delegate reading the rules, or apply backend/database ownership to this frontend. No command execution that agent-workflow.md reserves for humans.

## Good example

Before a BFF change read endpoints, security, authentication, authorization, nextjs, typescript, testing, environment, git and agent-workflow; inspect the exact Nest DTO/controller before editing.

## Review criteria

Identify applicable rules, source contracts, trust boundaries, file ownership, test coverage, unexecuted checks and per-file commit suggestions.
