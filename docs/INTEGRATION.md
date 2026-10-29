# Integration contract and release blockers

## Focused forms and first use — 29 October 2026

Leave, request and correction editors now offer an expandable Review details summary that follows edits without submitting or resetting values. The existing draft-then-submit request workflow and company-time correction serialization remain unchanged. Inputs are inert while a command is pending; the existing action and recovery feedback remain visible.

Public Help and getting started is available from sign-in and Settings. It explains the workspace supplied by HR, account/password assistance, first workday navigation, location permission recovery, saved drafts and unconfirmed commands. Remote setup and password pages display HR access guidance instead of offering pending server commands. Demo setup remains explicitly synthetic. Private linked-account provisioning remains the operator workflow in the root service-configuration guide; this change does not implement public onboarding or email recovery.

This is presentation and navigation work only: no new API, authentication policy, migration, event, dependency or deployment requirement. See root Week 08 evidence for executed checks and remaining device/user acceptance.

## Usability polish checkpoint — 29 October 2026

Web now retains request/leave list preferences during detail navigation and clears them on account changes. Forms announce validation errors and focus the first invalid interactive control; actions are outside the scrolling form in the dialog footer. Leave forms explain existing half-day/calendar-year rules before sending. Attendance correction fields use company-zone date/time pickers and show original sessions from loaded history; invalid or ambiguous wall-clock times are rejected. Login adds password visibility, and normal leave labels are consistent. Settings adds browser-local light/dark/device appearance through the existing theme system. Notifications explain unsupported links and recover from an empty unread filter. The shared contract and adapter request bodies are unchanged. See [client alignment](MOBILE-ALIGNMENT.md) for the complete coverage tracker and outstanding localization/device work. Root Week 08 evidence records the dated checks; prior checkpoints remain historical.

## Client UX follow-up — 29 October 2026

The approved UI pass groups web navigation by work/team/administration, replaces the daily workflow catalog with eligible task cards, places role-specific work ahead of personal attendance, and uses cards for attendance records on phones. Developer processes remain inside a collapsed local-only demo catalog. Core forms use consistent Leave/Attendance correction terminology, specific success messages, and sticky dialog actions. Task reference cards show names instead of implementation source paths and identifiers. Approval context keeps missing team-absence data explicitly unknown.

Browser location capture now starts with an explicit Share location action and explains permission recovery. Configured sites must contain valid coordinates and radius; missing data cannot become an invented office or verified boundary. Browser estimates are labeled as estimates. The default shell no longer opens the optional unsupported SSE route or uses its connection state as a workspace-health claim. These are client display/recovery changes; the owner still decides whether to accept an attendance command.

Shared component conventions and the remaining Khmer/manual-accessibility work are in [Web and mobile alignment](MOBILE-ALIGNMENT.md). The client source snapshots recorded before this pass are historical. The root Week 08 evidence owns the new UX checkpoint, checks and scope limits. No API, adapter command shape, ETag, idempotency policy, database, event schema or deployment configuration changed in this pass.

The UI is usable in explicit demo mode. Backend business controllers now exist for identity, organization, attendance, leave, requests, notifications and reporting. Their presence does not establish end-to-end acceptance; the workflow checklist below records remaining client/provider gaps. `../docs/business-flow/API-MAP.md` in the parent repository is a navigation reference that must be checked against current source. Nothing here asserts end-to-end production readiness.

## Local startup

Run `npm ci`, copy `.env.example` to `.env`, then `npm run dev`. Default mode is local. The shell labels all data synthetic and lets you preview employee, manager, HR administrator and owner roles. Browser refresh resets the simulation. The shared canonical fixture in `app/data/demo-seed.json` is preserved; `app/data/demo.ts` adds UI-only sample history, balances and organization records.

Use `npm run build:demo` when packaging an intentional demonstration. The normal `npm run build` command accepts only remote mode with an absolute HTTPS API URL ending in `/api/v1`; loopback HTTP remains available for local integration. This prevents an unlabeled release artifact from silently using synthetic data.

For remote mode, set `NUXT_PUBLIC_DATA_SOURCE=remote` and `NUXT_PUBLIC_API_BASE_URL=https://your-host/api/v1`, then restart/rebuild. Public runtime config contains no secrets. Production hosting must deliberately select remote mode; default demo mode is not a production configuration. HTTPS is required except loopback development. No credentials, query strings or fragments are accepted in the base URL.

