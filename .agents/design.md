# Design system

## Purpose

Keep the admin interface calm, readable and operationally truthful. Use the existing ink-blue dark
system rather than inventing a new visual language for each feature.

## Mandatory requirements

1. Use semantic tokens from `src/app/globals.css` for surfaces, text, borders, states, spacing,
   radii and motion. Add a missing reusable token deliberately; do not scatter new literal colors.
2. Use the existing readable system sans stack. Establish hierarchy through size, weight and space,
   not multiple decorative typefaces. Use tabular numerals for comparable operational counts.
3. Follow the 4px-based spacing scale through tokens. Use control radii for inputs/buttons and panel
   radii for containers; do not give every nested element the same oversized radius.
4. Name metrics according to the verified backend definition. Active staff means account status,
   not online staff, concurrent users or recent activity. Display only real validated values.
5. Give each screen one primary purpose and a clear main heading. Prefer useful labels, grouped
   information and restrained borders over decorative cards or meaningless visualizations.
6. Dark is the supported initial theme. Light mode requires a complete reviewed semantic token set
   and contrast review; never implement it by inverting colors.
7. Preserve visible focus and non-color status cues. Loading, error and empty states belong to the
   same design system as successful content.

## Do

```css
.value {
	color: var(--text-primary);
	font-variant-numeric: tabular-nums;
}

.label {
	color: var(--text-secondary);
	margin-block-start: var(--space-2);
}
```

Label a backend active-staff count "Active staff accounts", not "Staff online".

## Do not

```tsx
// WRONG: invents operational data and misrepresents its meaning.
<StatCard label="Staff online" value={summary.activeStaff || 125} />
```

No gradients, glassmorphism, decorative charts, fake trends or hardcoded component colors. Do not
show a plausible placeholder number when the backend failed.

## Prevented failures and review checklist

- Shared tokens prevent visual drift; honest labels prevent incorrect operational decisions.
- Review hierarchy at compact and desktop widths, contrast, focus and empty/error states.
- Check that every displayed metric has a documented backend meaning.
- See [styling.md](styling.md), [responsive.md](responsive.md) and [error-handling.md](error-handling.md).
