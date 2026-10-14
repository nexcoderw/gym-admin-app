# NEXCODE Gym Admin

Private superadmin frontend foundation for admin.gym.rw; proposed repository: nexcoderw/gym-admin.
Next.js owns the UI and eleven explicit BFF adapters. NestJS owns authentication and effective
permissions. gym-db owns every schema and migration. No sibling project was changed.

## Organization management — Step 13

Implemented pages: `/organizations`, `/organizations/new`, `/organizations/[id]` and
`/organizations/[id]/edit`. List/detail pages read current authorized records through server-only
adapters, not self-HTTP. Registration creates PENDING records only, editing changes name only, and
activation/suspension require an explicit confirmation. No delete, archive, slug editing, tenant
login, owner/subscription data, permission provisioning or audit-history UI is included.

### Backend prerequisites are still blocking live mutations

The inspected gym-api module still binds `UnavailableOrganizationAudit`; mutations are therefore
blocked with `ORGANIZATION_AUDIT_UNAVAILABLE`. Step 12's DB checks, audit migration/triggers/grants,
durable provider and controlled permission provisioning must be reviewed and verified separately.
The five organization permissions have not been confirmed provisioned to an administrator. The
existing owner role is not expanded by this frontend. No frontend flag, fake data or role-name
shortcut enables unaudited writes. Reads also require independently provisioned read permission.
Mocked successful responses in authored tests are not live audit/database evidence.

### Registered endpoint contracts

All backend paths below have prefix `/api/v1/platform`; they exist only in guarded server adapters.
Browser components use the centralized frontend paths and same-origin cookies.

| Frontend BFF method/path | Backend method/path | Required permission suffix |
| --- | --- | --- |
| GET `/api/organizations` | GET `/organizations` | `read` |
| GET `/api/organizations/[id]` | GET `/organizations/:id` | `read` |
| POST `/api/organizations` | POST `/organizations` (201) | `create` |
| PATCH `/api/organizations/[id]` | PATCH `/organizations/:id` | `update` |
| POST `/api/organizations/[id]/activation` | POST `/organizations/:id/activation` | `activate` |
| POST `/api/organizations/[id]/suspension` | POST `/organizations/:id/suspension` | `suspend` |

The full permission names are `platform.organizations.<suffix>`. Each adapter checks a live Nest
session and its exact permission before calling the organization operation. Pages enforce their
own permission independently; edit also needs read permission to load its current record. Navbar
visibility uses effective permissions and stays active for nested routes, but does not authorize
anything. Expiry/revocation follows existing fixed-login recovery; confirmed BFF 401 responses clear
only supplied platform cookies. Service outages do not falsely log an administrator out.

Requests and responses use strict browser-safe Zod contracts. Name normalization/Unicode bounds,
slug grammar and all 31 reserved names match the inspected Nest DTOs. Create sends only name/slug;
update sends only name. Unknown fields, malformed UUIDs, duplicate/unknown query fields and invalid
If-Match values fail before the organization request. POST/PATCH validate exact Origin and CSRF
before reading/forwarding input, using the existing timing-safe cookie proof. Arbitrary browser
Authorization, permission, actor, URL and query headers are not forwarded.

List state is shareable through limit (default 20, max 50), status and optional UUID cursor.
Ordering remains Nest's createdAt descending / UUID ascending; next results use the returned
nextCursor with the same filter. Changing the status clears the cursor. Restart returns the first
result set without inventing page numbers or downloading every organization. Invalid/expired
cursors show recovery, never an empty registry. Zero items appears only after a validated success.
Native controls and the responsive list keep essential actions available at 320px; registered date
is hidden on smaller lists but remains in details. Dates display in Africa/Kigali.

Detail GET requires a valid ETag exactly quoting the returned canonical UTC updatedAt. Name editing
preserves that ETag and sends If-Match; 412 means stale organization, **not** MFA enrollment.
Authentication's existing 412 interpretation remains unchanged. Stale edits require reload, not
automatic resubmission. Activation is PENDING/SUSPENDED → ACTIVE, suspension ACTIVE → SUSPENDED.
The dialog names the gym, focuses Cancel, contains keyboard focus natively, restores trigger focus
and supports Escape except while a request is pending. It re-reads the latest version before sending
expectedUpdatedAt; a changed version requires a new confirmation. These transitions do not grant
subscriptions, provision a domain, cancel billing or delete members.

