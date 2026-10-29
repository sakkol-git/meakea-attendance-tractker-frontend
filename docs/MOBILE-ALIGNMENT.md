# Web and mobile alignment

## Current UI conventions — 29 October 2026

### Focused forms and first use

Both clients offer an expandable Review details section for leave, requests and corrections. It reflects current values and explains the next action; opening it never submits or clears the form. Native request details, material controls and workflow date/time fields are now focused components. Its parent remains the owner of entered values, restored drafts and submission state, reduced from 985 to about 800 lines without raising the existing structural limit. Further decomposition of that cohesive state coordinator remains maintenance work.

Help and getting started is public and linked from sign-in and account/settings navigation. It explains HR-provided access, initial workday destinations, location permissions and command/draft recovery. Remote setup/password routes provide access guidance rather than advertising unimplemented public provisioning or email recovery. Demo setup remains available with explicit demo copy. Physical-device and first-time-user observations remain required.

### Usability polish follow-up

The second pass applies the usability backlog to existing English UAT flows. Web request and leave filters and pagination survive a detail visit in memory; sign-in, sign-out, expiry and demo-role changes clear those preferences. Filters are not written to local storage or URLs. Both clients distinguish an empty search from an empty collection and offer Clear filters.

Invalid forms preserve entries and reveal the first invalid control. Web focuses the interactive child of composite controls, announces the error summary and associates request date/time messages with their inputs. Mobile reveals the first invalid field and places bounded, scrollable error feedback beside the persistent action bar. Half-day and calendar-year leave messages reflect already approved policy; owner validation remains authoritative.

Web attendance corrections use company-zone date/time pickers instead of asking people to type offset timestamps. Original sessions in loaded history appear alongside the proposed change. Missing history stays unknown; nonexistent or ambiguous local times are rejected rather than guessed. The HTTP body still contains explicit instants. Native already uses company-clock pickers and original/proposed context.

Web login has an accessible password visibility control. Leave terminology is aligned on primary lists, details, approvals and reporting; the historical developer workflow catalog keeps its source names. The home balance uses the returned type, unit and year and does not invent a zero pending balance when none is supplied. Mobile role counts use singular/plural labels and distinguish a failed attendance read from loading. Native loading states respect reduced motion and errors announce recovery. Saved-data notices use task names instead of technical routes or identifiers. No new dependencies, paid services or infrastructure are required.

Web Settings offers Light, Dark and Use device setting through the existing theme system. The browser stores only this appearance preference; it does not change the server notification-preference payload. Device appearance changes are observed while Use device setting is selected, and explicit choices override them. Semantic colors and contrast are checked across the 13 core pages. Mobile retains its existing light/dark preference.

Notification screens distinguish an empty unread filter from an empty inbox and provide Show all updates. Unknown legacy destinations are explained without inventing a link. Native marks updates in a guarded action, keeps unread state as text alongside its visual indicator and disables Mark all read when no loaded unread updates exist.

Native leave submission shows its busy state while awaiting the owner preview, prevents repeated submission and edits during that wait, and preserves inputs on failure. Its draft-edit page was extracted into a focused file; the existing form size limit was not raised. Web form actions live in the dialog footer outside the scrolling form so focused fields remain visible above them on phones.

### Backlog coverage and acceptance limits

This table tracks the requested 32 areas. Existing behavior is retained where it already meets the described intent; a retained capability is not a newly implemented feature or proof of physical-device acceptance.

| Areas | Current implementation coverage | Remaining acceptance or work |
| --- | --- | --- |
| 1–3 Home, attendance, location | Role work cards; explicit capture; company-rule explanation; distinct permission/site-read errors | Observe role priorities and actual permission recovery on devices |
| 4–6 Leave, requests, corrections | Conditional fields, owner leave preview, draft-versus-submit labels, inline date restrictions, original/proposed correction context | Test real employee examples, overnight dates and interruptions |
| 7–10 Decisions, details, form recovery, uncertain submissions | Existing decision context/history and command identity retained; new error summaries and invalid-field reveal | Real concurrent decisions and connection loss; no new remote form-draft capability claimed |
| 11–16 Hierarchy, type, spacing, color, language, controls | Semantic tokens, web light/dark/device appearance, compact role spacing, wrapped long labels, direct copy, consistent Leave terminology | Representative content review and assistive-technology acceptance |
| 17–18 Lists and mobile layouts | Filter recovery in both clients; web in-memory list preferences; existing native navigation/scroll retention; keyboard-safe actions | Real phone/tablet navigation and landscape review |
| 19–22 Feedback, states, notifications, reporting | Distinct empty/error states, unread-filter recovery, unsupported-link explanation, specific outcomes, existing record links and asynchronous private-export states retained | Observe long-running exports and successive notifications with a live provider |
| 23–25 Loading, motion, navigation | Existing web query caching/reduced-motion CSS; native reduced-motion loading; scoped invalid-field focus and list preference recovery | Interaction recordings and manual focus/scroll checks |
| 26 Performance | Existing bundle budgets enforced; no new dependency | Startup, input and scrolling profiles on lower-powered Android hardware and slow networks |
| 27–29 Accessibility, authentication, offline data | Automated responsive/accessibility checks; password visibility; screen-reader error regions; existing stale/uncertain states retained | TalkBack, VoiceOver, password managers, reconnect and expiry tests |
| 30 Localization | English interface remains explicit; font foundation supports Khmer | Full message extraction, reviewed glossary/translation, date/number formatting and native-speaker acceptance remain unimplemented |
| 31 First use | Public getting-started help, HR account/workspace guidance, first-workday destinations and permission/recovery explanations in both clients | Observe first-time users; public provisioning and email recovery remain pending server capabilities |
| 32 Components | Focused native request/material/date sections and live review summaries; existing shared error/loading/form/list conventions | Further state-coordinator decomposition remains maintenance work |

