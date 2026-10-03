# Test Plan and Acceptance Checklist

## Test objectives

The system is evaluated for correctness, access control, usability of the principal workflows, data integrity, and real-time responsiveness.

## Automated checks

| Check | Command | Acceptance condition |
| --- | --- | --- |
| Backend regression tests | `npm test` | All tests pass |
| Frontend lint | `npm run lint` | No errors or warnings |
| Frontend production build | `npm run build` | Vite build completes |
| Backend syntax | `node --check <file>` | Every backend JavaScript file parses |
| Dependency audit | `npm audit` in each package | No high or critical findings |

## Functional acceptance scenarios

| ID | Scenario | Expected result |
| --- | --- | --- |
| AUTH-01 | Register patient | Patient account and profile are created |
| AUTH-02 | Register doctor | Pending doctor profile is created without department |
| AUTH-03 | Submit `staff` or `admin` to public registration API | Request is rejected with HTTP 400 |
| AUTH-04 | Log in with inactive account | Request is rejected |
| DOC-01 | Staff assigns a pending doctor | Doctor becomes available under the selected department |
| AVAIL-01 | Doctor saves non-overlapping availability | Windows are stored |
| AVAIL-02 | Doctor saves overlapping windows | Request is rejected without deleting prior schedule |
| APPT-01 | Patient books an open slot | Appointment is created |
| APPT-02 | Two patients book the same active slot | Only one succeeds; the other receives conflict response |
| QUEUE-01 | Patient checks in within allowed window | Daily queue number is generated |
| QUEUE-02 | First patient checks in on a new date | Queue numbering begins from one for that doctor/date |
| QUEUE-03 | Doctor calls next patient | Patient/staff receive real-time update |
| QUEUE-04 | Staff admits called patient | Doctor and patient dashboards refresh |
| QUEUE-05 | Staff transfers waiting patient | Doctor, department, and daily queue number change safely |
| CONSULT-01 | Assigned doctor opens active patient profile | Authorized profile is returned |
| CONSULT-02 | Unassigned doctor requests patient profile | Access is denied |
| CONSULT-03 | Doctor saves and completes consultation | Record and visit summary persist |
| NOTIFY-01 | One staff user reads notification | Other staff users' notification copies remain unread |
| REPORT-01 | Report booked volume is requested | Count reflects non-walk-in appointments created in period |

## User acceptance checklist

- [ ] A patient can complete booking without staff assistance.
- [ ] Queue status wording is understandable on mobile and desktop.
- [ ] A doctor can complete a consultation without leaving the dashboard.
- [ ] Staff can identify overdue calls and long waits.
- [ ] Staff can recover from absence by returning, transferring, or marking missed.
- [ ] Error messages clearly explain corrective action.
- [ ] All role boundaries are verified with separate accounts.
- [ ] Test users confirm that the system reduces manual queue coordination.

## Evidence record

For submission, record the date, tester, environment, actual result, and screenshot reference for every functional scenario. Do not claim user-satisfaction results until actual participants have completed the acceptance checklist or questionnaire.
