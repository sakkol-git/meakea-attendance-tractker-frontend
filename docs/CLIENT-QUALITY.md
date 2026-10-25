# Web client quality gates

These gates protect client behavior without claiming backend acceptance.

## Automated on every change

- Formatting, TypeScript, architecture, adapter and workflow tests.
- Explicit demo build configuration and refusal of an implicit demo release.
- Browser journeys against isolated demo and controlled remote-contract servers.
- Axe checks, keyboard-reachable controls and viewport overflow at phone, tablet and desktop widths.
- Raw production asset budgets: 1.5 MB total JavaScript, 500 KB largest JavaScript chunk, 80 KB CSS and 160 KB WOFF2 fonts. These are regression limits, not network-performance claims; deployment compression must be measured separately.
- A 300-line cohesion threshold for new TypeScript and Vue files. Six existing reviewed files are capped at their current size and must shrink when their responsibility is touched.

## Reviewed large-file exceptions

`api/workspace.ts` is the provisional feature facade; `data/demo.ts` and `data/business-demo.ts` hold synthetic state machines; workflow `catalog.ts` and `forms.ts` are declarative definitions; `pages/workflows/[id].vue` composes the generic workflow screen. Their current size is technical debt, not a template for new code. Split by feature or responsibility during related changes and lower the limit in `scripts/check-structure.mjs`.

## Manual before release

Run [client UAT](CLIENT-UAT.md), including keyboard-only use, 200% zoom, screen-reader checks, reduced motion, offline writes and stale conflicts. Measure compressed assets, first load and route transitions on the intended hosting platform. Record browser/version, viewport and evidence. Real identity, authorization and persistence remain backend gates.
