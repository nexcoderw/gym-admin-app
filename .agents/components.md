# Components

## Mandatory requirements

Keep Button, Input, Card and application shell reusable, accessible and small. Domain UI composes primitives without teaching primitives about permissions or backend paths. Prefer composition and explicit props; forward native HTML semantics and allow disabled/loading states.

## Prohibited patterns

No heavy UI frameworks, giant configurable components, shared feature services, copied widgets, or clickable divs.

## Good example

Input associates its label, hint and error IDs with one native input; Button retains native disabled semantics.

## Review criteria

Check accessible names, component CSS ownership, keyboard behavior, responsibility and file size.
