# Business workflow implementation progress

Source: parent `business-flow.md`, BF-001 through BF-040 and linked domain bodies.

## Completed

- Preserved the core client at b319544 and mapped all 40 source IDs, purposes and role boundaries to `/workflows/BF-NNN`.
- Added the searchable catalogue, all workflow screens and source coverage matrix.
- Added dated assignment/closure, half-day/holiday leave handling, future cancellation, exact adjustments, carry-over guards, conflict/inference review, draft editing/history, partial stock issuance, private local files, category preferences, reports/export lifecycle, and explicit ML/operations views.
- Kept unknown policy as a visible review gate. No arbitrary cross-year settlement or payroll finalization is adopted.
- Added `BusinessPort`, separated local demo state from the UI-facing API, and retained fail-closed remote integration.
- Verified formatting, types, 8 data tests, 86 unit/architecture tests and the production build with `npm run check`.
- Verified all 9 production-browser cases with `npm run test:e2e`, including all 40 workflow routes, axe accessibility scans, and phone/tablet/desktop overflow checks across the main workspace routes.
- Checked patch whitespace, visually reviewed screenshots and documented acceptance limits.

## Remaining external acceptance

No web screen from BF-001 through BF-040 remains unrepresented. Actual business API integration, production operator grants, unsettled policies, server transactions/event delivery, model training/publication, secure storage scanning/retention, and deployment acceptance remain external requirements. These are not presented as working backend capabilities. The previously recorded dependency advisory also remains a release gate.

For evidence and exact boundaries, open `BUSINESS-WORKFLOW-COVERAGE.md`, `VERIFICATION.md` and `INTEGRATION.md`.
