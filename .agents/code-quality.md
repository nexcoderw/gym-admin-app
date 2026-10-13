# Maintainability

## Mandatory requirements

Keep pages around 120 lines, components around 200 and services around 200 as review thresholds. Split by security or domain responsibility, not arbitrary line count. Use descriptive names and preserve existing legitimate changes.

## Prohibited patterns

No giant generic clients, unrelated rewrites, circular imports, hidden mutable request state or swallowing failures.

## Good example

Cookie contract verification stays separate from transport and route composition.

## Review criteria

Check each abstraction has demonstrated reuse, public scope is narrow, and errors remain safe.
