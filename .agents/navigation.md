# Navigation

## Mandatory requirements

Centralize frontend route constants and a single navigation definition with stable key, label, href, Hugeicons reference, optional requiredPermission and group. Filter using validated permissions and mark active location. Keep routing predictable on mobile and desktop.

## Prohibited patterns

No duplicated nav arrays, upstream paths, unsafe returnTo parameters, fake destinations or hidden-link authorization.

## Good example

Overview maps to /dashboard and requires platform.dashboard.read.

## Review criteria

Check stable keys, aria-current, focus order, active state and safe fixed redirects.
