# Web and mobile alignment

Reviewed 25 October 2026 against the current mobile and web working trees, `business-flow.md`, the synchronized OpenAPI bundle, `client-design/`, and Figma nodes `10:5` and `224:92`.

Mobile remains the primary interaction reference for shared workflows. Accepted business rules and API contracts remain authoritative when a demonstrated client behavior is incomplete or unsafe. Both clients use the same HRFlow brand foundation: Kantumruy Pro, primary teal `#006151`, shared semantic colors, product terminology, status meaning and action hierarchy. Desktop navigation, density, tables and pointer states intentionally adapt that foundation to web.

## Alignment matrix

| Feature | Shared client behavior | Intentional platform difference | Remaining production gate |
| --- | --- | --- | --- |
| Identity and session | Password login uses `tenant`; current profile carries employee, tenant, roles and `timeZone`; logout clears account state | Web uses an HttpOnly refresh cookie and CSRF bootstrap; native uses a refresh token in secure storage | Live identity provider, rotating token-family tests and two-tenant authorization evidence |
| Attendance | Clock, history, corrections, source timestamps, optimistic-concurrency conflicts and role decisions | Native can collect device location and installation evidence; browser permissions and evidence differ | Accepted DTOs, company-zone calculation and device/browser tests |
| Leave | Balance, policy preview, request, evidence, cancellation and `FULL_DAY/MORNING/AFTERNOON` portion vocabulary | Mobile uses step-oriented forms; web can show calendar and form context together | Server policy recalculation, balance reservation and overlap transactions |
| General requests | Draft, submit, approval chain, cancellation and attachments | Web uses responsive detail panels; mobile uses focused task pages | Accepted routing, authorization and durable server drafts |
| Approval inbox | Canonical request inbox, zero-based pages of 25, server filters, age, exception context, reasoned decisions and next-item flow | Web category tabs, Previous/Next controls and wider comparison panels; mobile incremental loading | Provider query contract, relationship authorization and conflict tests |
| Delegation | Eligible-reviewer search, bounded dates, overlap validation and versioned cancellation | Responsive layout follows each platform navigation | Backend owner and accepted delegation contract |
| Material fulfillment | Requested, issued, remaining, stock before/after and partial issue history | Web table/detail density differs from mobile | Atomic stock ledger and concurrency evidence |
| Team coverage | Department/date filters, threshold, day details and accessible alternative | Web month grid; mobile compact day/list presentation | Authoritative team membership and approved-leave calendar |
| Reporting | Dashboard and asynchronous CSV export creation, status polling, terminal failures and signed download | Web initiates browser download; mobile saves/shares native bytes | Reporting projections, requester-scoped jobs and signed-storage integration |
| Attachments | PDF/PNG/JPEG, 10 MiB maximum, SHA-256, owner-scoped presign/upload/complete/download protocol and trusted origins | Browser and native file pickers/download handling differ | Storage authorization, malware processing, expiry and cleanup evidence |
| Loading and recovery | Explicit loading, empty, error, success, offline and stale-version states; no remote-to-demo fallback | Web retains uncertain command keys for the page session; native can use longer-lived local facilities | Live failure injection and recovery verification |
| Accessibility | Meaningful labels, scalable shared typography, non-color status meaning and minimum control targets | Keyboard/focus requirements are web-specific; screen-reader gestures and safe areas are native-specific | Manual keyboard, screen-reader, text-scale and physical-device evidence |
| Branding | Kantumruy Pro, `#006151`, shared canvas/text/border/status tokens, plain English labels and restrained surfaces | Navigation placement and information density adapt to the platform | Approved brand mark and representative-user review |

## Contract decisions implemented in both clients

- Login sends `tenant`; `tenantSlug` is not part of the shared wire request.
- Leave duration sends `portion` with `FULL_DAY`, `MORNING`, or `AFTERNOON`.
- General-request approvals use `/requests/inbox`; local adapters may retain an internal compatibility route only.
- Leave and request attachment URLs are scoped under the owning record.
- Browser mutation setup uses `/auth/csrf`; native authentication can receive a refresh token while browser refresh remains cookie-based.
- Profile time is displayed using the server-provided IANA `timeZone`.
- Remote workflow, attachment and export responses are schema-validated and never replaced with demo data after an error.

## Verification boundary

Final local verification on 25 October 2026:

- Web `npm run check`: formatting, type checking, 8 data tests, 84 unit tests and the production build passed.
- Web `npm run test:e2e`: 8 browser scenarios passed across demo and remote-contract projects, including all 40 workflow routes and WCAG A/AA axe scans.
- Mobile `fvm flutter analyze`: passed with no issues.
- Mobile `fvm flutter test`: 140 tests passed, including role workflows, 200 percent text layouts, 14 light/dark golden references and responsive route checks.
- Shared contract validation: 158 operations validated and both client bundles match the canonical OpenAPI file.

These checks prove client behavior against synthetic and contract fixtures. They cannot prove the live gateway, service authorization, tenant isolation, storage provider, mobile operating-system behavior, performance on target devices or representative-user acceptance.
