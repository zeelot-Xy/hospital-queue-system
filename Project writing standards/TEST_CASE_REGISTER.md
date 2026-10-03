# Test Case Register

This register records the final Docker-backed release-verification baseline used by Chapter Three's test methodology and reserved for reporting in Chapter Four. Detailed functional cases remain in `docs/TEST_PLAN.md`.

| ID | Objective/requirement | Level/area | Preconditions | Input/action | Expected result | Actual result | Outcome | Evidence | Defect | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| T01 | O1-O4; regression safety | Unit and policy | Backend dependencies installed | Run backend Node test suite | All tests pass | 21 passed, 0 failed at final release baseline | Pass | `evidence/release-verification/2026-08-11_062512/T01-backend-tests.log` | None open | 11 Aug 2026 |
| T02 | Maintainability | Static quality | Frontend dependencies installed | Run ESLint | No errors or warnings | Gate passed | Pass | `T02-frontend-lint.log` | None | 11 Aug 2026 |
| T03 | Portability and buildability | Production build | Frontend dependencies installed | Build Vite application | Production assets generated | Gate passed | Pass | `T03-frontend-build.log` | None | 11 Aug 2026 |
| T04 | Local deployment | Configuration | Local Compose files present | Validate clinic-LAN Compose definition | Configuration valid | Gate passed | Pass | `SUMMARY.md` and release script result | None | 11 Aug 2026 |
| T05 | Online deployment | Configuration | Online Compose files present | Validate Ubuntu VPS Compose definition | Configuration valid | Gate passed | Pass | `SUMMARY.md` and release script result | None | 11 Aug 2026 |
| T06 | Security baseline | Dependency audit | Backend production dependency tree installed | Audit backend production dependencies | No high or critical finding; moderate finding assessed | Gate passed with documented unreachable transitive UUID behaviour | Pass with mitigation | `T06-backend-audit.log`; `docs/RELEASE_READINESS.md` | Moderate advisory monitored | 11 Aug 2026 |
| T07 | Security baseline | Dependency audit | Frontend production dependency tree installed | Audit frontend production dependencies | No high or critical finding | No vulnerability reported | Pass | `T07-frontend-audit.log` | None | 11 Aug 2026 |
| T08 | Release integrity | Source quality | Release working tree prepared | Check patch and whitespace integrity | No material release-integrity defect | Gate passed | Pass | `T08-diff-check.log` | None | 11 Aug 2026 |
| T09 | O1-O3; deployability | Container build | Docker engine running | Build clinic deployment images | All required images build | Gate passed | Pass | `T09-container-build.log` | None | 11 Aug 2026 |
| T10 | O1-O3; clean installation | Integration and database | Empty project database volume | Start complete clinic stack | Migrations, seeding, and health checks succeed | Gate passed | Pass | `T10-container-start.log` | None | 11 Aug 2026 |
| T11 | O1-O3; FR-01 to FR-15 | API integration | Clean running stack and fictional accounts | Execute patient-to-consultation workflow | Workflow completes with valid role and state transitions | Gate passed | Pass | `T11-api-workflow.log` | None | 11 Aug 2026 |
| T12 | O4; performance requirement | Performance | Running stack and representative accounts | Send 100 requests across 25 concurrent users | No failures; p95 below 2,000 ms | 0 failures; 421.9 ms p95 | Pass | `T12-performance.log` | None | 11 Aug 2026 |
| T13 | O1-O4; usability boundary | Browser and compatibility | Running stack; headless Microsoft Edge | Exercise staff, doctor, and patient dashboards at desktop and phone viewports | Required screens load with no console or request error | 6 screenshots; 0 console errors; 0 failed requests | Pass | `T13-browser.log` and role screenshots | Participant satisfaction not measured | 11 Aug 2026 |
| T14 | O2; FR-13 | Real-time and security | Socket service running with test identities | Attempt unauthorised and authorised connections and deliver event | Unauthorised connection rejected; intended room receives event | Gate passed | Pass | `T14-realtime.log` | None | 11 Aug 2026 |
| T15 | Reliability and recoverability | Recovery | Running persistent stack with test records | Restart containers; back up and restore into isolated database | Records persist and restored counts match | Gate passed | Pass | `T15-recovery.log` | None | 11 Aug 2026 |
| T16 | O3; FR-09; integrity | Concurrency | Two eligible arrivals for one doctor/date | Submit simultaneous arrival operations | Unique daily queue numbers with no duplicate | Queue numbers 1 and 2; 0 duplicates | Pass | `T16-concurrency.log` | None | 11 Aug 2026 |

## Final Test Summary

| Gate | Command or procedure | Total | Passed | Failed | Notes |
|---|---|---:|---:|---:|---|
| Release-verification gates | `scripts/verify-release.ps1` and recorded Docker-backed procedures | 16 | 16 | 0 | All runtime gates required for release approval were executed |
| Backend automated tests | Node test runner | 21 | 21 | 0 | Final release baseline reported in `docs/RELEASE_READINESS.md` |
| Representative performance requests | 25 concurrent users and 100 requests | 100 | 100 | 0 | Median 330.9 ms; p95 421.9 ms; maximum 466.3 ms |
| Participant satisfaction study | Not performed | 0 | 0 | 0 | Must not be reported as passed; remains a validation limitation |
