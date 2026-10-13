# NEXCODE Gym Admin

Private superadmin frontend foundation for admin.gym.rw; proposed repository: nexcoderw/gym-admin.
Next.js owns the UI and five explicit BFF adapters. NestJS owns authentication and effective
permissions. gym-db owns every schema and migration. No sibling project was changed.

## Inspection and scope

The existing scaffold declares Next.js 16.4.0 and React 19.3.0, App Router, TypeScript and no
Tailwind. Initially there was no node_modules, lockfile or Git repository, so no branch/latest
commits or installed Next docs were available. Existing framework versions and the generated Next
agent-instruction block were preserved. Official version-matched documentation was consulted.
After installation, read node_modules/next/dist/docs before subsequent framework changes.

Implemented: responsive light login/MFA and dashboard shells; shared Button/Input/Card/navigation;
real aggregate summary presentation; fixed typed BFF endpoints; strict validation; host-only cookie
relay; safe errors; loading, error and not-found states; authored tests and engineering rules.
No fake metrics, organization/staff CRUD, billing, payments, subscriptions or additional domains.

## Structure

```text
.agents/                       Topic rules and mandatory reading index
src/app/                       Server pages/layouts and explicit BFF Route Handlers
src/components/shared/         Shared primitives and application shell
src/components/auth/           Password, MFA and logout interactions
src/components/dashboard/      Real platform statistics presentation
src/constants/                 Frontend routes and one navigation definition
src/lib/contracts/             Browser-safe Zod schemas and inferred DTOs
src/lib/client/                Same-origin browser mutations
src/lib/server/endpoints/      One verified upstream operation per module
src/lib/server/http/           Transport, cookies, request checks and safe errors
src/lib/server/session.ts      Request-scoped RSC session guards
test/                          Boundary, adapter, component and browser tests
```

Hooks and state libraries are intentionally not added without demonstrated reuse. Every styled
reusable component owns a colocated CSS Module. Pages compose features, not backend requests.

## Design system