The separate backend checkout's `infra/selfhost/compose.yaml` builds this repository's `Dockerfile` in remote mode and serves the generated static bundle behind Caddy. It requires this checkout at `web/` under the backend root. Its loopback edge binding is a private candidate only; the Acer deployment and external restore gate are still unverified. Build variables are baked into the bundle and must match the reviewed browser origin before creating a release image.

## Identity and transport

- `GET /auth/me` returns the profile defined by `Profile` in `app/schemas/contracts.ts`, including trusted tenant/employee references, roles and time zone.
- `POST /auth/login` accepts `{ tenant, email, password }`; login and `POST /auth/refresh` return `{ accessToken }`. The backend creates and rotates an HttpOnly, Secure refresh cookie and detects reuse. No refresh token is exposed to JavaScript.
- `POST /auth/logout` revokes the refresh session. Local credentials clear even if revocation fails; the login page states when revocation is unconfirmed.
- The web client calls `GET /auth/csrf` when its readable `XSRF-TOKEN` cookie is absent, then sends the decoded value as `X-XSRF-TOKEN` on mutations. The backend sets and validates the cookie against the secure session. Cookie name is configurable with `NUXT_PUBLIC_CSRF_COOKIE_NAME`. A missing cookie after bootstrap fails closed and credentials are not submitted.
- Prefer a same-origin reverse proxy for `/api/v1`. If using another origin, agree credentialed CORS, allowed origin and exposed ETag headers with the backend; never use wildcard origins with credentials.
- The transport sends bearer access tokens in memory, credentials include, no-store, redirect errors and a 15-second abort timeout. It accepts JSON/problem JSON and empty 204 responses. Failed/invalid responses do not trigger demo fallback.
- Authentication errors on business requests trigger one shared refresh attempt. A repeat uses the same idempotency key. Non-auth failures never auto-replay a mutation.

## Feature endpoint expectations

Every path below is relative to `/api/v1` except employee master, employee shift assignments, work sites, shifts, holidays and shift-assignment administration, which map to additive `/api/v2` contracts. Route mappings live in the workspace and remote data adapters; response shapes live in `app/schemas/contracts.ts`. The Week 3 employee form submits `employeeNo`, `departmentId` and `positionId`; department and position names are response display fields. Site forms submit coordinates, `radiusM` and timezone; shift forms submit local start/end, day mask, grace, site ID and matching timezone. Holiday forms submit date and kind. These versioned routes are still pending full provider acceptance.

| Area              | Provisional operations                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attendance        | GET `/attendance/today`, `/attendance/me`; POST `/attendance/check-in`, `/attendance/check-out`; list/create `/attendance/corrections`; approve/reject a correction |
| Time off          | GET `/leave/balances/me`, `/leave/requests/me`, `/leave/requests/pending`; create `/leave/requests`; detail and approve/reject/cancel by ID                         |
| Requests          | GET `/requests/me`, `/requests/inbox`; create draft `/requests`; detail and submit/approve/reject/cancel/fulfill by ID                                              |
| People            | List/create `/employees`; detail/PATCH by ID; POST `/{id}/terminate`                                                                                                |
| Organization      | List/create/detail/PATCH/DELETE departments, positions, shifts, holidays, work-sites and materials                                                                  |
| Notifications     | GET `/notifications`, `/notifications/preferences`; POST `/{id}/read`, `/read-all`; PUT preferences with ETag                                                       |
| Reporting         | GET `/reports/dashboard`; POST `/reports/exports`, then GET `/reports/exports/{id}` until the job is complete; download from a trusted URL                          |
| Approval coverage | GET/POST `/approvals/delegations`, DELETE `/approvals/delegations/{id}` with `If-Match`, and GET `/approvals/eligible-delegates`                                    |

Lists expect `{ items, total }`. The employee directory and approval queues additionally require zero-based `page` and bounded `size` metadata in their responses. Web sends `page` and `size` (1–100); approval queues also send `search`, `status`, `sort` and `minAgeDays`. The demo applies filtering and sorting before pagination, and the approval screen offers Previous/Next controls. These query parameters and delegation routes remain pending provider contracts. Large directory/catalog browsing, date/holiday policy, approval routing and organization dependency checks still require real provider acceptance. Dropdown choices are provisional demo categories; they do not establish an approved company policy.

