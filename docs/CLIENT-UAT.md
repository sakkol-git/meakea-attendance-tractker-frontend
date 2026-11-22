# Web client UAT

Use this runbook for a repeatable client review before connecting a live backend. It validates the browser experience and synthetic workflow logic; it does not establish server authorization, persistence, tenant isolation or production integration.

## Setup and evidence

Attachment recovery: interrupt the attachment-list read, use Retry attachments, and confirm a failed list is not described as empty. During a private download, the download controls should show progress and remain disabled until the outcome is known. A failed download must show its error and enable an explicit retry. Uploads announce activity without estimating a percentage. Password editing remains stable while saving; lookup retry buttons must never submit their surrounding form.

In the synthetic demo, confirm and decline a proposed attendance session in separate fresh sessions. Each action should remove the reviewed proposal from the pending card. This checks the existing proposal/version workflow; it does not prove a remote attendance-inference provider exists.

For the Approvals toolbar, change search, status, waiting time and sort, then choose Clear filters. Confirm all four return to their defaults and the result count updates for the selected category. On phone, tablet and desktop widths, labels must remain visible and controls must fit inside the filter panel. Attendance issue counts describe pending items on the current page.

1. Run `npm ci`, copy `.env.example` to `.env`, and run `npm run dev`.
2. Use a fresh private browser window at `http://localhost:3000` for each role.
3. Test at 390 × 844, 820 × 1180 and at least 1440 × 900.
4. Record role, viewport, scenario, result and a screenshot for any failure. Refresh to reset in-memory demo changes.

## Home attendance

- On Home, verify the workday state before and after clocking. If today’s attendance fails to load, the card should show the available support reference and **Retry attendance**. Retrying reads the day before offering a clock action.

## Inbox preferences

- Select **Unread only**, visit Preferences, and return to Your updates. The filter should stay selected until you switch accounts. If marking an update as read fails, its unread action and the support reference should remain available.

## Search and returning to lists

- To exercise page search, start the web instance with `NUXT_PUBLIC_PAGE_SEARCH=true`. Use the search button, Ctrl+K or ⌘+K. Search for Attendance, open it with Enter, then repeat and close with Escape. Check that focus returns to the opening control and an employee cannot find administrative pages. Set the flag to false to restore the original search.
- Select dates on Attendance. Navigate away and return within the workspace. The selected filters should survive navigation and clear when the account changes. An inverted attendance date range should keep both entries and explain which date to correct.

## Form lookup recovery

- Interrupt leave-type, leave-preview, material, department, position, manager and work-site reads. Use the corresponding Retry control and confirm entered form values remain available and no save command is sent.
- Review empty catalogs and the available recovery guidance. Check schedule field errors with keyboard and assistive technology.
- Verify the workspace header on Your updates, My profile, Settings, Approval delegation and the access restriction page.

## Import and delegation recovery

- Replace a populated CSV with an empty file. The old rows must disappear and Import must be disabled. Select files using Enter and Space, including choosing the same file again.
- While import is running, confirm the selected file and dialog remain stable. Read progress and completion with assistive technology.
- Simulate an unavailable delegation reviewer list, retry in place, and preserve the dates and reason. A failed cancellation must show feedback on the list.
- Navigate the attendance session list, CSV preview and chart legend with the keyboard. Confirm visible focus and meaningful status announcements.

## Final UX batch acceptance

- Change notification preferences and confirm the unsaved state is visible. During save, editing is unavailable; a failed save retains your choices. Expand and cancel profile editing with the keyboard.
- Switch the team calendar between Month and Accessible list. Confirm the selected view is exposed, dates include the year, and a failed department lookup offers Retry.
- Import a CSV with six data rows, including an invalid sixth row. The preview identifies its five-row/four-column limit; expand row issues to find the sixth-row error. Only valid rows are imported, and the result separately reports skipped rows and server failures. Correct the source file before selecting it again; avoid re-importing records already created.
- Read chart category counts alongside percentages, page ranges, long reference names and multiline reasons. Check narrow screens and keyboard focus in both appearances.
- These are manual acceptance steps. Automated demo and mock-provider coverage does not establish deployed business acceptance.

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
