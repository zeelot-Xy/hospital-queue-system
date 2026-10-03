# Release readiness

## Current decision

Release approved for the clinic LAN and generic Ubuntu VPS packages. The final Docker-backed acceptance run (`2026-08-11_062512`) passed all 16 gates, including clean PostgreSQL migration and seeding, the full patient-to-consultation workflow, realtime authorization, concurrent queue allocation, headless role dashboards, 25-user load, restart persistence, and backup/restore.

The acceptance evidence is stored in `evidence/release-verification/2026-08-11_062512`. The tested temporary deployment contains generated QA accounts and must not be delivered as data; client packages create a fresh database during installation.

## Required release gates

- All automated tests, lint, and production builds pass.
- Both Compose definitions validate and build from a clean checkout.
- A clean database migrates and seeds successfully.
- The API workflow from registration through completed consultation passes.
- Patient, doctor, staff/administrator data remains isolated by authorization rules.
- Restart and backup/restore checks preserve records.
- Twenty-five concurrent representative requests have no errors and a p95 below two seconds.
- There are no high or critical dependency vulnerabilities.
- Each remaining moderate vulnerability has a written reachability assessment.

## Dependency advisory assessment

The production backend audit currently reports a moderate advisory in the transitive `uuid` package used by Sequelize. The affected behavior concerns namespace UUID versions when a caller supplies a destination buffer. This application does not call `uuid` directly and uses PostgreSQL integer identifiers, so the vulnerable operation is not reachable through application input. The dependency remains monitored; forcing npm's suggested Sequelize downgrade would create a larger compatibility and security risk. Frontend production dependencies currently report no vulnerabilities.

## Evidence policy

Every verification run is stored under `evidence/release-verification/<timestamp>`. A failed or blocked check remains visible in the summary and is never rewritten as a pass.

## Final acceptance measurements

- Backend automated tests: 21 passed, 0 failed.
- Headless browser: staff/administrator, doctor, and patient dashboards passed at desktop and phone viewports; 0 console errors and 0 failed requests.
- Realtime: unauthenticated connection rejected; authenticated room event delivered.
- Concurrency: two simultaneous arrivals received unique queue numbers 1 and 2.
- Performance: 100 requests across 25 representative concurrent users; 0 failures and 421.9 ms p95 against the two-second gate.
- Recovery: backup restored into an isolated temporary database; record counts matched; records persisted after all application containers restarted.
- Security audit: no high or critical findings; the single moderate transitive advisory is covered by the reachability assessment above.
