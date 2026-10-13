# CSS Modules

## Mandatory requirements

Use globals only for tokens, reset and shared semantic utilities. Each styled component owns a CSS Module. Use semantic CSS variables for color, spacing, radius, shadow and motion. Prefer logical properties, grid/flex reflow, min-width:0, and content-driven breakpoints.

## Prohibited patterns

No Tailwind, CSS-in-JS, inline colors, pervasive !important, or selectors that leak into unrelated features.

## Good example

A card border is 1px solid var(--border); mobile columns collapse at the content breakpoint.

## Review criteria

Check specificity, overflow, reduced motion, consistent spacing and no duplicated literals.