Entity updates require a positive integer version and a GET detail ETag; `If-Match` is used verbatim. Attendance checkout currently assumes the prototype ETag is the quoted session version from today's response. Agree an opaque attendance version token in the real contract before release. API error bodies use a stable `code`, safe `detail` and optional `traceId`; no stack traces or secrets should be returned.

POST sends UUID-v4 `Idempotency-Key`; servers must scope and persist receipts. An unknown outcome retains the key for same-session retries. Reload/sign-out discards it, so users must inspect server records before repeating uncertain work across sessions. There is no durable offline replay.

CSV downloads in demo mode are formula-escaped. Remote CSV sanitization remains a reporting-service responsibility. Completed report jobs supply an exact relative private download URL; the client verifies the job ID and fetches CSV through authenticated API transport. Legacy signed attachment origins use the configured allowlist. The client polls an export job for up to ten two-second intervals and reports terminal failure or an unfinished job; cancellation and expired-download recovery need the reporting service contract.

## Before production acceptance

- Implement approved OpenAPI and DTO schemas, tenant and role enforcement, login throttling, rotation/reuse detection and logout revocation in the server.
- Test with real users from two tenants: all reads, writes, approval actions, exports and attachment access must be isolated. Client role switching is demo-only and is not security verification.
- Replace prototype policy/catalogs, add server pagination, define attachment upload/download and retention, profile/account recovery, overtime/late calculations and audit-history APIs where included in scope.
- Run real-backend browser tests, including 401/403/409/412/422/429/5xx, timeouts and duplicate commands. Demo tests cannot replace this acceptance gate.
- Serve over HTTPS with restrictive CSP, secure cookie flags, cache policy, access logs without personal data, monitoring and backup/recovery. Nuxt route headers are not proof that a static host supplies them; verify actual deployment responses.
- Review `npm audit`. The installed tree currently reports a high-severity `node-forge` advisory through Nuxt's tooling chain; compatible audit fixes were applied, but the remaining advisory has no compatible automated fix. Do not run `npm audit fix --force` blindly. Track an upstream fix and assess exposure before release.

This is an engineering baseline, not certification or a compliance claim.

## Advanced workflow adapter

All BF-001–BF-040 screens are mapped in [Business workflow coverage](BUSINESS-WORKFLOW-COVERAGE.md). Advanced features use `BusinessPort` from `app/types/business.ts`: snapshot, versioned/idempotent execute, private upload/download and account cleanup. Inject an accepted implementation as the third argument to `BusinessApi` in `app/plugins/data.ts`. The existing role and mutation guards remain active.

Remote mode routes BF-001–BF-040 through the synchronized `/workflows/{id}` contract and validates every workflow response. Provider 404/501 responses remain explicit `CONTRACT_REQUIRED` failures; there is no demo fallback. Operational mutations BF-031–BF-039 remain blocked because a tenant owner role is not a production operator grant.

Private files use the same protocol as mobile: request a signed upload ticket, upload bytes directly without API credentials, then confirm completion. Only PDF, PNG and JPEG files up to 10 MiB are accepted. Configure every trusted signed-storage origin with `NUXT_PUBLIC_FILE_ORIGINS`; the API and current web origins are included automatically. Downloads outside the allowlist fail closed.

New core prototype operations include `POST /leave/balance-adjustments`, request draft PATCH, eligible future cancellation and quantity/material-aware fulfillment. These still need approved OpenAPI and real server transaction/stock-ledger acceptance. Half-day forms send FULL_DAY/MORNING/AFTERNOON; the demo excludes configured holidays and refuses cross-year requests while the documented settlement policy is unresolved.

## Shared contract checks

Identity audit UAT slice: `GET /audit-logs` is restricted to tenant `OWNER` at gateway and owner service. It returns paged, newest-first identity audit records with UTC date filters, exact `actorId`/`entity`, and the existing `actor`/`action`/`target` filters. `actor` is the account UUID, not a joined employee name. Organization master changes write audit records atomically: catalog create, employee create/update, work-site create/update/delete, shift create/update, assignment create/close, and holiday create/update/delete. Replays and rejected stale writes do not add duplicate audit records. Auth/profile audit coverage and historical backfill remain pending; this view does not aggregate other services' audits. UI and explicit demo access follow the owner-only rule; demo records remain synthetic.

