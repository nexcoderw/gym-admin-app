<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# NEXCODE Gym Admin instructions

Every coding agent MUST read `.agents/README.md` and all relevant topic rules before editing.
Read `.agents/prettier.md` before every authored code or configuration change. Match the committed
Prettier configuration and the formatted shared Button; do not invent manual alignment conventions.
Follow `.agents/git.md` and `.agents/agent-workflow.md` on every task. Humans execute scaffolding,
installation, formatting, linting, type-checking, tests, builds, servers, Git writes and deployment.
This project owns the superadmin frontend and explicit BFF adapters only. NestJS remains the source
of truth for platform sessions and effective permissions; Prisma belongs exclusively to gym-db.
When installed Next documentation is unavailable, inspect official version-matched documentation
and report the missing local installation; do not run an installation to bypass the restriction.
