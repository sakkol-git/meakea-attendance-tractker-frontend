# Integration contract and release blockers

The UI is usable in explicit demo mode. Real HR transactions cannot be accepted until backend services implement and validate the contracts below. `../docs/business-flow/API-MAP.md` in the parent repository documents the backend evidence; Java services currently expose infrastructure rather than HR business endpoints. Nothing here asserts end-to-end production readiness.

## Local startup

Run `npm ci`, copy `.env.example` to `.env`, then `npm run dev`. Default mode is local. The shell labels all data synthetic and lets you preview employee, manager, HR administrator and owner roles. Browser refresh resets the simulation. The shared canonical fixture in `app/data/demo-seed.json` is preserved; `app/data/demo.ts` adds UI-only sample history, balances and organization records.

For remote mode, set `NUXT_PUBLIC_DATA_SOURCE=remote` and `NUXT_PUBLIC_API_BASE_URL=https://your-host/api/v1`, then restart/rebuild. Public runtime config contains no secrets. Production hosting must deliberately select remote mode; default demo mode is not a production configuration. HTTPS is required except loopback development. No credentials, query strings or fragments are accepted in the base URL.

## Identity and transport

- `GET /auth/me` returns the profile defined by `Profile` in `app/schemas/contracts.ts`, including trusted tenant/employee references, roles and time zone.
- `POST /auth/login` accepts `{ tenant, email, password }`; login and `POST /auth/refresh` return `{ accessToken }`. The backend creates and rotates an HttpOnly, Secure refresh cookie and detects reuse. No refresh token is exposed to JavaScript.
- `POST /auth/logout` revokes the refresh session. Local credentials clear even if revocation fails; the login page states when revocation is unconfirmed.
- The same-origin host must establish the readable `XSRF-TOKEN` cookie before login or refresh. Its decoded value is sent as `X-XSRF-TOKEN` on mutations. The backend validates it against the secure session. Cookie name is configurable with `NUXT_PUBLIC_CSRF_COOKIE_NAME`. Bootstrap endpoint and same-site cookie policy still require backend agreement. A missing cookie fails closed; no arbitrary CSRF endpoint is invented.
- Prefer a same-origin reverse proxy for `/api/v1`. If using another origin, agree credentialed CORS, allowed origin and exposed ETag headers with the backend; never use wildcard origins with credentials.
- The transport sends bearer access tokens in memory, credentials include, no-store, redirect errors and a 15-second abort timeout. It accepts JSON/problem JSON and empty 204 responses. Failed/invalid responses do not trigger demo fallback.
- Authentication errors on business requests trigger one shared refresh attempt. A repeat uses the same idempotency key. Non-auth failures never auto-replay a mutation.

## Feature endpoint expectations

Every path below is relative to `/api/v1`. Route mappings live only in `app/api/workspace.ts`; response shapes live in `app/schemas/contracts.ts`. Approve or revise these against OpenAPI before backend integration.

| Area | Provisional operations |
| --- | --- |
| Attendance | GET `/attendance/today`, `/attendance/me`; POST `/attendance/check-in`, `/attendance/check-out`; list/create `/attendance/corrections`; approve/reject a correction |
| Time off | GET `/leave/balances/me`, `/leave/requests/me`, `/leave/requests/pending`; create `/leave/requests`; detail and approve/reject/cancel by ID |
| Requests | GET `/requests/me`, `/requests/inbox`; create draft `/requests`; detail and submit/approve/reject/cancel/fulfill by ID |
| People | List/create `/employees`; detail/PATCH by ID; POST `/{id}/terminate` |
| Organization | List/create/detail/PATCH/DELETE departments, positions, shifts, holidays, work-sites and materials |
| Notifications | GET `/notifications`, `/notifications/preferences`; POST `/{id}/read`, `/read-all`; PUT preferences with ETag |
| Reporting | GET `/reports/dashboard`; POST `/reports/exports` returning a job status and a trusted download URL when complete |

Lists currently expect `{ items, total }`; filtering and paging operate on loaded records only. Backend pagination, search, request/leave type catalogs, date/holiday policy, approval routing and organization dependency checks must be agreed before a large-data rollout. Dropdown choices are provisional demo categories; they do not establish an approved company policy.

Entity updates require a positive integer version and a GET detail ETag; `If-Match` is used verbatim. Attendance checkout currently assumes the prototype ETag is the quoted session version from today's response. Agree an opaque attendance version token in the real contract before release. API error bodies use a stable `code`, safe `detail` and optional `traceId`; no stack traces or secrets should be returned.

POST sends UUID-v4 `Idempotency-Key`; servers must scope and persist receipts. An unknown outcome retains the key for same-session retries. Reload/sign-out discards it, so users must inspect server records before repeating uncertain work across sessions. There is no durable offline replay.

CSV downloads in demo mode are formula-escaped. Remote CSV sanitization remains a reporting-service responsibility. Completed export URLs must be HTTP(S) on the UI or configured API origin; signed storage origins require an explicitly reviewed allowlist extension. Pending jobs are displayed honestly; polling, cancellation and expired-download recovery need the reporting contract.

## Before production acceptance

- Implement approved OpenAPI and DTO schemas, tenant and role enforcement, login throttling, rotation/reuse detection and logout revocation in the server.
- Test with real users from two tenants: all reads, writes, approval actions, exports and attachment access must be isolated. Client role switching is demo-only and is not security verification.
- Replace prototype policy/catalogs, add server pagination, define attachment upload/download and retention, profile/account recovery, overtime/late calculations and audit-history APIs where included in scope.
- Run real-backend browser tests, including 401/403/409/412/422/429/5xx, timeouts and duplicate commands. Demo tests cannot replace this acceptance gate.
- Serve over HTTPS with restrictive CSP, secure cookie flags, cache policy, access logs without personal data, monitoring and backup/recovery. Nuxt route headers are not proof that a static host supplies them; verify actual deployment responses.
- Review `npm audit`. The installed tree currently reports a high-severity `node-forge` advisory through Nuxt's tooling chain; compatible audit fixes were applied, but the remaining advisory has no compatible automated fix. Do not run `npm audit fix --force` blindly. Track an upstream fix and assess exposure before release.

This is an engineering baseline, not certification or a compliance claim.