The supported theme is light. Palette and shape tokens are adapted from the
[care-basket reference stylesheet](https://github.com/kajugadaniels/care-basket/blob/c08bee6b6c8905e35c08c1494da8a413e813b457/src/app/globals.css):
white surfaces, #111111 text, #003087 primary actions, #00246a hover, #f6f8fb soft surfaces and
#6b7686 control borders. The bright #009cde accent is decorative only. Buttons are pill-shaped;
text inputs/selects use 8px corners and a consistent bordered baseline. Native select options
retain platform behavior; the reference globals alone does not specify every component detail.

Only Albert Sans (headings) and DM Sans (body, controls and data) are chosen font families. next/font
self-hosts both; the human build/dev environment needs access to Google Fonts when downloading
them initially. Browsers receive same-origin font assets. The compact scale uses 14px body/data,
13px secondary text, 12px metadata and 20–24px page headings, with 16px form inputs and 48px controls.
Generic font fallbacks support loading/failure, not an additional designed typeface.

Desktop uses a quiet sidebar; compact screens keep navigation and logout available in a header.
Below 40rem, secondary metric descriptions and redundant metadata are hidden, but all actual counts,
labels, errors and actions remain available. Grids reflow from one to two to four columns as space
allows. Motion respects reduced-motion preferences; no automatic dark theme or fake metrics exist.

## Shared controls and login

Login uses one centered, responsive sign-in panel with concise copy rather than a marketing column.
Both password and MFA steps retain their existing validation and authentication behavior.
Every text Input has a required decorative `icon` alongside its visible label. Buttons also require
an `icon`; shared Button owns rendering it and replaces it with one consistent spinner when pending.
Action labels stay unchanged while loading, so accessible names and control widths remain stable.
Input's optional `trailingAction` slot supports feature-owned controls without embedding password
policy in the primitive. The login eye button has a 44px target, an accessible show/hide label and
`type="button"`; it never submits the form. Revealing preserves the value and autocomplete. Login
hides the password before sending and clears it afterward; the eye control is disabled while pending.

Button widths are `full` (100%), `medium` (12rem, default) and `small` (8rem), capped to the container.
All retain a 48px minimum height. Use full width for authentication submits, medium for ordinary
actions and small for compact actions such as logout. Do not implement caller-specific spinners.

```tsx
<>
	<Button icon={ArrowRight01Icon} width="full" pending={pending}>
		Continue to verification
	</Button>
	<Button icon={RefreshIcon} width="medium">
		Try again
	</Button>
	<Button icon={Logout01Icon} width="small" variant="secondary">
		Sign out
	</Button>
</>
```

The excerpt assumes imports from the shared Button and official Hugeicons package, plus a real
pending state and handlers in the owning feature.

## Verified endpoint registry

Browser paths live only in src/constants/routes.ts. Each row owns a dedicated route.ts and
server-only endpoint module. No catch-all proxy or client-visible upstream origin exists.

| Browser/BFF path       | Module under src/lib/server/endpoints | Confirmed Nest contract                                             | Method and security                                                       |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| /api/auth/login        | auth/login.ts                         | PlatformAuthController.login; PlatformLoginDto                      | POST, exact Origin; email/password -> challenge, CSRF, expiry             |
| /api/auth/mfa/verify   | auth/verify-mfa.ts                    | PlatformAuthController.verifyMfa; PlatformMfaVerifyDto              | POST, Origin + CSRF; challenge/TOTP or recovery code -> safe confirmation |
| /api/auth/session      | auth/get-session.ts                   | PlatformAuthController.getSession; PlatformSessionResponseDto       | GET, live session -> own safe identity and effective permissions          |
| /api/auth/logout       | auth/logout.ts                        | PlatformAuthController.logout                                       | POST, Origin + CSRF -> idempotent 204 and cookie clearing                 |
| /api/dashboard/summary | dashboard/get-summary.ts              | PlatformDashboardController.getSummary; PlatformDashboardSummaryDto | GET, live session + platform.dashboard.read -> actual aggregate counts    |

Confirmed upstream paths: /api/v1/platform/auth/login, /api/v1/platform/auth/mfa/verify,
/api/v1/platform/auth/session, /api/v1/platform/auth/logout and /api/v1/platform/dashboard/summary.
The dashboard was confirmed in backend source, not assumed from a roadmap. Endpoint modules own
fixed paths/methods and schema mapping. Shared non-secret DTO schemas live in lib/contracts; response
object schemas strip unknown fields rather than relaying internal payload extensions.

To register another operation: inspect the actual Nest controller/DTO; add its contract; add one
server-only operation with a literal path/method; add one independently protected route.ts; add a
frontend path constant if needed; test negative cases; update this table. Do not add arbitrary
forwarding, reset-password or domain endpoints that do not exist.

## Cookie, CSRF and permission boundary

The browser calls the admin BFF only. Adapters use a configured trusted Nest origin, no-store fetch,
redirect rejection and a 10-second timeout. Only platform cookies, the configured approved Origin,
JSON headers and the validated CSRF header are forwarded. Browser role/tenant/forwarding headers
are not trusted or relayed. JSON inputs have an 8KiB streaming limit; upstream JSON has a 64KiB limit.
Errors expose stable safe codes/messages, never raw upstream messages, stack traces or hostnames.

Production expects __Host-nexcode-platform-session (Secure, HttpOnly) and
__Host-nexcode-platform-csrf (Secure, intentionally readable). Local mode uses the corresponding
non-prefixed, non-Secure names. Both require Path=/, SameSite=Strict, valid Expires and no Domain.
Unexpected attributes, missing/duplicate cookies, or a body/cookie CSRF mismatch fail closed.
The complete upstream cookie set is validated before the BFF reissues cookies on the frontend host.
An API-host-only cookie is not assumed to reach the admin host. Session tokens never enter JSON,
client JavaScript, localStorage or sessionStorage. Login challenges exist only in React state.

Login requires exact configured Origin. MFA/logout also require a CSRF cookie and matching
x-platform-csrf-token. Only the configured approved Origin is intentionally sent upstream.
Compatible logout clears both frontend cookies; it does not create a second authentication system.
Passwords/verification inputs are cleared after submission. Missing or incompatible cookie
contracts fail closed rather than broadening Domain or relaxing Secure/HttpOnly.

RSC calls typed endpoints directly, without a self-HTTP hop. React.cache deduplicates session reads
within a render only, never across users/requests. Each BFF handler and protected data operation
checks access independently; layout checks and hidden navigation are supplementary. Anonymous pages
redirect only to /login. Permission denial produces an explicit access-required state. The
platform.owner role name grants no bypass. Nest independently enforces its own live guards.
Private API and dashboard responses are no-store; no fabricated zero statistics appear on failure.

## Known backend and release concerns

- First-owner initialization is not activation. Nest deliberately rejects pending users/staff or
  unverified mailboxes with a generic 401. Finish the approved operator activation flow with the
  original authenticator factor; never bypass those checks or reinitialize an existing owner.
- Password mismatch: the inspected login DTO requires 12 characters, while first-owner bootstrap
  permits 8 bytes. Shorter existing bootstrap passwords cannot pass that login DTO. This frontend
  follows the confirmed login contract. Resolve the backend policy or credential recovery through
  a separately reviewed change; never recreate/delete real owners to bypass it.
- Cookie mode: match backend PLATFORM_ADMIN_ORIGIN to frontend ADMIN_ORIGIN exactly. Production
  requires backend PLATFORM_AUTH_COOKIE_SECURE=true. No backend policy changes were made.
- Rate limits: browser IP headers are intentionally not forwarded. Nest sees the BFF peer and may
  group users under existing IP-based limits. Review a trusted proxy/client identity and distributed
  limiting policy before multi-instance production.
- Backend packaging: the API's previously inspected private DB dependency used a local link and
  had an incomplete lockfile. Frontend integration does not prove a reproducible backend release.
- Production security: frame/referrer/content-type/permissions headers are configured, but a reviewed
  nonce-based CSP, infrastructure access controls and redacted observability remain release gates.
  Do not add unsafe script policies as a shortcut. Do not capture traces with real admin secrets.
- Session preflight and summary are separate calls, not an atomic permission-revocation guarantee.
  Nest remains authoritative on each operation.

## Human installation and environment

The scaffold already exists. Do not rerun create-next-app over it. Runtime/test dependencies are
declared in package.json and the human-generated package-lock.json records their resolution.
For a clean checkout with the reviewed matching lockfile, the human installs with npm ci. For an
approved dependency change, follow [.agents/dependencies.md](.agents/dependencies.md); review engine,
peer compatibility, licenses and advisories before release. Agents do not install or edit lockfiles.

From gym/app/admin:

```bash
node --version
npm ci
```

Only when `.env.local` does not already exist, create it from the fictional example:

```bash
cp .env.local.example .env.local
chmod 600 .env.local
```

Do not overwrite an existing dotenv file. Local values:

```dotenv
GYM_API_BASE_URL=http://127.0.0.1:3000
ADMIN_ORIGIN=http://localhost:4000
```

Use the real approved Nest origin and the exact browser origin. No NEXT_PUBLIC upstream URL,
database URL, API session secret, MFA key or Prisma dependency belongs here. Production supplies
HTTPS origins through managed configuration. Real dotenv files are ignored; fake examples are tracked.
Never expose a development server to production users or use it with real administrator secrets;
development framework diagnostics are not the production error-disclosure boundary.

Local development uses API port 3000, admin port 4000 and manager port 4001. Admin and manager
dev/start scripts pin their ports; a Next dotenv PORT is not a substitute. Nest's local settings are
`PORT=3000`, `PLATFORM_ADMIN_ORIGIN=http://localhost:4000` and
`CORS_ORIGINS=http://localhost:4000,http://localhost:4001`. Production keeps explicit HTTPS origins.
If your shell exports old values, unset those port/origin variables before restarting the services.

## Formatting and editor setup

Read [.agents/prettier.md](.agents/prettier.md) for the exact formatting contract and examples.
Use tabs with a two-space display width, 100-column preferred wrapping, single-quoted TypeScript
strings, double-quoted JSX attributes, semicolons and LF. The shared Button is the visual reference;
Prettier decides whether short elements stay inline and long props wrap.

Open `app/admin` as a VS Code workspace folder, install the recommended Prettier extension and select
Prettier as the default formatter. Option+Shift+F on macOS runs Format Document; format-on-save uses
the same committed configuration. Nested `.vscode` settings do not automatically apply when only
the parent `gym` folder is open. Do not use repeated spaces for manual column alignment.

Humans run formatters and inspect the diff. For just the rule/configuration updates:

```bash
npx prettier --write .agents .prettierrc.json .vscode AGENTS.md CLAUDE.md README.md
```

Do not pass `.editorconfig` to Prettier. For an intentional whole-project formatting pass and
verification, use the following commands; formatting alone does not establish runtime correctness.

## Human verification

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

typecheck runs next typegen before TypeScript to create framework route types in clean worktrees.
Vitest tests transport/validation/components with fake fetch, never real accounts or PostgreSQL.
The server-only alias exists only in Vitest configuration, not production.

Playwright uses a separately started app; it never starts a server implicitly. First terminal:

```bash
npx playwright install chromium webkit
npm run dev
```

Second terminal, from gym/app/admin:

```bash
npm run test:e2e
```

The anonymous redirect works without Nest. Real login/MFA/dashboard smoke checks require the human
to start the existing Nest application with `npm run start:dev` from `../../api/api` and use an
approved disposable identity. Browser tests mock
the login boundary; they are not proof of live credential authentication. Check Network for only
frontend /api calls, HttpOnly/host-only session cookies and safe error messages. After build, this
static-asset scan should produce no matches:

```bash
grep -R -n -E 'GYM_API_BASE_URL|api\.gym\.rw|/api/v1/platform' .next/static
```

Source-boundary tests complement but do not replace built-bundle inspection. Manually verify
keyboard navigation, 200% zoom, 320/768/1440px reflow, reduced motion, screen readers and actual mobile
devices. Targets: p75 LCP <=2.5s, INP <=200ms, CLS <=0.1. These are not measured results.
No installs, formatting, lint, typecheck, tests, builds, servers or screenshots were run by the agent.

## Git handoff

Read [.agents/git.md](.agents/git.md) before preparing any commit. Inspect current status rather than
reusing the historical initial-scaffold state or a stale commit plan:

```bash
git status --short
git diff
git diff --cached
```

Only the human stages and commits. Use one exact file per commit in dependency order, with all
changed `.agents/` files forming one uninterrupted group of individual commits. Inspect the staging
area before each commit: it must contain only the intended file. A changed package-lock.json goes
immediately after its matching package.json. Exclude secrets, ignored files and generated output.
Preserve user deletions and unrelated changes; do not recreate a removed commit-plan document.
Agents provide per-file messages/commands and explicitly report unexecuted checks; they never
initialize, mutate or push the repository as part of that handoff.

## Deferred functionality and references

Deferred: additional admin domains, theme switching, enrollment/password recovery, advanced charts,
multi-instance infrastructure and deployment. No speculative empty feature directories were added.
Read AGENTS.md, CLAUDE.md and [.agents/README.md](.agents/README.md) before editing.

References: [Next Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route),
[async cookies](https://nextjs.org/docs/app/api-reference/functions/cookies),
[Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents),
[official Hugeicons React setup](https://hugeicons.com/docs/integrations/react/quick-start).
