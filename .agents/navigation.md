# Navigation

## Purpose

Make destinations predictable and accessible without confusing link visibility with authorization.

## Mandatory requirements

1. Keep frontend URL constants in `src/constants/routes.ts` and one navigation definition in
   `src/constants/navigation.ts`. Do not duplicate menu arrays in desktop and mobile components.
2. Each entry has a stable key, clear label, frontend href, named Hugeicons reference and group.
   Include the required permission when the destination is restricted.
3. Filter using server-validated effective permissions. This is presentation only: every destination
   and BFF operation must independently authorize the request.
4. Use Next Link for internal navigation. Mark the active destination with `aria-current="page"`
   and a visible non-color-only treatment. Match paths deliberately so unrelated prefixes are not active.
5. Keep core navigation available at compact widths. Preserve logical focus order and a clear
   distinction between links that navigate and buttons that perform actions such as logout.
6. Redirect authentication flows only to fixed reviewed destinations. Do not accept arbitrary
   `returnTo`, external URLs, invented routes or backend paths from query parameters.

## Do

```ts
const overview = {
	key: 'overview',
	label: 'Overview',
	href: routes.dashboard,
	icon: DashboardSquare01Icon,
	requiredPermission: 'platform.dashboard.read',
	group: 'Platform',
} as const;
```

Use this shape in the existing registry; do not introduce a second registry for the example.

## Do not

```ts
// WRONG: user-controlled redirect destination.
router.push(searchParams.get('returnTo') ?? '/dashboard');

// WRONG: hides a link but does not protect the destination.
const authorized = navigation.some((item) => item.href === pathname);
```

Do not add dead links for future features or use an upstream Nest URL as a browser destination.

## Prevented failures and review checklist

- One registry prevents mobile/desktop drift and mismatched permission labels.
- Fixed redirects prevent open redirects and unexpected post-login destinations.
- Review stable keys, route existence, active matching, keyboard focus and mobile reachability.
- See [authorization.md](authorization.md), [icons.md](icons.md) and [responsive.md](responsive.md).