The parent HRFlow repository owns `contracts/openapi.json`. Its current working copy is a broad provisional consumer inventory whose operations are marked pending; only the leave detail/approval fixture currently has cross-client adapter evidence. This repository contains generated copies, shared synthetic fixtures and a bundle receipt under `contracts/`. Run `python3 contracts/check-bundle.py` for local integrity; run the parent `scripts/contracts.py check` with both client checkouts for source freshness. Inventory does not establish provider implementation, business acceptance or live security acceptance.

## Private report CSV transport (2026-10-28)

The additive `GET /reports/exports/{id}/download` endpoint requires the original requester authenticated as HR_ADMIN in the same tenant. Completed jobs return the relative `/api/v1/reports/exports/{id}/download` link. Fetch that path through the current authenticated API transport with CSV response mode; do not navigate to it or send an anonymous storage request. Verify the link matches the selected job, reject redirects and non-CSV responses, and preserve UTF-8. Mobile checks the workspace generation before returning data and never caches export responses. Foreign jobs return 404, unfinished jobs 409, unavailable files 503 and removed HR_ADMIN token authority 403. The live worker supports effective attendance sessions and verified leave requests; REQUESTS additionally requires completed typed request replay and a known original creation timestamp.

Remote reporting now reads `/reports/attendance/summary` and displays the actual effective session records and nullable duration. It does not decode that response as the illustrative local dashboard, fill absent fields with synthetic zeros, or derive absence/leave percentages. Web exports ATTENDANCE from this view; the local demo retains its illustrative leave dashboard. Manager scope is still unavailable on the reporting provider and fails explicitly.

REQUESTS CSV uses the original owner createdAt, with UTC calendar date bounds and the exact timestamp in each row. An uninitialized/replaying request source or an unknown legacy creation basis returns 503 without a job. All sources retain the same tenant/original-requester/current-HR_ADMIN private download checks; no anonymous URL is supported. Local provider/broker evidence is recorded separately from mock consumer tests.

### Remote leave owner integration — 2026-10-29

Remote leave forms load codes and capabilities from paged `/leave/types` and POST `/leave/requests/preview` for the assigned-calendar calculation. They display explicit untracked balances as “Not tracked,” preserve null amounts, and show reference/preview failures. Weekday/holiday estimation is only the local demonstration. Remote submissions send the selected catalog code in `type`; the local label-to-`leaveTypeId` mapping is not sent remotely. Own/pending lists and balances explicitly request pages, selecting the provider envelope rather than its legacy unpaged arrays. Adapter/component fixture tests pass; a deployed browser-to-gateway journey and required-evidence upload remain separate acceptance work.

The own-leave screen exposes server pages beyond the first 25 records. Search and status filtering there apply to the displayed page and are labeled accordingly. Balance cards and type choices traverse all provider pages rather than silently dropping additional entries. The existing local demo continues its local table/calendar behavior.


## Client integration checklist — 29 October 2026

This bounded working-copy assessment separates inspected routes from executed client checks. The parallel UAT chat owns backend repairs, canonical contracts/shared fixtures and final acceptance evidence. Preserve its changes; final UAT must use the combined client/provider state.

