# Web business workflow coverage

Source: parent `business-flow.md`, BF-001 through BF-040 and its linked domain bodies. This is a client implementation map, not a replacement for the source-first server status.

Every row resolves through the routed screen `app/pages/workflows/[id].vue`; the searchable entry point is `/workflows`. Existing primary workspace routes remain available. The catalogue in `app/features/workflows/catalog.ts` preserves each source body, purpose and permitted preview role.

| ID | Workflow | Screen | Client behavior |
| --- | --- | --- | --- |
| BF-001 | Login | `/workflows/BF-001` | Existing sign-in, session restoration and uniform error handling. |
| BF-002 | Refresh token rotation | `/workflows/BF-002` | Automatic remote refresh plus a clearly separate rotation/reuse preview. |
| BF-003 | Tenant onboarding | `/workflows/BF-003` | Company name, owner invitation and time-zone validation; synthetic provisioning record. |
| BF-004 | Employee and organization onboarding | `/workflows/BF-004` | Employee create/edit plus role/manager invitation preparation; no fake email delivery. |
| BF-005 | Shift definition and assignment | `/workflows/BF-005` | Named employee/shift selection, effective-date assignment, overlap rejection, closure and revision guard. |
| BF-006 | Holiday management | `/workflows/BF-006` | Holiday catalogue create/edit/delete and attendance/leave calendar references. |
| BF-007 | One-tap check-in | `/workflows/BF-007` | Live client clock-in action, open-session state and evidence record. |
| BF-008 | Check-out | `/workflows/BF-008` | Clock-out with current session/version and uncertain-outcome retry protection. |
| BF-009 | Evidence ingestion | `/workflows/BF-009` | Consented manual aggregate evidence entry; no raw GPS tracking or invented hardware collection. |
| BF-010 | Inference orchestration | `/workflows/BF-010` | Confidence-band proposal preview with same-day interval validation; no private-worker browser call. |
| BF-011 | Next-day confirmation or rejection | `/workflows/BF-011` | Own inferred-session confirm/reject with version and terminal-state guards. |
| BF-012 | Attendance correction/manual entry | `/workflows/BF-012` | Attendance issue form, approval/rejection and original-record visibility. |
| BF-013 | Daily-status finalization | `/workflows/BF-013` | Employee-day worked-time inspection, open-interval state and explicit unresolved-finalization policy. |
| BF-014 | Leave submission/reservation | `/workflows/BF-014` | Leave submission, full/morning/afternoon day portions, working-day checks and reservation display. |
| BF-015 | Leave approval | `/workflows/BF-015` | Pending leave inbox, request review and approval. |
| BF-016 | Leave rejection | `/workflows/BF-016` | Mandatory rejection context and reservation release through the core leave lifecycle. |
| BF-017 | Leave cancellation | `/workflows/BF-017` | Pending cancellation and reasoned whole future-approved cancellation; no invented partial/retroactive policy. |
| BF-018 | Leave balance query and HR adjustment | `/workflows/BF-018` | Balance inspection and exact half-day HR adjustments; overdraw and replay protection. |
| BF-019 | Year-end rollover | `/workflows/BF-019` | Explicit-cap carry-over preview, pending-policy block, duplicate-run guard and reviewed application. |
| BF-020 | Leave-versus-attendance conflict review | `/workflows/BF-020` | Conflict record, retained evidence, explicit review outcome and reason; no silent payroll precedence. |
| BF-021 | Create/edit general or material request | `/workflows/BF-021` | Request creation, draft editing, detail and history. |
| BF-022 | Submit request and resolve approval chain | `/workflows/BF-022` | Draft routing preview and core submission; no client-granted approver membership. |
| BF-023 | Approve request step | `/workflows/BF-023` | Role-restricted decision inbox, version checks and recorded review. |
| BF-024 | Reject or cancel request | `/workflows/BF-024` | Reasoned rejection and owner cancellation for supported request states. |
| BF-025 | Material fulfillment | `/workflows/BF-025` | Material selection, partial/full stock issue, remaining-quantity and availability checks. |
| BF-026 | Private attachment upload/download | `/workflows/BF-026` | Private request/leave file selection, MIME signature/size checks, local download and logout cleanup. |
| BF-027 | Notification delivery | `/workflows/BF-027` | Delivery-attempt inspection and explicitly synthetic retry; no external message sent. |
| BF-028 | Notification preferences and inbox reads | `/workflows/BF-028` | Read/read-all, global preferences plus category/channel and quiet-hour preview. |
| BF-029 | Projection updates and report queries | `/workflows/BF-029` | Dashboard plus bounded employee-day report query with data-as-of evidence. |
| BF-030 | Report export | `/workflows/BF-030` | CSV export queue, polling, completion/download and pending cancellation. |
| BF-031 | Reporting full rebuild beyond retention | `/workflows/BF-031` | Projection-rebuild checkpoint, synthetic job stages and explicit no-production-change result. |
| BF-032 | Standalone confidence scoring | `/workflows/BF-032` | Documented rules formula preview, mock-location block and no attendance side effect. |
| BF-033 | Model health and metadata inspection | `/workflows/BF-033` | Model information/threshold boundary inspection; trained model/private endpoint is not exposed. |
| BF-034 | Synthetic data and model training | `/workflows/BF-034` | Offline-training experiment inputs and clearly synthetic stage/result inspection. |
| BF-035 | Owner outbox relay | `/workflows/BF-035` | Owner outbox publication preview; real broker effects remain server-owned. |
| BF-036 | Inbox consumption, retry and dead letter | `/workflows/BF-036` | Quarantine retry preview with reason and retained operation evidence. |
| BF-037 | Shift cutoff scheduling | `/workflows/BF-037` | Cutoff/catch-up date and checkpoint preview; no browser scheduler claim. |
| BF-038 | Local reference read-model bootstrap | `/workflows/BF-038` | Trusted-reference bootstrap checkpoint preview; no invented live readiness. |
| BF-039 | Technical probes and API documentation | `/workflows/BF-039` | Diagnostic boundary/readiness inspection; a health response is not proof of HR readiness. |
| BF-040 | Logout and token-family revocation | `/workflows/BF-040` | Actual sign-out, local credential clearing and remote family-revocation request/failure reporting. |

