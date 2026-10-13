# Naming

## Mandatory requirements

Use kebab-case authored files, PascalCase React components, camelCase functions, and explicit operation names. Next reserved files retain their framework names. Colocate name.module.css with styled components. Use .test.ts/.test.tsx and .spec.ts for Playwright tests.

## Prohibited patterns

No ambiguous data.ts/helpers.ts, duplicated component names, or renaming Next reserved routes.

## Good example

auth/login-form.tsx exports LoginForm and imports login-form.module.css.

## Review criteria

Check file and identifier conventions, casing on Linux, and descriptive operation ownership.