Shared transport now supports PATCH, exact 201, allowlisted query/If-Match and validated ETag without
removing redirects, no-store, timeouts, cookie allowlists or JSON bounds. Organization Set-Cookie
headers are rejected, not relayed. Only allowlisted domain codes distinguish slug conflict,
lifecycle conflict and incomplete audit setup; raw provider messages/SQL/hosts never reach the UI.
Every button uses Hugeicons and the same shared loading treatment; Button accepts a native React 19
ref solely for dialog focus management. The light palette, fonts and existing component system are
unchanged. No installs or package/lockfile changes were needed.

Pending submissions are guarded synchronously as well as visually. Success navigation requires the
expected status and validated response. An ambiguous registration/network outcome disables another
submission and directs the administrator to review the registry; there is no automatic POST retry
or reload-to-retry button. Unknown outcomes must be reconciled before attempting another creation.
Late responses from an unmounted form cannot navigate or update its state.

### Human verification (not executed by the agent)

From app/admin, format only the changed areas and inspect the diff:

```bash
cd /Users/dvniels/Desktop/projects/gym/app/admin
npx prettier --write src/lib/contracts/organizations.ts src/lib/server/http/upstream.ts src/lib/server/organizations-access.ts src/lib/server/organization-pages.ts src/lib/server/endpoints/organizations src/lib/client/mutations.ts src/constants/routes.ts src/constants/navigation.ts src/components/shared/button.tsx src/components/shared/navbar.tsx src/components/organizations src/app/organizations src/app/api/organizations test/components.test.tsx test/organization-fixtures.ts test/organizations-contracts.test.ts test/organizations-routes.test.ts test/organizations-pages.test.ts test/organizations-ui.test.tsx test/e2e/organizations.spec.ts README.md
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover strict contracts, each fixed operation/permission, Origin/CSRF rejection, forged claims,
expired/rejected sessions, safe errors, PATCH/201/ETag, cookie rejection, pages, empty/real rows,
filter/cursor behavior, duplicate prevention, stale editing, modal focus, lifecycle confirmation
and audit-unavailable registration. Existing auth/dashboard tests remain regression coverage.
No tests, build, formatting, browser automation or database commands were executed by the agent.

Browser verification requires human-started admin (4000) and an approved development/test backend
(3000) with matching admin Origin/cookie mode. Complete Step 12 permissions before using protected
organization pages. Use a fictional gym and an approved test administrator, never production
credentials. Record a fresh test login/MFA session privately through the existing browser tooling:

```bash
npx playwright codegen --save-storage=/private/tmp/gym-admin-organization-session.json http://localhost:4000
chmod 600 /private/tmp/gym-admin-organization-session.json
PLAYWRIGHT_ORGANIZATIONS_STORAGE_STATE=/private/tmp/gym-admin-organization-session.json npm run test:e2e -- test/e2e/organizations.spec.ts
```

Close codegen after successful test login/MFA. Its credential-bearing storage file and retained
traces must stay private/uncommitted and be removed by the human when no longer required. Refresh
the session when expired. Missing test-session configuration fails protected scenarios explicitly,
not as a silent skip. The focused browser test mocks only the browser's organization mutation
response; initial server-page/session/permission checks remain real. It verifies unavailable-state
presentation and responsive keyboard use, not real mutation/audit persistence.

Manual acceptance after backend prerequisites: inspect filtered/empty/next-cursor lists; register
Soho Gym with a unique nonreserved slug; verify real 201 and returned detail UUID; rename using a
current ETag; change the same gym in another window and confirm stale saves cannot overwrite it;
check each lifecycle confirmation and invalid transition; remove a test permission/revoke the test
session and confirm direct page/BFF rejection; inspect at 320/768/1440px and 200% zoom with keyboard
and screen reader. Verify actual durable audit rows through an authorized backend/database review,
not this UI. Do not declare production readiness until that separate evidence exists.

## Inspection and scope

The existing scaffold declares Next.js 16.4.0 and React 19.3.0, App Router, TypeScript and no
Tailwind. Initially there was no node_modules, lockfile or Git repository, so no branch/latest
commits or installed Next docs were available. Existing framework versions and the generated Next
agent-instruction block were preserved. Official version-matched documentation was consulted.
After installation, read node_modules/next/dist/docs before subsequent framework changes.

Implemented: responsive light login/MFA and dashboard shells; shared Button/Input/Card/navigation;
real aggregate summary presentation; fixed typed BFF endpoints; strict validation; host-only cookie
relay; safe errors; loading, error and not-found states; authored tests and engineering rules.
Organization registry management is implemented as described in Step 13 below. No fake metrics,
gym staff CRUD, billing, payments or subscriptions are implemented.

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
| /api/auth/mfa/email | auth/send-email-otp.ts | PlatformAuthController.sendEmailOtp; PlatformEmailOtpRequestDto | POST, Origin + CSRF; challenge -> safe send confirmation, no cookies |
| /api/auth/mfa/verify   | auth/verify-mfa.ts                    | PlatformAuthController.verifyMfa; PlatformMfaVerifyDto              | POST, Origin + CSRF; challenge/TOTP or recovery code -> safe confirmation |
| /api/auth/session      | auth/get-session.ts                   | PlatformAuthController.getSession; PlatformSessionResponseDto       | GET, live session -> own safe identity and effective permissions          |
| /api/auth/logout       | auth/logout.ts                        | PlatformAuthController.logout                                       | POST, Origin + CSRF -> idempotent 204 and cookie clearing                 |
| /api/dashboard/summary | dashboard/get-summary.ts              | PlatformDashboardController.getSummary; PlatformDashboardSummaryDto | GET, live session + platform.dashboard.read -> actual aggregate counts    |

Confirmed upstream paths: /api/v1/platform/auth/login, /api/v1/platform/auth/mfa/email, /api/v1/platform/auth/mfa/verify,
/api/v1/platform/auth/session, /api/v1/platform/auth/logout and /api/v1/platform/dashboard/summary.
The dashboard was confirmed in backend source, not assumed from a roadmap. Endpoint modules own
fixed paths/methods and schema mapping. Shared non-secret DTO schemas live in lib/contracts; response
object schemas strip unknown fields rather than relaying internal payload extensions.

Successful password submission navigates from `/login` to `/verification`. Both pages independently
check the live server session and redirect already authenticated users to `/dashboard`. A scoped
auth layout keeps the short-lived challenge in React memory only; restarting, expiry or successful
verification clears it. Reloading or opening `/verification` directly without that challenge returns
to `/login`. No challenge is persisted in URLs, browser storage or cookies.

Verification presents Authenticator first and selected by default when offered, followed by Recovery
code and Email code on one row. Only methods advertised by Nest appear. The Open platform and
Start sign-in again actions share one row, including compact screens. Selecting a method never sends
an email: use the explicit Send email code button.
Shared loading indicators, duplicate-send protection and a cooldown apply. The form submits
`emailOtpCode`, then confirms a live backend session before navigation. Email delivery is not
authentication. Resend configuration lives only in Nest, and enabling this weaker fallback requires
the reviewed DB migration and rebuilt DB package. Authenticator/recovery login remains unchanged
when Nest does not advertise email. A backend 503 remains a safe 503; temporary service failures
preserve cookies, while only a confirmed session 401 clears them.

To register another operation: inspect the actual Nest controller/DTO; add its contract; add one
server-only operation with a literal path/method; add one independently protected route.ts; add a
frontend path constant if needed; test negative cases; update this table. Do not add arbitrary
forwarding, reset-password or domain endpoints that do not exist.

## Cookie, CSRF and permission boundary

The browser calls the admin BFF only. Adapters use a configured trusted Nest origin, no-store fetch,
redirect rejection and a 20-second timeout. The deadline accommodates the API session's bounded
5-second transaction acquisition and 10-second execution limits, with transport headroom. These are
failure bounds, not latency targets; slow queries and pool contention still require investigation.
Only platform cookies, the configured approved Origin, JSON headers and the validated CSRF header
are forwarded. Browser role/tenant/forwarding headers
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

`/login`, `/verification` and `/401` check the live Nest session on the server before rendering. A valid session
redirects to `/dashboard`; only a confirmed 401 allows anonymous authentication UI. Network failures,
rate limits, or service outages surface as errors, not logout. Future authentication pages must use
the same `requireAnonymousSession` guard. The session-read BFF expires both local platform cookies on
401, preserving HttpOnly/Secure/SameSite attributes; it does not clear them on an upstream outage.
While the dashboard is open, a lightweight lifecycle check runs at the known absolute expiry and on
tab visibility/focus. It does not poll in the background, which would extend the backend idle window.
Absolute expiry is scheduled; idle expiry and revocation are detected on focus or the next protected
request. Browser timers can be delayed in suspended tabs. Nest remains authoritative for every
protected operation, including when JavaScript is disabled or the network is unavailable.

## Recovery, empty states, and branding

The shared state panel provides centered, responsive SVG illustrations for missing pages, sign-in,
permission denial, rate limiting, failures, and confirmed empty staff results. Decorative
illustration wrappers have one short entrance animation; reduced-motion users receive a static
illustration. Retry actions use the existing shared Button loading treatment. Navigation uses real
links with the same visual style, not buttons nested inside links. No unavailable data is rendered
as zero, and no future staff-creation endpoint is invented as an empty-state action.

Visit `/401`, `/403`, `/404`, `/429`, `/500`, and `/503` to inspect the designs. `/404` invokes the actual
Next not-found boundary; the other numbered routes are informational recovery pages, not middleware
that sets those HTTP statuses. Actual API/BFF statuses remain unchanged. Anonymous dashboard requests
still redirect to `/login`. Full-page recovery states use a standalone, centered canvas without the
sidebar or topbar, including organization permission denials and route error boundaries. Protected
layouts retain their live session checks and lifecycle handling; only successful pages render the
workspace shell. Organization recovery actions share one centered, responsive action group rather
than placing a restart button below the state. Loading fallbacks provide their own main landmark
with just a centered 18px spinner and one compact status heading. They omit the logo, illustration,
explanatory paragraphs and actions. The status is announced politely; the CSS-only spinner stops
for reduced-motion users. Button loading remains unchanged and consistent across actions.
In-form validation and mutation errors remain inline so users do not lose their input. Root and
dashboard error boundaries prefer Next 16.4 `retry()` with legacy `reset()` compatibility. Fatal root
layout errors have an independent document with the same light styles and two font families.

The NEXCODE brand uses a custom white N monogram with a blue signal detail, paired with an Albert Sans
wordmark. `public/nexcode-mark.svg` is used on login, recovery pages, and the workspace shell.
`src/app/icon.svg` contains the matching browser mark; Next automatically registers it as the favicon.
Keep both SVG geometries aligned when updating the mark. Brand colors are fixed asset colors, while
component presentation uses semantic tokens. Browser favicon caches may require a hard reload.

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

## Step 9 authentication integration

The five fixed BFF operations remain: POST login (200 challenge), POST MFA verification (200 safe
confirmation), GET session (200 safe principal), POST logout (204) and GET summary (200 aggregates).
Each maps to the corresponding `/api/v1/platform/...` Nest operation through its server-only module.
Login never creates a session. MFA requires exact Origin and matching CSRF; session and summary
require live backend identity, and summary additionally requires `platform.dashboard.read`.
`platform.owner` alone is not an authorization bypass. DTO validation, expected upstream status,
bounded JSON, no-store and safe errors remain enforced; no generic proxy or browser API origin was
introduced. Expired/revoked sessions produce authentication recovery, denied permissions produce
403, and outages/rate limits do not fabricate statistics or successful logout.

MFA now validates the newly issued session through the fixed BFF before navigating. If confirmation
temporarily fails, Open platform retries only the session read, not the already consumed MFA code.
The verification input is disabled and cleared after issuance. Browser requests have a 25-second
deadline, beyond the BFF's 20-second upstream deadline; there are no automatic credential retries
or added background polls. Dashboard guards still independently revalidate the session/permission.
Existing absolute-expiry, focus revalidation and authenticated redirects away from auth pages remain.

For HTTPS `admin.gym.rw` → `api.gym.rw`, cookies are validated and reissued host-only on the admin
host, never widened to `.gym.rw`. Session cookies use `__Host-`, Secure, HttpOnly, Path=/ and
SameSite=Strict. CSRF cookies deliberately remain readable, with matching mode and expiry. Local
HTTP uses the existing unprefixed/non-Secure mode on both sides. Cookie relay validates the entire
allowlisted set before writing and rejects unknown/duplicate names and attributes, Domain, wrong
mode, missing expected cookies and invalid expiry. Logout confirms upstream revocation before
clearing; confirmed session 401 clears local credentials, while 429/5xx preserve them. Session
tokens must never appear in JSON, storage, logs or screenshots.

### Human-operated full-stack smoke test

This is separate from mocked Vitest/Playwright coverage. No live result is claimed.

1. Resolve the API's missing gym-db lockfile entry and approved artifact first, as documented in its
   README. Review actual migration status, grants and connected identity before starting services.
2. Use an approved isolated, empty non-production database with a fictional owner you control.
   Keep ordinary development, shadow and destructive test databases separate, even when they share
   a Neon development branch. Configure the existing API runtime/bootstrap profiles to that same
   intended database; verify host, database, least-privilege role and provisioned marker. Do not
   reuse the opt-in bootstrap test database while automated tests can delete its fixtures.
3. If no fictional account exists, provisioning is a human prerequisite. Only on the approved empty
   target run the existing first-owner CLI below; do not rerun initialization against an existing
   owner, reset credentials, disable guards or edit production data to make this check pass:

   ```bash
   cd /Users/dvniels/Desktop/projects/gym/api/api
   npm run build
   PLATFORM_OWNER_BOOTSTRAP_ENABLED=true npm run bootstrap:platform-owner:init
   PLATFORM_OWNER_BOOTSTRAP_ENABLED=true npm run bootstrap:platform-owner:activate
   ```

   Complete exact database confirmation, independent mailbox verification and real authenticator
   enrollment/activation. Use a new compliant password. Store secrets/recovery codes privately,
   not in this README, shell arguments, exported logs or test artifacts. Wait for a new TOTP time
   step after activation; the activation code cannot be replayed for login. Disable bootstrap after
   completion and verify the regular runtime target is unchanged.

4. Run API checks, then start the API in one terminal:

   ```bash
   cd /Users/dvniels/Desktop/projects/gym/api/api
   npm run start:dev
   ```

5. Configure admin's server-only API origin to `http://127.0.0.1:3000`, admin origin to
   `http://localhost:4000`, and both projects' local cookie mode consistently. In a second terminal:

   ```bash
   cd /Users/dvniels/Desktop/projects/gym/app/admin
   npm run dev
   ```

