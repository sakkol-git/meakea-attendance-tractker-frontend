# Integration contract and release blockers

The UI is usable in explicit demo mode. Real HR transactions cannot be accepted until backend services implement and validate the contracts below. `../docs/business-flow/API-MAP.md` in the parent repository documents the backend evidence; Java services currently expose infrastructure rather than HR business endpoints. Nothing here asserts end-to-end production readiness.

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

Every path below is relative to `/api/v1`. Route mappings live only in `app/api/workspace.ts`; response shapes live in `app/schemas/contracts.ts`. Approve or revise these against OpenAPI before backend integration.

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

CSV downloads in demo mode are formula-escaped. Remote CSV sanitization remains a reporting-service responsibility. Completed export URLs must be HTTPS on the UI or configured API origin; signed storage origins use the configured allowlist. The client polls an export job for up to ten two-second intervals and reports terminal failure or an unfinished job; cancellation and expired-download recovery need the reporting service contract.

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

The parent HRFlow repository owns `contracts/openapi.json`. Its current working copy is a broad provisional consumer inventory whose operations are marked pending; only the leave detail/approval fixture currently has cross-client adapter evidence. This repository contains generated copies, shared synthetic fixtures and a bundle receipt under `contracts/`. Run `python3 contracts/check-bundle.py` for local integrity; run the parent `scripts/contracts.py check` with both client checkouts for source freshness. Inventory does not establish provider implementation, business acceptance or live security acceptance.
