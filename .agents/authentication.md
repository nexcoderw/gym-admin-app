# Platform authentication

## Purpose and trust boundary

Reuse Nest's password → MFA → server session flow. This frontend displays and adapts that flow; it
must not create a second authentication system or decide whether credentials are valid.

## Mandatory requirements

1. A successful password step produces a short-lived MFA challenge, not an authenticated session.
   Keep the challenge only in temporary component state. Do not render protected data at this step.
2. Verify MFA through the fixed BFF operation with the required CSRF proof. Only Nest establishes
   the session. Return allowlisted safe response fields, never session tokens in browser JSON.
3. Validate backend Set-Cookie values before reissuing them for the frontend host. A host-only cookie
   issued by `api.gym.rw` does not automatically reach `admin.gym.rw`. Do not widen Domain to fix it.
4. Session cookies must be HttpOnly. The CSRF cookie is intentionally browser-readable so the client
   can send its proof. Validate names, Path, SameSite, Secure, lifetime and deletion semantics.
5. Production secure cookies and `__Host-` naming must match Nest's configured cookie mode.
   Local development names must also match. An attribute mismatch fails closed; do not downgrade it.
6. Resolve current sessions through Nest. Treat expiry, revocation and suspension as authentication
   failures. Never accept a decoded browser claim or a remembered successful login as current proof.
7. Confirm logout upstream before reporting success and clearing the corresponding frontend cookies.
   If logout fails, show a safe failure; do not falsely claim the backend session was revoked.

## Do

```text
Password submission
  → fixed login BFF operation
  → temporary challenge + CSRF proof
  → fixed MFA verification operation
  → validated host-only cookies
  → live session read
  → protected destination
```

Expose only the fields needed for the UI and discard the challenge after success or restart.

## Do not

```ts
// WRONG: a challenge is not a session; tokens must not go into browser storage.
localStorage.setItem('session', loginResponse.challengeToken);
router.push('/dashboard');
```

Do not blindly relay Set-Cookie, forward a browser-selected Origin, introduce bearer-token storage,
or create frontend credential records. Do not put TOTP secrets or recovery codes into logs.

## Prevented failures and review checklist

- Separating challenge and session prevents bypassing MFA.
- Host-only validated cookies prevent cross-subdomain leakage and cookie contract drift.
- Check local/production modes, expiry, logout failure, rejected cookie attributes and revocation.
- Report backend password-policy mismatches instead of masking them with client validation.
- See [security.md](security.md), [authorization.md](authorization.md) and [environment.md](environment.md).
