# HRFlow web client

Nuxt 4 + TypeScript people workspace with a teal/cream interface, responsive navigation, attendance, leave, workplace requests, approvals, people, organization, notifications, preferences and reports. Uses conventional Nuxt folders and an isolated typed API boundary.

## Start

```sh
npm ci
cp .env.example .env
npm run dev
```

Use Node 24 LTS (Node 26 is also supported). Open `http://localhost:3000`. Local mode uses clearly labeled synthetic data, in-memory changes and a demo role selector. No cloud account or backend is required to review the interface. Refresh resets demo changes.

## Verify

```sh
npm run check
npm run test:e2e
npm audit
```

`check` runs formatting, TypeScript, adapter/unit/architecture tests and a production build. Browser tests use installed Google Chrome on macOS; elsewhere install Chromium with `npx playwright install chromium`. CI installs its browser explicitly. Browser acceptance builds once and starts isolated local/remote instances on ports 3100/3101. Test artifacts appear in ignored `test-results/`.

## Read next

- [Architecture and feature recipe](docs/ARCHITECTURE.md)
- [Remote integration, contracts and blockers](docs/INTEGRATION.md)
- [Feature coverage](docs/FEATURE-COVERAGE.md)
- [Verified results and release blockers](docs/VERIFICATION.md)

The backend does not yet provide the business APIs. Remote adapters are provisional and fail explicitly; this client must not be described as production-integrated until real-backend acceptance passes.

## All business workflows

Open `/workflows` for the searchable BF-001–BF-040 catalogue. Every documented workflow has a dedicated screen: core journeys reuse the main app, advanced HR actions include schedules/ledger/private files, and server/ML duties use clearly labeled inspection or simulation views. See [complete coverage and boundaries](docs/BUSINESS-WORKFLOW-COVERAGE.md).
