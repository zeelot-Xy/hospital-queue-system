# Client Evaluation Edition - Acceptance Summary

Date: 12 August 2026

## Result

The isolated Windows evaluation edition passed its clean-install and usability acceptance checks.

| Check | Result |
|---|---|
| Evaluation Docker Compose validation | PASS |
| Clean image build and isolated database volume | PASS |
| Backend, database, and web health checks | PASS |
| Repeatable demonstration-data creation | PASS |
| Administrator, staff, doctor, and patient login | PASS |
| Prepared appointment, queue, availability, and visit-history data | PASS |
| Administrator-only account boundary | PASS |
| Staff creation, deactivation, password reset, reactivation, and login | PASS |
| Evaluation safety banner and guided tour | PASS |
| Headless Microsoft Edge interface check | PASS |
| Client-facing RESET-DEMO command rehearsal | PASS |
| Production-mode refusal of demo reset commands | PASS |
| Evaluation manual PDF page-by-page review | PASS |
| Evaluation manual DOCX accessibility audit | PASS |

## Safety boundaries

- The evaluation edition uses the Docker project `hospital-queue-evaluation`, port 8081, and a dedicated database volume.
- Demonstration commands require `DEMO_MODE=true`.
- Reset affects only the three fixed demonstration emails and their related workflow records.
- Each installation generates its own password and writes it locally to `DEMO-CREDENTIALS.txt`.
- No generated password, `.env`, database, backup, or test credential is included in the client archive.
- The evaluation database must never be promoted into production.
