# Web client UAT

Use this runbook for a repeatable client review before connecting a live backend. It validates the browser experience and synthetic workflow logic; it does not establish server authorization, persistence, tenant isolation or production integration.

## Setup and evidence

1. Run `npm ci`, copy `.env.example` to `.env`, and run `npm run dev`.
2. Use a fresh private browser window at `http://localhost:3000` for each role.
3. Test at 390 × 844, 820 × 1180 and at least 1440 × 900.
4. Record role, viewport, scenario, result and a screenshot for any failure. Refresh to reset in-memory demo changes.

## Role journeys

| Role     | Scenario                                                                                                     | Expected result                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Employee | Sign in, clock in, view history, clock out                                                                   | Current attendance and history update once; repeated commands do not create duplicates                                            |
| Employee | Create a half-day leave request with evidence, save a draft, edit and submit it                              | Required fields and evidence are enforced; the request advances from draft to submitted with the same terminology shown on mobile |
| Employee | Create a general or material request, attach a supported file, submit and cancel an eligible request         | Status, quantities and available actions remain consistent across list and detail views                                           |
| Manager  | Filter the approval inbox, inspect policy and age context, approve one item and reject another with a reason | Filters use zero-based paging; decisions require current data and show clear success or conflict recovery                         |
| Manager  | Create and cancel a delegation, then review team coverage                                                    | Self-delegation and overlapping dates are refused; calendar details have a usable non-color alternative                           |
| HR       | Create and edit an employee, assign a shift, add an attendance correction and adjust leave balance           | Typed catalog values persist; effective dates, reasons and resulting values are visible                                           |
| HR       | Approve and partially fulfill a material request                                                             | Requested, issued, remaining and stock values reconcile after each action                                                         |
| HR       | Start an attendance report export and download it after completion                                           | Queued, running, completed and failed states are understandable; download appears only when ready                                 |
| Owner    | Review organization settings, audit activity and role-restricted workflows                                   | Owner-only navigation is visible and employee-only or operator-only actions remain guarded                                        |

## State and accessibility pass

- Confirm every visited screen has a useful loading skeleton or progress state, empty message, recoverable error and success feedback.
- Disconnect the browser before a write. The client must explain that the action was not confirmed and must not invent success.
- Exercise a stale-version conflict. Preserve entered text, explain the conflict and offer a safe refresh or retry path.
- Complete all forms using only the keyboard. Confirm visible focus, logical order, accessible names, Escape behavior and no keyboard trap.
- At 200% browser zoom, confirm navigation, dialogs, tables, toasts and forms remain usable with no document-level horizontal overflow.
- Verify statuses include text or an icon in addition to color, and that validation identifies the field and correction.

## Completion record

Mark a scenario **automated** only when a named test covers it, **manual** after this runbook passes, or **blocked** when it needs a real API, production identity, device capability or representative user. A client-only pass cannot be promoted to production acceptance.
