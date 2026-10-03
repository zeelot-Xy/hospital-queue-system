# Defect Register

| ID | Finding | Resolution/Status |
|---|---|---|
| D-001 | Registration boundary test included cold module-loading time | Controller initialization moved outside measured test; resolved |
| D-002 | Queue numbers could race under simultaneous arrival | PostgreSQL advisory transaction lock added; database concurrency proof passes |
| D-003 | Development user inventory endpoint exposed in server | Endpoint removed; regression test passes |
| D-004 | Backend Sequelize/UUID moderate advisory | Not reachable by application input; documented and monitored |
| D-005 | Docker runtime unavailable during baseline | Docker restored; complete runtime suite now executes |
| D-006 | Reverse proxy served SPA HTML for health endpoints | Exact health and readiness proxy routes added; resolved |
| D-007 | Container timezone caused valid clinic arrivals to appear late | Configurable clinic timezone added; resolved |
