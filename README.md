# Smart Clinic Appointment and Patient Queue Management System

A full-stack web application for scheduling clinic appointments, managing daily patient queues, recording consultations, and monitoring clinic operations in real time.

## Project topic

**Design and Implementation of a Smart Clinic Appointment and Patient Queue Management System**

## Core capabilities

- Patient and pending-doctor self-registration
- Secure staff/admin provisioning through database seeding
- JWT authentication with server-side account-status validation
- Role-specific patient, doctor, staff, and administrator dashboards
- Department, doctor, and weekly availability management
- Appointment booking with collision protection
- Walk-in registration and temporary patient credentials
- Daily per-doctor queue numbering
- Call, recall, admit, consult, transfer, return, miss, and complete workflows
- Real-time Socket.IO queue and notification updates
- Patient profiles, consultation records, and visit history
- Staff reports and audit logs
- Administrator staff-account creation, activation/deactivation, and password reset
- Isolated client evaluation edition with one-click setup, guided tour, and resettable demonstration data

## Technology

- Backend: Node.js, Express, Sequelize, PostgreSQL
- Frontend: React 19, Vite, Tailwind CSS
- Real time: Socket.IO
- Database lifecycle: Sequelize migrations and seeders
- Tests: Node.js built-in test runner

## Prerequisites

- Node.js 20 or later
- npm
- Docker Desktop with Docker Compose

## Fresh installation

1. Install application dependencies:

   ```powershell
   npm run setup
   ```

2. Create the Docker and backend environment files:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend/.env.example backend/.env
   ```

3. Set the same `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values in both files. Change `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env`. `JWT_SECRET` must be at least 32 characters and the administrator password must be at least 10 characters.

4. Start PostgreSQL. The Docker database values must match the `DB_*` settings in `backend/.env`:

   ```powershell
   docker compose up -d
   ```

5. Create the schema, seed the starter departments, and provision the first administrator:

   ```powershell
   npm run db:setup
   ```

6. Start the backend and frontend:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:3000` and sign in with the administrator credentials from `backend/.env`.

## Verification

```powershell
npm test
npm run lint
npm run build
```

The backend health endpoint is `http://localhost:5000/health`.

## Account provisioning policy

- Patients may register publicly.
- Doctors may register publicly but remain unassigned until staff assigns a department.
- Staff and administrator roles cannot be requested through public registration.
- The first administrator is created by `npm run db:seed` using environment variables.
- Additional staff/admin accounts should be provisioned through a controlled administrative process.

## Project documentation

- [Architecture](docs/ARCHITECTURE.md)
- [User manual](docs/USER_MANUAL.md)
- [Test plan and acceptance checklist](docs/TEST_PLAN.md)
- [Security and deployment notes](docs/SECURITY.md)
- [Final-year project report draft](docs/PROJECT_REPORT.md)
- [Final submission checklist](docs/SUBMISSION_CHECKLIST.md)

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Install backend and frontend dependencies |
| `npm run db:setup` | Run migrations and seed initial data |
| `npm run dev` | Start both application servers |
| `npm test` | Run backend regression tests |
| `npm run lint` | Check frontend code quality |
| `npm run build` | Produce the frontend production bundle |
| `npm run reset:auth` | Remove authentication-related development data |

## Production notes

Do not deploy the development Docker password or example administrator password. Use unique secrets, HTTPS, managed PostgreSQL backups, restricted CORS origins, monitoring, and a reverse proxy. Run migrations as a deployment step before starting the backend.

## Client delivery packages

Three reproducible delivery profiles are available under `deploy/`:

- `deploy/evaluation`: a Windows-only, separately isolated client exploration edition with generated credentials and demonstration data.

- `deploy/local`: a Windows clinic host running Docker Desktop and serving authorized devices on the clinic LAN through port 8080.
- `deploy/online`: a generic Ubuntu VPS deployment with Docker Compose, PostgreSQL, Caddy, automatic HTTPS, and persistent volumes.

Build all client ZIP files and their SHA-256 checksums with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-release.ps1 -Version 1.0.0
```

The generated archives are written to `release/`. They exclude `.env` secrets, dependencies, build output, QA intermediates, temporary files, and academic project documents.

## Release verification

Run all checks that do not require Docker with:

```powershell
npm run verify
```

After creating secure `deploy/local/.env` settings and starting Docker Desktop manually, run the Docker-backed verification with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1 -Runtime
```

Each run writes an auditable result bundle under `evidence/release-verification/`. A `BLOCKED` result is not considered a pass.
