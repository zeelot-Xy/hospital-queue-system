# Security and Deployment Notes

## Implemented controls

- Password hashing with bcrypt.
- JWT expiry and a minimum startup secret length.
- Public registration role allowlist.
- Database-backed status and role validation for HTTP and Socket.IO sessions.
- Server-side role authorization on protected endpoints.
- Ownership checks for patient, doctor, consultation, queue, and notification data.
- Per-user notification read state.
- Parameterized ORM/database operations.
- CORS allowlist.
- Audit logging for material operations.
- Database uniqueness constraints for key workflow invariants.

## Required production controls

- Replace all example credentials and secrets.
- Serve only through HTTPS.
- Restrict `FRONTEND_URL` to the deployed frontend origin.
- Put the API behind a reverse proxy with request-size and rate limits.
- Use a managed PostgreSQL account with minimum privileges.
- Encrypt backups and test restoration.
- Add password reset, optional MFA for staff, and short-lived sessions before real clinical use.
- Establish retention and deletion rules for health information.
- Review applicable Nigerian health-data and privacy obligations before deployment.
- Add centralized error monitoring without logging passwords, tokens, or clinical notes.

## Dependency status

Run `npm audit` in both `backend` and `frontend` during every release. Do not use `npm audit fix --force` without compatibility testing. The project does not use UUID database identifiers; any advisory reachable only through unused Sequelize UUID helpers should still be tracked until Sequelize publishes a compatible dependency update.

## Incident response minimum

1. Disable affected staff accounts.
2. Rotate JWT and database secrets when compromise is suspected.
3. Preserve relevant audit logs and infrastructure logs.
4. Identify affected patient records and time window.
5. Restore from a verified backup if integrity was lost.
6. Notify the responsible clinic authority and follow applicable reporting requirements.
