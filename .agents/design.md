# Design system

## Mandatory requirements

Use the ink-blue dark token palette and one readable system sans family. Apply a 4px spacing scale, restrained borders, tabular numerals for real counts, and radii by control hierarchy. Keep dashboard labels semantically accurate; active staff is not online staff. Dark is the supported initial theme; adding light mode requires a complete reviewed token override, not inverted colors.

## Prohibited patterns

No gradients, glassmorphism, decorative charts, fake counts, hardcoded component colors, or unlabeled status colors.

## Good example

A statistic uses var(--text-primary), tabular-nums, and a plain-language account label.

## Review criteria

Check hierarchy at 320px and 1440px, text contrast, focus visibility, reduced motion, and zero invented metrics.