| Workflow | Inspected API support | Web adapter/UI | Mobile adapter/UI | Verification gap |
| --- | --- | --- | --- | --- |
| Login, refresh, logout, profile | Identity controllers support browser CSRF/cookie and native token protocols; accounts require explicit employee links | Central session/refresh adapter; tokens remain in memory | Native secure-token adapter; one exact-request refresh replay | Reusable live two-tenant/four-role environment has not been started in this chat |
| Organization and assignments | Additive v2 employee/site/shift/holiday/assignment routes; v1 departments/positions | Existing versioned routing and owner forms | Existing versioned routing and assignment snapshots | Remaining lifecycle/admin routes and actual role/relationship journeys require acceptance |
| Attendance taps/history | Today, own sessions, check-in/out exist | Accepts actual initial version zero; preserves supplied opaque ETag, retaining documented numeric fallback | Existing tap payload/key retention and numeric/opaque validator handling | Real devices, geofence/inference and daily-state journeys remain separate gates |
| Corrections | Create/list/detail/approve/reject and scoped server paging/filtering now exist | Reviewed detail uses exact ETag | Same detail/ETag flow and explicit null-versus-empty original snapshot presentation | Expanded actual client/provider assertions passed; new corrections capture submission-time originals, legacy snapshots remain unknown |
| Leave | Types, preview, balances, own/pending/detail and decisions exist | Existing owner preview; complete bounded catalog/balances and own-request pager | Existing owner preview and paged workflows | Required leave attachments, HR ledger/rollover/conflict routes and live role journeys remain gaps |
| Requests | Draft/detail/lifecycle exist; provider owner is resolving paged envelopes and existing payload aliases | Explicit own/inbox page requests now match the additive provider envelope; visible own pager; advisory material choices need no invented version; non-material quantity defaults to 1 | Existing explicit pages; non-material quantity defaults to 1 | Actual GENERAL create/submit/pages/replay are verified by direct-provider harness; material/date/time payloads now pass provider tests, and expanded real-client checks passed. Full chain/stock journeys remain separate |
| Notifications | Inbox, read/read-all and versioned preferences exist | Bounded complete inbox pages; existing exact settings ETag | Email/in-app/reminder fields and exact reviewed settings ETag; local categories preserved | Missing ETag blocks save; 412 stays a reviewable error. Push/devices/delivery routes remain separate gaps |
| Reports/private CSV | Dashboard, attendance summary, jobs/status and authenticated private download exist | Existing private authenticated CSV adapter | Existing private authenticated CSV adapter | Live provider/tenant/export journeys and device sharing still required |
| Request attachments | Canonical private upload/file routes, size/sha256 aliases and compatible completion metadata are implemented | Exact private URL validation, authenticated binary transfer and stable retry keys; actual metadata replaces fabricated files/failure-as-success | Same authenticated private transfer with account-scoped retained keys and metadata aliases | Actual direct-provider private PDF journeys pass in both clients; leave evidence remains unsupported |
| Extended workflows and unsaved form recovery | Generic snapshot/actions and form-draft APIs are unimplemented | Explicit contract errors; no synthetic fallback | Unsaved form recovery explicitly unavailable remotely; successful creation skips nonexistent draft cleanup. Demo persistence remains | These remain requirements/gaps; unavailable features are not declared complete |

Given a successful remote create, a missing unsaved-draft API must not turn that committed result into a failure. Given stale settings, saving must retain the reviewed ETag and expose 412 rather than fetch a newer version and replay. Given a catalog or inbox spanning pages, the adapter must load the complete bounded set or fail explicitly; large request lists use visible server pages. Reference selections stop at 1,000 entries and aggregate inbox/balance reads at 10,000, with no partial success.

Boundary assessment: this chat changes client transport/use and presentation only. It does not change HR policy, authorization, database migrations, events or operating topology. Provider and canonical contract changes stay with the UAT owner, including sync/compatibility. UI roles and consumer fixtures do not prove server authorization. Existing large catalog/demo files are outside this slice; attendance command state was extracted from the workspace API into a cohesive module.

Verification checkpoint: initial web unit baseline passed 106 cases; current npm checks passed 124 unit cases, formatting, structure, typing, build and bundle limits. Four actual direct-provider cases passed (two web, two native) under the backend-owned disposable fixture. One whole-suite browser run had a leave-selector timeout; all five remote browser cases subsequently passed on the unchanged implementation. The new attachment browser regression confirms failed transfers never add fabricated files and same-file retries retain command keys. Final combined verification and provenance follow below. No production-readiness claim, commit, push or deployment.


Remote request presentation uses actual MANAGER/HR_ADMIN grants for review and HR_ADMIN for fulfillment. OWNER alone supplies organization access, not an HR approval grant. Combined roles are retained. Explicit local demo role behavior remains separate. Browser in-memory access tokens are tested through SPA navigation; reloading requires real cookie-based session restoration, which is not proved by the direct-provider fixture.


Current source provenance is recorded in `docs/validation/client-integration-source.json` (per-file SHA-256 hashes, aggregate client source identity and contract digest). Root revision is `2ad32602d686c8134492aa4d40146562c52a879e`, web `d1db592ae67c472c06b9fe7298c6773ad3bf3f22`, mobile `6066d91d711d7652f49d08edc1acf6ea0c60ae7a`; all have uncommitted changes. Commit SHAs alone do not identify this integration candidate. No commit, push or deploy has been performed.


## Verification scope and handoff

