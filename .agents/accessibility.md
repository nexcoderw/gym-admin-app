# Accessibility

## Mandatory requirements

Use semantic landmarks, one primary heading, visible focus, skip navigation and explicit input associations. Target WCAG 2.2 AA with 4.5:1 normal text contrast and 44px touch targets. Announce errors and loading without excessive live regions. Support keyboard-only and reduced-motion use.

## Prohibited patterns

No color-only status, hover-only actions, focus removal, unlabeled icons, or claiming compliance without testing.

## Good example

A skip link targets the main element; an error uses role=alert and aria-describedby.

## Review criteria

Check screen readers, zoom 200%, 320px reflow, contrast, focus, disabled state and axe results.