The backlog is not declared fully complete. Khmer implementation, physical-device performance/accessibility work and representative-user observations remain outstanding. Automated demo/controlled-provider checks do not certify those outcomes.

The user approved a focused client UX pass. These conventions build on the shared brand and existing owner contracts. They govern presentation only; role visibility never grants server permissions.

| Element | Web | Mobile | Shared convention |
| --- | --- | --- | --- |
| Navigation | Grouped My work, Team and Administration sidebar; compact modal menu | At most five destinations: Home, Attendance, Requests, Leave/Approvals and Tasks | Use task names. Keep transport, model and recovery processes out of daily menus |
| Home priorities | Team/HR/organization work card before personal attendance | RoleTasks before compact personal attendance for management roles | Show unavailable counts explicitly; avoid interpreting a failed read as zero work |
| Attendance history | Desktop table; phone cards with date, times, duration and text status | Existing session cards and date filters | Primary record information must be readable without sideways scrolling |
| Forms | Existing feature field sections, inline errors, sticky dialog actions | Scrollable fields with a separate FormActions bar above the keyboard | Preserve entered values, command identity, validation and unsaved-change protection |
| Decisions | ApprovalContext and existing review history | DecisionContext and existing original/proposed correction comparison | Missing context stays unknown, including team absences and completed stages |
| Feedback | One active action-success group; separate error messages | Replace the previous snackbar when a new result arrives | Name the result: draft saved, request submitted or correction sent for review |
| Status | StatusBadge | StatusPill | Status text carries meaning alongside semantic color |
| Query states | QueryState | AsyncPanel | Loading, empty and recoverable failure are distinct; no silent demo fallback |
| Typography and color | tokens.css, semantic PrimeVue theme | design_tokens.dart, SemanticColors | Kantumruy Pro, teal #006151, shared semantic status meanings, scalable text |
| Location | Explicit Share location action; browser estimate and permission recovery explanation | Existing explicit capture/review/submit journey | No fabricated site coordinates or claim of server verification from a client estimate |
| Connection | Browser offline notice; footer directs users to notifications | Existing stale-cache notice and explicit refresh | Optional SSE availability does not establish workspace health |

The normal web Tasks page lists eligible feature pages in remote mode, avoiding provisional advanced workflow endpoints. Local mode includes the advanced HR task cards and an initially collapsed **Developer demo catalog**, preserving all 40 synthetic journeys for developer review. Native Tasks omits service-readiness and report-recovery entries; their separately guarded routes remain available to owner-specific tools. User-facing task references show names, while raw source paths and revisions are kept out of the normal reference card.

Core terminology is **Leave**, **Attendance correction**, **Requests** and **Approvals**. Historical source-workflow names remain intact in the documented catalog. New UI copy should describe the action and resulting state directly.

This pass adds no library or paid service. It reuses existing navigation, forms, status/state components and data adapters. It does not add a new API, change HR policy or enable unsupported email/push/SSE delivery. Existing large generic editors remain reviewed maintenance work; related changes should extract cohesive field sections rather than adding another all-feature form.

Khmer localization remains a later content and implementation phase. It requires a reviewed glossary, complete screen/error coverage, Khmer date and number examples, and representative-user testing. This pass does not claim a Khmer interface. Manual keyboard/screen-reader and physical-device acceptance remain in the UAT checklist.

## Earlier alignment review — 25 October 2026

Reviewed 25 October 2026 against the then-current mobile and web working trees, `business-flow.md`, the synchronized OpenAPI bundle, `client-design/`, and Figma nodes `10:5` and `224:92`.

Mobile remains the primary interaction reference for shared workflows. Accepted business rules and API contracts remain authoritative when a demonstrated client behavior is incomplete or unsafe. Both clients use the same HRFlow brand foundation: Kantumruy Pro, primary teal `#006151`, shared semantic colors, product terminology, status meaning and action hierarchy. Desktop navigation, density, tables and pointer states intentionally adapt that foundation to web.

## Alignment matrix

