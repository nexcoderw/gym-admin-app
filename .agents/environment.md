# Environment configuration

## Purpose

Keep deployment configuration server-only, validated and explicit. Environment labels do not prove
a database, origin or cookie mode is safe.

## Mandatory requirements

1. Read `GYM_API_BASE_URL` and `ADMIN_ORIGIN` only through the server environment module. Add
   `server-only` to server configuration modules. Never expose upstream configuration via
   `NEXT_PUBLIC_` or serialize it into client props.
2. Validate origins as origins: correct scheme, no embedded credentials, path, query or fragment.
   Production requires HTTPS. HTTP is for explicitly supported local development only.
3. Configure the admin origin to match Nest's `PLATFORM_ADMIN_ORIGIN` exactly, including scheme and
   port. Do not infer trusted configuration from the incoming Host header.
4. Cookie mode follows `NODE_ENV` and must agree with Nest's `PLATFORM_AUTH_COOKIE_SECURE` behavior.
   Do not silently downgrade secure cookies in production or introduce a browser-controlled override.
5. Track only fictional environment examples with descriptions. Real `.env.local`, credentials,
   deployment secrets and backup environment files remain ignored and uncommitted.
6. Missing or malformed required configuration must produce a safe failure, not a production-looking
   default or an accidental request to another environment.
7. Changing deployment origin requires reviewing CORS/Origin, cookie behavior, redirects and reverse
   proxy configuration together. Do not edit live secrets as an incidental frontend change.

## Do

Illustrative local-only example; the local backend must really use the corresponding origin:

```dotenv
GYM_API_BASE_URL=http://localhost:4000
ADMIN_ORIGIN=http://localhost:3000
```

The frontend is not a database client and does not need a Prisma database URL.

## Do not

```dotenv
# WRONG: exposes internal upstream configuration in the browser bundle.
NEXT_PUBLIC_GYM_API_BASE_URL=https://internal-api.example.invalid
```

Do not commit a real connection URL in a template or fall back to a production API when local config
is missing. Do not treat `NODE_ENV=development` as proof an external resource is disposable.

## Prevented failures and review checklist

- Validated origins prevent SSRF, malformed requests and cross-environment mistakes.
- Exact admin/Nest agreement prevents CSRF and cookie contract failures.
- Confirm ignored files, fictional examples, no browser imports and safe missing-config errors.
- See [security.md](security.md), [authentication.md](authentication.md) and [dependencies.md](dependencies.md).