## Explicit completion boundary

All 40 workflows have purpose-specific web screens and a reachable core action, inspection view or labeled simulation appropriate to their ownership. Browser coverage visits every screen; unit tests verify the advanced state and failure paths. This does not mean all 40 server workflows execute in Java, Kafka, PostgreSQL or the private ML service.

Employee/HR/owner roles govern the preview. Owner access to an operations preview is not a production operator authorization grant. Real operator authentication and accepted administrative contracts remain prerequisites for operational commands. No private worker URL, synthetic broker success or fake email delivery is presented as a live integration.

Production-undefined choices stay explicit: cross-year pending-leave settlement blocks rollover; partial/retroactive leave cancellation is not invented; day finalization remains policy review where break, DST, open-session or conflict rules are unsettled. These workflows expose their inputs, review state and evidence without silently adopting policy.

Advanced screens use `BusinessPort`. Local mode injects `BusinessDemo`; remote mode fails with `CONTRACT_REQUIRED` unless an explicitly supplied accepted adapter implements that port. There is no new guessed HTTP namespace and no remote-to-demo fallback.

## Verification and recovery

Use `npm run check` and `npm run test:e2e`. The latter starts isolated production builds for local and remote modes. The catalogue is checked for exactly 40 unique IDs; owner route navigation and axe accessibility scans cover every workflow screen.

Demo records and selected file objects are in memory and reset on refresh; files are cleared on sign-out. No durable offline queue is claimed. Local file validation is not malware scanning. Real storage authorization, retention, signed downloads and backend accounting still require integration acceptance.
