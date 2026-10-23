# Feature coverage

Status describes the web client only. “Demo exercised” is not proof that an HR backend exists or that its security is correct.

| Area | Available UI and behavior | Acceptance boundary |
| --- | --- | --- |
| Workspace | Desktop sidebar, mobile modal navigation, page finder, profile menu, demo role selector, offline notice | Role selector exists only in local mode; no offline writes or queued success |
| Session | Sign-in form, session restore, memory-only access token, single-flight refresh, logout and role navigation guards | Identity endpoints, CSRF bootstrap and secure cookie lifecycle require backend acceptance |
| Overview | Live workspace clock, check-in/out, balances, upcoming dates, requests and updates | Demo clock writes are real simulation state, not HR records |
| Attendance | History, workspace-day date filters, durations, report issue form and correction status | No geofence, face verification, payroll rounding, lateness or overtime claims |
| Time off | Balances, searchable/filterable lists, validated request form, detail, cancel, approve/reject with reason | Demo Monday–Friday calculation and entitlements are illustrative; server owns approved policy and ledger |
| Workplace requests | Draft, submit, cancel, approve/reject, equipment fulfillment and version checks | Approval routing and material reservation/stock accounting belong to server |
| Approvals | Role-restricted inbox categories, request details, correction confirmation and rejection reason | Server must enforce separation of duties and tenant/manager scope |
| People | Directory, search, detail, create, edit and deactivate confirmation | No automatic account creation or offboarding cascade; server must own those operations |
| Organization | Departments, positions, shifts, holidays, sites and materials list/create/edit/delete | Dependency-safe deletion and full policy/catalog relationships require server contracts |
| Notifications | Read/unread filter, mark read/all, internal-route safety | No push/WebSocket channel; no claim of email delivery |
| Preferences | ETag-protected notification channel changes | The demo critical-channel rule is illustrative |
| Profile | Read-only trusted session profile | Password change, recovery, invitations and profile edits require identity/employee contracts |
| Reports | Metric cards, accessible attendance bars with exact-value table, leave summary, CSV export | Demo export is synchronous; real background polling and remote CSV sanitization need reporting service |
| Shared states | Loading skeletons, error/retry, empty states, validation, unsaved-form discard, confirmation, stale-version feedback | Retry is deliberate; a network timeout is never presented as confirmed success |

## Verification

Run `npm run check` for formatting, type checking, the original adapter suite, new workflow/security/architecture unit tests and production build. `npm run test:e2e` exercises employee attendance/offline behavior, request submission, role denial, mobile navigation, HR person creation, organization creation, export download, preferences leave/correction decisions, equipment fulfillment, organization edit/delete, material quantity changes, and axe WCAG A/AA scans across all main screens. A second production instance with controlled remote HTTP responses verifies sign-in, CSRF, refresh, logout and explicit service failures. Tests use synthetic data and installed Chromium/Chrome.

Architecture checks cover dependency direction, raw HTTP in presentation, raw transport paths, demo/persistence access in pages and framework context in lower modules. Unit cases cover stale versions, admin access, duplicate email, leave overlap, notification reads, preference versions, uncertain idempotency retries, contract mismatch, CSV formula safety, download-origin restriction, workspace date boundaries and refresh/logout concurrency.

Production acceptance still requires real-backend integration tests, cross-tenant tests, approved policy calculations, upload/attachment security, background export lifecycle, account recovery, deployment headers, load/large-data pagination, manual keyboard/screen-reader review and operational monitoring. Automated accessibility checks sample pages; they do not establish conformance for the entire product.

## Complete source-workflow pass

The subsequent BF-001–BF-040 implementation adds all workflow routes, dated shift assignment/closure, exact entitlement adjustments, carry-over preview/application guards, conflict review, aggregate evidence/inference review, draft editing/history, partial stock issuance, local private files, queued export lifecycle, category/quiet-hour preferences, rules preview and explicit operations/ML inspection/simulation screens. [The workflow matrix](BUSINESS-WORKFLOW-COVERAGE.md) supersedes the earlier core-only client coverage where these additions overlap.

These additions complete the mapped web screen coverage. They do not change the missing-backend and unsettled-policy acceptance limits. Native evidence collection, real training/publication, broker operations, storage scanning/retention and actual tenant security are not browser-side implementations.
