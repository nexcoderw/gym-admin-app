# Formatting

## Mandatory requirements

Use tabs, width 100, single quotes, semicolons, trailing commas and LF in authored TS/JS/CSS. Let Prettier choose syntax-specific formatting for JSON/Markdown. Humans run format and inspect the diff; exclude generated output and lockfiles.

## Prohibited patterns

No agent formatting commands, mixed indentation, generated-file edits or broad unrelated formatting.

## Good example

A colocated CSS Module and its TSX component share the committed formatter configuration.

## Review criteria

Check formatter configuration, deterministic output, scoped changes and human-provided results.
