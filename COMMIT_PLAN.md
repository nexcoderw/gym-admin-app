# Per-file Git handoff

This project had no Git repository at inspection. These are human-run commands, not executed results.
Run installation and all verification commands in README.md first. Review the complete source and
actual npm-generated manifest/lockfile. From app/admin, initialize with `git init -b main` only if you
intend to create this repository. No remote or push is configured here.

All initial source files are included because a new repository has no tracked files. The lockfile
pair below is for the real package-lock.json produced by the required human npm installation; do not
fabricate it or run that pair before it exists. It is consecutive with package.json as required.
Rule files form one uninterrupted group. CSS/contracts/providers precede their consumers and tests.
No generated next-env.d.ts, .next output, real dotenv files or credentials may be committed.

```bash

```

If you change additional files during human verification, inspect them and add a separate reviewed
commit pair. Never use `git add .`, force-push, or publish the proposed remote automatically.
