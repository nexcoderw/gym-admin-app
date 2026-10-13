# gym-admin engineering rules

## Scope and interpretation

These rules govern `app/admin`: the superadmin frontend and its fixed BFF adapters. Nest owns
authentication, effective permissions and business policy. The DB package owns Prisma and schemas.
MUST means required; MUST NOT means forbidden. Examples illustrate the rule and are not necessarily
standalone files. A do-not example must never be copied into production.

## Reading and precedence

1. Explicit human instructions take precedence within applicable platform constraints.
2. Read root `AGENTS.md`/`CLAUDE.md`, this index and every relevant topic completely before editing.
3. Read `git.md` and `agent-workflow.md` for every task; read `prettier.md` before code/config edits.
4. Apply all relevant rules together. If requirements conflict, explain the conflict rather than
   silently choosing a weaker authentication, privacy or cache interpretation.
5. Do not treat a code example as permission to install, execute tooling or expand the task.

## Rule index

- [Design](design.md): tokens, visual hierarchy and truthful metrics.
- [Endpoints](endpoints.md): fixed frontend/BFF/Nest contracts and registration.
- [Folder structure](folder-structure.md): file ownership and server/client boundaries.
- [File naming](file-naming.md): predictable paths, identifiers and framework exceptions.
- [Components](components.md): accessible primitives and feature composition.
- [Styling](styling.md): CSS Modules, semantic tokens and selector scope.
- [Icons](icons.md): official Hugeicons imports and accessible labels.
- [Next.js](nextjs.md): installed-version APIs, RSC and private rendering.
- [TypeScript](typescript.md): strict types and validated runtime boundaries.
- [Code quality](code-quality.md): focused responsibilities and reviewable diffs.
- [Performance](performance.md): small client islands and measured targets.
- [Security](security.md): Origin, CSRF, cookies, transport and disclosure.
- [Authentication](authentication.md): password/MFA/session lifecycle.
- [Authorization](authorization.md): live effective permissions, never role shortcuts.
- [Hooks](hooks.md): justified reusable browser behavior and cleanup.
- [State management](state-management.md): server authority and temporary client state.
- [Forms](forms.md): validation, pending states and credential handling.
- [Navigation](navigation.md): one registry, safe destinations and active states.
- [Accessibility](accessibility.md): semantics, keyboard, labels and announcements.
- [Responsive](responsive.md): mobile-first reflow and long-content resilience.
- [Error handling](error-handling.md): safe errors and honest empty states.
- [Testing](testing.md): meaningful negative cases and human-only execution.
- [Environment](environment.md): server-only origins and safe configuration.
- [Dependencies](dependencies.md): reviewed versions and human-generated lockfiles.
- [Documentation](documentation.md): accurate, scoped handoff and setup guidance.
- [Prettier](prettier.md): Button-style formatting, editor setup and human commands.
- [Comments](comments.md): explain invariants, not obvious syntax.
- [Git](git.md): current-state inspection and exact one-file commit plans.
- [Agent workflow](agent-workflow.md): permitted inspection/editing and human-only execution.

## Do

```text
Task: change the login form.
Always read: git, agent-workflow, prettier.
Also read: forms, authentication, security, endpoints, typescript,
components, accessibility, styling, error-handling and testing.
Inspect the current Nest DTO before changing accepted payloads.
Preserve existing user changes; provide manual verification commands.
```

## Do not

```text
WRONG: Read only forms.md and ignore authentication or Git requirements.
WRONG: Run tools because the agent can access them.
WRONG: Change Prisma or Nest policy from this frontend repository.
```

## Prevented failures and review checklist

- Combined rules prevent a locally tidy change from violating a security or ownership boundary.
- Confirm applicable rules, source contracts, file ownership and uncommitted work before editing.
- At handoff state changed behavior, unexecuted checks, risks and per-file commit suggestions.
- Rules require human review; prose alone does not enforce linting, testing or authorization.
