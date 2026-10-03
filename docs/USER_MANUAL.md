# User Manual

## Starting the system

Follow the fresh-installation instructions in the project README. After startup, open `http://localhost:3000`.

## Patient guide

1. Select **Create an account**, choose **Patient**, and enter the required details.
2. Sign in and complete the medical profile where appropriate.
3. Select a department, date, doctor, and available time to book an appointment.
4. On the appointment day, use **Mark arrived** within the permitted check-in window.
5. Watch the live queue card for queue number, patients ahead, estimated wait, and status.
6. Proceed when notified that the doctor has called and staff has admitted the patient.
7. Review visit summaries in visit history after consultation.

## Doctor guide

1. Register as **Doctor** with a specialization.
2. Ask clinic staff to verify the account and assign a department.
3. Sign in, open the profile, and maintain name, phone, and specialization. Department changes are staff-controlled.
4. Configure weekly availability windows and slot duration.
5. Use **Call next patient** when no other patient is active.
6. Use **Call again** after the cooldown when necessary.
7. Open the admitted patient profile, start consultation, and record complaint, findings, diagnosis, treatment, follow-up advice, and summary.
8. Complete the consultation when records are saved.

## Staff and administrator guide

1. Sign in using a provisioned staff or administrator account.
2. Create and maintain clinic departments.
3. Assign verified doctor accounts to the appropriate department.
4. Register walk-in patients and give the generated temporary credentials to the patient privately.
5. Monitor the live queue and doctor call alerts.
6. Confirm admission when the called patient is present.
7. Return absent patients to waiting, mark appointments missed, or transfer a queue to another suitable doctor.
8. Use the appointments page to reschedule visits.
9. Review reports and audit logs for operational oversight.
10. Administrators can open **Accounts** to create staff users, activate or deactivate access, and issue replacement passwords.

## Evaluation edition

1. Extract the evaluation ZIP and start Docker Desktop.
2. Open `deploy/evaluation` and double-click `INSTALL-EVALUATION.cmd`.
3. Read the generated `DEMO-CREDENTIALS.txt` file and sign in as administrator, staff, doctor, or patient.
4. Use the amber **Guided Tour** button for role-specific exploration steps.
5. Run `RESET-DEMO.cmd` to restore the original sample queue and visit-history scenario.
6. Never enter real patient information in the evaluation edition.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Backend reports missing JWT secret | Set a value of at least 32 characters in `backend/.env` |
| Database connection fails | Confirm Docker is running and all `DB_*` values match |
| No doctors appear for a date | Confirm the doctor is active, assigned to the department, and has availability on that weekday |
| Appointment slot disappears | Another patient may have booked it; refresh and choose another slot |
| Doctor cannot see a patient profile | The queue must belong to that doctor and be in an allowed workflow state |
| Real-time changes stop | Refresh the page and sign in again if the token has expired |

## Data protection guidance

- Do not share accounts or temporary passwords publicly.
- Staff should verify identities before assigning doctor accounts.
- Consultation information should be accessed only for active care duties.
- Use the audit log to investigate unauthorized or unusual actions.
- Back up PostgreSQL regularly and restrict database access.
