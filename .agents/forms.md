# Forms

## Mandatory requirements

Use native forms with visible labels, autocomplete, server validation and accessible error summaries. Validate client inputs for guidance but repeat strict validation at the BFF. Disable duplicate submission, announce pending/errors, preserve non-secret useful input and clear passwords after submission. Match the confirmed backend DTO.

## Prohibited patterns

No placeholder-only labels, logging credentials, disabled password-manager support, or an assumed eight-character login policy when backend requires twelve.

## Good example

Email uses autocomplete=username; password uses current-password; TOTP uses one-time-code and inputmode=numeric.

## Review criteria

Check keyboard submission, errors, recovery-code mode, expired challenge, payload bounds and password-manager behavior.