6. Open a private browser at `http://localhost:4000/login`. Verify anonymous dashboard access
   redirects there. Test invalid email, too-short password and wrong credentials with safe messages.
7. Submit the fictional account's real password. Verify a challenge appears but no session cookie,
   dashboard data or authenticated navigation occurs yet. Inspect only metadata, not secret bodies.
8. Submit a current authenticator code. Verify MFA 200 is followed by session 200 before dashboard
   navigation. Check host-only HttpOnly session and readable CSRF cookie metadata, no tokens in
   storage/JSON, and only frontend-owned `/api/...` requests in browser Network.
9. Check actual summary counts against the isolated database; refresh and visit login/401/auth
   routes while authenticated. They must redirect to dashboard without flashing login controls.
10. Exercise recovery-code login with one approved code; verify consumption prevents reuse. Test
    incorrect/expired MFA challenges and CSRF mismatch without disabling guards.
11. Verify logout succeeds, clears cookies and prevents dashboard access. Separately simulate an
    API outage: session/dashboard must show safe recovery, and failed logout must not claim success.
12. With separately authorized fixture administration, test expired/revoked sessions and removal of
    `platform.dashboard.read` on a fictional account. Next protected request must enforce 401/403,
    even with role `platform.owner`. If those fixtures/administration are unavailable, record these
    live cases as blocked; do not invent an API for changing permissions or mutate a real owner.
13. Exercise 429 on the isolated target at a controlled rate; account for shared BFF-peer limits.
    Verify safe recovery without clearing a valid session. Never load-test production here.
14. Repeat cookie metadata checks on an approved HTTPS staging deployment using production mode.
    Local non-Secure tests do not prove real `admin.gym.rw`/`api.gym.rw` cookie interoperability.

After normal checks and a human-started Next server, run `npm run test:e2e` in a third terminal.
The new browser case mocks only frontend HTTP responses; it verifies no navigation during a failed
session confirmation and no MFA replay. It does not prove real PostgreSQL/MFA authentication.
Record only pass/fail, safe status codes and non-secret request IDs; never share HAR files, cookies,
passwords, MFA/recovery material or terminal enrollment output. Clean up only the specifically
approved isolated fixture through the human's established procedure, not automated broad deletion.

Release blockers remain until the approved database artifact/lockfile, current migration status,
fictional fixture, real smoke results and deployment limiting topology are verified. This step adds
no schema, new endpoints, public recovery, distributed limiting or Step 10 functionality.
