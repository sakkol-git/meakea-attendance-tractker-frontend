# Web client architecture

Decision: use Nuxt 4 conventions, with typed API modules and explicit local/remote adapters. The framework's standard structure is the baseline; there is no official single “enterprise architecture” or verified most-popular enterprise folder layout. This project adds boundaries where they make code easier to test and change.

See the official [Nuxt directory structure](https://nuxt.com/docs/4.x/directory-structure) and [auto-import conventions](https://nuxt.com/docs/4.x/guide/concepts/auto-imports).

## Responsibilities

| Location | Responsibility | May depend on |
| --- | --- | --- |
| `app/pages/` | Routes, page composition and route-level role metadata | Components, composables, types, form schemas, utilities |
| `app/layouts/` | Navigation, account and connectivity shell | Components, composables, session store |
| `app/components/` | Reusable UI with props and events | Composables, types, form schemas, utilities |
| `app/composables/` | Vue Query integration, feedback and reactive view state | Injected API, session store, Vue |
| `app/stores/` | Session profile and role state | Injected API, Pinia, types |
| `app/middleware/` | Session restore and navigation guards | Session store |
| `app/plugins/` | Composition root: construct and inject services; install libraries | All client layers |
| `app/api/` | Typed feature operations, authentication lifecycle, response validation, command safety | Data adapters, schemas, types, utilities |
| `app/data/` | HTTP transport and explicitly synthetic simulation | Schemas, utilities; no Nuxt context |
| `app/schemas/` | Runtime API contracts and client form validation | Zod, transport error type |
| `app/types/` | Type-only public models and resource keys | Type-only schema references |
| `app/utils/` | Pure formatting/security helpers | Standard APIs and date-fns |

This is a pragmatic clean boundary inside Nuxt. HTTP details do not belong in Vue templates, and framework context does not belong in transport or API modules. A repository interface is already supplied by `DataSource`; adding another interface/class layer for every operation would duplicate that seam. Split `api/workspace.ts` into feature files when parallel feature work or size justifies it. Do not introduce Nuxt layers until there are genuinely shared applications or independently reusable modules.

## Data and state

Pages call `useWorkspace()` and `useWorkspaceQuery()`. API modules map semantic resource keys to provisional HTTP routes and validate responses. The transport attaches authentication, CSRF, idempotency and version headers. Remote failures stay failures; demo data is never substituted.

Pinia owns the session profile and roles. TanStack Query owns server records, freshness and loading/error states. Components own filters, dialogs and unsaved form values. Do not copy fetched lists into Pinia. Query keys include tenant, employee and roles; caches clear on account/role changes and sign-out. Access tokens remain in the private `ClientData` instance, never a persisted store or browser storage.

The installation ID in localStorage is a random device reference, not a credential. Demo records live in memory and reset on reload. There is no offline command queue.

## Security and contracts

Navigation guards and hidden buttons improve usability; the server must enforce authorization and tenant isolation. Clients never select a tenant for a business request. Workspace text at login is an identity lookup hint, not trusted authorization context.

`schemas/contracts.ts` describes the client adapter's expected shapes. These are provisional integration expectations, not an accepted OpenAPI contract. The backend currently has no implemented business API. See [Integration](INTEGRATION.md) before enabling remote mode.

API modules retain a mutation's idempotency key after uncertain transport failure for a deliberate retry during the current session. They re-read versioned records and require an ETag before updates. Query and mutation retries are disabled; authentication may refresh once and retry the identical request. An epoch guard prevents late refresh results from restoring a signed-out session.

## Feature extension recipe

1. Inspect the backend contract and business-flow reference first. Add or revise a response schema, a resource key and the API operation; add the simulation only when demo coverage is useful.
2. Write an API/adaptor test for success, validation, forbidden access, stale state and uncertain failure where relevant. Do not treat demo tests as proof of server security.
3. Add a route using the established query/feedback composables. Keep HTTP paths and raw decoding out of the page. Add role metadata if required.
4. Reuse the form, table and state components. Every action needs loading, empty, error and disabled states; destructive actions need review/confirmation.
5. Add a browser test and run `npm run check` and `npm run test:e2e`. Review keyboard access, mobile overflow and actual screen appearance.

## Enforcement and limits

`tests/unit/architecture.test.ts` rejects raw HTTP, transport paths, demo access and browser persistence in presentation; it rejects upward imports and Nuxt context in API/data/schema/utility modules. Deliberately broken examples verify that the checks trigger. These source checks complement review; they are not a full TypeScript dependency graph analysis.

The app uses client rendering because it is an authenticated internal workspace. No search indexing requirement is known. No backend-for-frontend or duplicate identity service is introduced. Self-host fonts, PrimeVue components, Pinia, Vue Query, Zod, date-fns, Vitest, Playwright and Prettier serve concrete UI, state, validation and testing needs. No paid UI kit is required.

## Complete business workflow module

`features/workflows/catalog.ts` and `forms.ts` describe all 40 source workflows and their purpose-specific actions. Nuxt routes stay in `pages/workflows/`; `WorkflowActionForm` renders accessible form fields and named reference selections. Core journeys reuse the existing feature pages and forms.

`api/business.ts` is the UI-facing authorization/adapter seam. Its `BusinessPort` interface lives in `types/business.ts`. `data/business-demo.ts` implements synthetic state, receipts, review history, local files and simulated jobs. Remote mode has no default advanced adapter: it returns `CONTRACT_REQUIRED` rather than inventing URLs or falling back to fixtures. An accepted backend adapter can be injected at the composition root without changing the screens.

The extended demo source serializes mutations to prevent competing adjustments from overdrawing balances. It requires material stock selection before equipment issuance, records partial quantities, and preserves original request history. These safeguards are client-demo evidence; server transactions and tenant isolation require their own acceptance tests.
