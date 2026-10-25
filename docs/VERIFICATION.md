# Client verification

Verified on 2026-10-25 in the local workspace with installed Google Chrome. GitHub Actions is configured for Node 24; the hosted workflow itself has not been executed in this session.

| Check                  | Actual result                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | PASS                                                                                                                        |
| `npm run typecheck`    | PASS                                                                                                                        |
| `npm run test:data`    | PASS: 8 original data-source cases                                                                                          |
| `npm run test:config`  | PASS: 2 release-configuration cases                                                                                         |
| `npm run test:unit`    | PASS: 87 workflow, command, auth, transport, formatting and architecture cases across 16 files                              |
| `npm run build:demo`   | PASS: explicitly marked demonstration Node server and client assets generated                                               |
| `npm run test:e2e`     | PASS: 9 cases, 1.1 minutes including startup                                                                                |
| `git diff --check`     | PASS                                                                                                                        |
| `npm audit`            | FAIL: 7 high-severity package findings in the node-forge/Nuxt tooling dependency chain; no compatible automated fix remains |

`npm run check` combines formatting, structure and bundle budgets, type checking, all 97 non-browser tests and the demo production build. All nine browser cases run against isolated production builds on ports 3100 and 3101, not the development server. The remote instance uses controlled HTTP responses to verify the client contract, not a running HR backend. A normal release build also has a negative configuration test: implicit local mode is refused, while remote mode requires a safe `/api/v1` URL.

## Browser evidence

1. Employee check-in/out, refusal of offline writes, draft request submission, denied manager route and 390px mobile navigation.
2. HR person creation, department creation, CSV download, preference update and desktop overview accessibility.
3. Medical leave creation/approval, attendance issue creation/rejection with a reason, equipment approval/fulfillment and department editing/deletion.
4. Axe WCAG A/AA scans across time off, requests, attendance, approvals, people, organization, reports, notifications, settings and profile; material quantity editing; no unhandled page errors.
5. All 40 BF workflow routes and their role/purpose screens, axe WCAG A/AA checks on every workflow, named shift assignment, exact entitlement adjustment with refreshed current balance, private evidence upload/download and queued export completion/download.
6. Mobile-aligned approval filters, delegation lifecycle and accessible team coverage.
7. Eleven main workspace routes at 390 × 844, 820 × 1180 and 1440 × 1050, with document-overflow detection and bounded table/toast surfaces.
8. Remote-mode sign-in, CSRF and idempotency headers, bearer token forwarding, one token refresh, explicit 503 failure without demo fallback, memory-only tokens and logout.
9. Missing-CSRF refusal before credentials are submitted.

Desktop overview, mobile attendance and the advanced leave-ledger screen were visually inspected. The workflow suite also regenerates `test-results/workflows-desktop.png` and `test-results/leave-ledger-desktop.png`. Re-running the browser suite regenerates `test-results/overview-desktop.png` and `test-results/attendance-mobile.png`. These artifacts are intentionally ignored by Git.

## Corrections established by the tests

- Browser fetch retains its required global receiver.
- Late refresh cannot revive a signed-out session.
- Refresh or business-service outages do not masquerade as confirmed session revocation.
- Attendance retries retain the original timestamp, payload and idempotency key after an uncertain outcome.
- Record updates reject stale versions and missing ETags before changing state.
- Safe remote failures expose their server trace ID as a support reference.
- Shared workflow status labels match mobile, including “Pending approval.”
- Data tables scroll within their region and toast surfaces stay inside narrow viewports.
- Forms expose usable field labels; secondary text and badges meet the sampled contrast checks.
- Large UI widgets load on demand. PrimeVue columns stay synchronous because the table inspects their vnode types.
- Acceptance servers are independent of `.env` changes and development hot reloads.

## Not verified and release blockers

No real-backend transaction, cross-tenant isolation, secure refresh-cookie lifecycle, mail delivery, attachment scanning, payroll calculation, production deployment, operational recovery or load test was run. Those capabilities are not implemented by a web client. API schemas and policy/catalog assumptions remain provisional as described in [Integration](INTEGRATION.md).

The audit failure remains visible as a separate failing CI job, rather than being suppressed. Compatible fixes were applied; the remaining automated suggestion is an incompatible Nuxt downgrade and was not applied. Upstream remediation and exposure review are required before release. Automated accessibility scans do not replace a complete manual keyboard and screen-reader assessment.

## Source-complete web screen pass

See [BF-001–BF-040 coverage](BUSINESS-WORKFLOW-COVERAGE.md). The final pass preserves the core screens and adds a routed screen for every source workflow, the typed `BusinessPort`, advanced HR forms/state, local private files, synthetic job stages, role/revision/replay guards and operations boundaries. The 97 non-browser tests consist of 8 data-adapter cases, 2 release-configuration cases and 87 unit/architecture cases. No hosted CI run is claimed.

New regressions cover inclusive assignment overlap, closure, impossible dates/time values, whitespace validation, exact half-day ledger entries, overdraw under concurrency, single-application carry-over under concurrency, half-day leave and future cancellation, draft edits, partial stock fulfillment, private file headers/ownership, inference terminal states, no attendance side effect from scoring, job queue/completion, late old-account responses, accepted-adapter injection and refusal to treat tenant-owner role as an operator grant.

The unchanged dependency tree retains the previously recorded audit blocker. The workflow implementation adds no dependencies. Live advanced integration remains gated by accepted backend adapters and policies; the default remote mode returns `CONTRACT_REQUIRED`, and production operator execution remains closed to a tenant owner. No unimplemented server job is described as completed in production.
