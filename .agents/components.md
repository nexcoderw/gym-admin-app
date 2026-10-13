# Components

## Purpose

Build small, accessible primitives and compose them into feature UI. Shared components provide
presentation and native behavior; they do not own authentication policy or backend transport.

## Mandatory requirements

1. Reuse the existing Button, Input, Card and shell before introducing another primitive. Put shared
   primitives in `components/shared`; keep login/dashboard-specific UI in its feature directory.
2. Use native HTML semantics and type props from the corresponding React HTML attribute interface.
   Preserve caller attributes, accessible names, input associations and expected button behavior.
3. Default ordinary buttons to `type="button"`; use explicit `type="submit"` inside forms. Pending
   buttons must prevent duplicate interaction and expose their busy state without removing their name.
4. Prefer children and explicit small variants over collections of booleans. Keep feature permission
   checks out of shared primitives. Do not make Button understand dashboard roles or upstream paths.
5. Colocate a component's CSS Module. Keep server-renderable presentation server-compatible; add
   `'use client'` only when browser APIs, hooks or event handlers require it.
6. Review components around 200 lines for responsibility splits, not mechanical fragmentation.
   Preserve useful native behavior when extracting a wrapper.

## Do

```tsx
<>
	<Button type="submit" pending={pending}>
		Sign in
	</Button>
	<Card>
		<h2>Platform staff</h2>
		<p>{activeStaffCount}</p>
	</Card>
</>;
```

The feature owns the meaning of the count and submission; the primitive owns visual treatment.

## Do not

```text
// WRONG: non-native action and feature policy embedded in a primitive.
<div onClick={submit}>Sign in</div>
<Button isOwner isDashboard isCompact isSpecialAuth />
```

Do not duplicate primitives, add a heavy UI framework, spread unknown props onto DOM nodes or replace
a native disabled attribute with appearance alone.

## Prevented failures and review checklist

- Native semantics prevent broken keyboard interaction and inaccessible action controls.
- Feature-independent primitives prevent circular imports and permission-policy drift.
- Check prop typing, default button type, busy/disabled behavior, names and CSS ownership.
- See [accessibility.md](accessibility.md), [styling.md](styling.md) and [code-quality.md](code-quality.md).