| Feature              | Shared client behavior                                                                                                         | Intentional platform difference                                                                         | Remaining production gate                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Identity and session | Password login uses `tenant`; current profile carries employee, tenant, roles and `timeZone`; logout clears account state      | Web uses an HttpOnly refresh cookie and CSRF bootstrap; native uses a refresh token in secure storage   | Live identity provider, rotating token-family tests and two-tenant authorization evidence |
| Attendance           | Clock, history, corrections, source timestamps, optimistic-concurrency conflicts and role decisions                            | Native can collect device location and installation evidence; browser permissions and evidence differ   | Accepted DTOs, company-zone calculation and device/browser tests                          |
| Leave                | Balance, policy preview, request, evidence, cancellation and `FULL_DAY/MORNING/AFTERNOON` portion vocabulary                   | Mobile uses step-oriented forms; web can show calendar and form context together                        | Server policy recalculation, balance reservation and overlap transactions                 |
| General requests     | Draft, submit, approval chain, cancellation and attachments                                                                    | Web uses responsive detail panels; mobile uses focused task pages                                       | Accepted routing, authorization and durable server drafts                                 |
| Approval inbox       | Canonical request inbox, zero-based pages of 25, server filters, age, exception context, reasoned decisions and next-item flow | Web category tabs, Previous/Next controls and wider comparison panels; mobile incremental loading       | Provider query contract, relationship authorization and conflict tests                    |
| Delegation           | Eligible-reviewer search, bounded dates, overlap validation and versioned cancellation                                         | Responsive layout follows each platform navigation                                                      | Backend owner and accepted delegation contract                                            |
| Material fulfillment | Requested, issued, remaining, stock before/after and partial issue history                                                     | Web table/detail density differs from mobile                                                            | Atomic stock ledger and concurrency evidence                                              |
| Team coverage        | Department/date filters, threshold, day details and accessible alternative                                                     | Web month grid; mobile compact day/list presentation                                                    | Authoritative team membership and approved-leave calendar                                 |
| Reporting            | Dashboard and asynchronous CSV export creation, status polling, terminal failures and signed download                          | Web initiates browser download; mobile saves/shares native bytes                                        | Reporting projections, requester-scoped jobs and signed-storage integration               |
| Attachments          | PDF/PNG/JPEG, 10 MiB maximum, SHA-256, owner-scoped presign/upload/complete/download protocol and trusted origins              | Browser and native file pickers/download handling differ                                                | Storage authorization, malware processing, expiry and cleanup evidence                    |
| Loading and recovery | Explicit loading, empty, error, success, offline and stale-version states; no remote-to-demo fallback                          | Web retains uncertain command keys for the page session; native can use longer-lived local facilities   | Live failure injection and recovery verification                                          |
| Accessibility        | Meaningful labels, scalable shared typography, non-color status meaning and minimum control targets                            | Keyboard/focus requirements are web-specific; screen-reader gestures and safe areas are native-specific | Manual keyboard, screen-reader, text-scale and physical-device evidence                   |
| Branding             | Kantumruy Pro, `#006151`, shared canvas/text/border/status tokens, plain English labels and restrained surfaces                | Navigation placement and information density adapt to the platform                                      | Approved brand mark and representative-user review                                        |

## Contract decisions implemented in both clients

- Login sends `tenant`; `tenantSlug` is not part of the shared wire request.
- Leave duration sends `portion` with `FULL_DAY`, `MORNING`, or `AFTERNOON`.
- General-request approvals use `/requests/inbox`; local adapters may retain an internal compatibility route only.
- Leave and request attachment URLs are scoped under the owning record.
- Browser mutation setup uses `/auth/csrf`; native authentication can receive a refresh token while browser refresh remains cookie-based.
- Profile time is displayed using the server-provided IANA `timeZone`.
- Remote workflow, attachment and export responses are schema-validated and never replaced with demo data after an error.
- Safe API failures show the server `traceId` as a support reference in both clients.

## Verification boundary

Final local verification on 25 October 2026:

- Web `npm run check`: formatting, structure and bundle budgets, type checking, 8 data tests, 2 release-configuration tests, 87 unit tests and the explicitly marked demo production build passed.
- Web `npm run test:e2e`: 10 browser scenarios passed across demo and remote-contract projects, including all 40 workflow routes, keyboard focus restoration, WCAG A/AA axe scans and overflow checks on 11 main routes at phone, tablet and desktop widths.
- Mobile `fvm flutter analyze`: passed with no issues.
- Mobile `fvm flutter test`: 148 tests passed and one live-gateway test was skipped because credentials were not supplied. Coverage includes role workflows, shared status vocabulary, release and URL configuration, source-growth limits, 200 percent text layouts, 14 light/dark golden references, tablet adaptation and support-reference formatting.
- Shared contract validation: 158 operations validated and both client bundles match the canonical OpenAPI file.

These checks prove client behavior against synthetic and contract fixtures. They cannot prove the live gateway, service authorization, tenant isolation, storage provider, mobile operating-system behavior, performance on target devices or representative-user acceptance.