Executed checks on this dirty candidate: `npm run check` passes formatting, structure, type checking, data/config tests, 126 unit cases, demo build and bundle budgets. The web scoped verifier with `--base origin/main` passes compatibility, bundle integrity, all 15 browser journeys and whitespace checks; an earlier overloaded run timed out on a leave dropdown and remains recorded as a failed run, followed by a clean rerun. Browser tests use synthetic transport and do not prove deployed authorization.

The backend-owned real-provider fixture initially passed two web and two native cases with no skips for request and notification repositories. Expanded web cases passed material/date/time/correction flows; the first expanded native run failed to compile due to a duplicate variable, which was corrected and independently compiled. The final expanded rerun passed two web and two native cases with zero skips, covering material edits (quantity 2 to 3), all three date/time request categories and actual correction review, in addition to private files, paging, duplicate commands and denials. Its exact backend-owned log is `/tmp/hrflow-uat-expanded-client-provider-final.log`; the first expanded failure remains historical evidence. Direct provider ports use real restricted-runtime PostgreSQL, JWT validation, private storage and actual business controllers; a fixture-only prefix mapping is explicit. This does not prove gateway routing, login cookies, device behavior or whole-MVP readiness.

Root full verification, foundation/backend/tooling scopes, gateway/identity/organization/leave/report integrated consumer journeys, deployment, native device acceptance and release readiness remain with final UAT. This chat did not run a full-project verifier while the backend owner was changing and testing provider sources. Missing form-draft, generic workflow and leave-evidence capabilities remain visible blockers; no synthetic remote fallback or invented policy closes them.


Final expanded provider evidence: `ClientProviderJourneyIT` in the root reporting Failsafe suite passed one orchestration case and enforced two actual web plus two actual native consumer cases with no skips. Three packaged owner services (request, notification, attendance) ran with restricted runtime database users, actual JWT validation and private temporary file storage; request relationship startup used real organization Kafka facts. Attendance test references are explicitly seeded, not proof of attendance organization replay. The fixture stops services afterward. The root backend/UAT owner retains all wider acceptance gates.

Remote draft category changes are unavailable in the current update contract. Both clients keep the original category while editing and explain that changing it requires a new draft; the explicit local demo retains its existing editing behavior. This avoids reporting a category change the provider ignored. Current check summaries and per-file source hashes identify this presentation-only finalization; API harness semantics are unchanged.

The last repeated browser run had a blank-page login timeout during concurrent local checks. A build-output race is suspected but not established. That run remains failed evidence; browser verification is being rerun with build output held stable. No check or timeout was weakened to turn it green.

Final stable-output browser rerun passed all 15 cases with zero failures or skips (structured run `dc7dc91815d54952`). Final web checks passed 126 unit cases; mobile structured run passed 187 cases with three explicit opt-in live skips. The separate expanded actual-provider fixture passed two web and two native cases with no skips. Android remote APK and explicit Flutter demo web compilation passed; no native-device or gateway acceptance is inferred. Final source and verification metadata are stored in the adjacent JSON provenance receipt.


## Notification routing follow-up — 29 October 2026

The notification owner is adding private domain facts with `kind` and `recordId`. Web links request/leave records to their detail routes, corrections to the attendance correction view and attendance sessions to attendance. Native inbox and push share a safe route helper: request/leave/correction detail and attendance activity. IDs must match the existing safe path alphabet; unknown/missing legacy targets remain readable with no invented deep link. Empty/null legacy web `to` is accepted. New domain facts never treat the recipient account UUID as a navigation path.

Both preference screens explain that required approval updates remain in the inbox when optional updates are disabled. This clarifies the approved server policy; the client does not implement delivery, force a local notice or promote email/push/SSE into Must scope. Updated route tests were first observed failing before implementation, then passed. The native full run passed 188 cases with three opt-in live skips; the web check passed 128 unit cases. The earlier APK and real-provider evidence precede this routing/presentation follow-up; notification delivery and final combined acceptance remain server/UAT-owned.

Final all-scopes formatting follow-up: Prettier formatted only `tests/e2e/remote.spec.ts`. `npm run check` then exited 0, including 128 unit cases, formatting, structure, type checking, data/config tests, demo build and bundle limits (`/tmp/hrflow-client-final-format-check.log`). The web provenance receipt records the updated test-file and aggregate source hashes. No behavior, Maven, deployment or commit change was made in this follow-up.
