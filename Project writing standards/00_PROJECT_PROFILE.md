# Dynamic Project Profile

This profile records the verified project baseline used from Chapter Three
onward. Identity details not present in the supplied project files remain
explicitly unresolved rather than being invented.

## Identity

- **Project title:** Design and Implementation of a Smart Clinic Appointment and Patient Queue Management System
- **Student:** Not provided in the available project files
- **Institution:** Not provided in the available project files
- **Faculty/school:** Not provided in the available project files
- **Department/programme:** Not provided in the available project files
- **Degree:** Not provided in the available project files
- **Supervisor:** Not provided in the available project files
- **Submission date:** Not provided in the available project files
- **Project type:** Software

## Problem and Boundaries

- **Problem being addressed:** Manual or disconnected appointment and queue processes create repeated data entry, weak visibility, booking conflicts, uncertain service order, and poor operational traceability in small and medium-sized clinics.
- **Intended user:** Patients, doctors, clinic staff, and clinic administrators.
- **Intended use:** Appointment scheduling, arrival and queue coordination, consultation workflow support, notifications, visit summaries, operational reports, and audit evidence.
- **Explicit non-use:** The system is not a diagnostic device, an autonomous clinical decision-maker, or evidence of improved patient outcomes without an authorised real-world study.
- **In scope:** Role-based accounts; departments and doctor assignment; availability; appointment booking and rescheduling; walk-ins; queue allocation and transitions; consultation summaries; notifications; reports; audit logging; clinic-LAN, evaluation, and online deployment profiles.
- **Out of scope:** Billing, pharmacy and laboratory management, electronic prescribing, insurance claims, emergency triage, diagnostic recommendations, biometric identification, and demonstrated clinical effectiveness.
- **Important ethical/safety boundary:** Use fictional or properly authorised data for testing; restrict access by role and ownership; apply clinic privacy, retention, incident, and professional-governance requirements before live use.

## Aim, Objectives, and Questions

- **Aim:** To design and implement a smart digital system that improves appointment scheduling and patient queue management in clinics.

1. Design a digital framework for appointment scheduling and patient queue management in clinics.
2. Incorporate a real-time monitoring feature for tracking appointments and patient queue status.
3. Implement an integrated system for automated appointment booking and queue management.
4. Evaluate the performance of the system based on efficiency, accuracy, and user satisfaction.

### Research Questions

1. How can a digital framework support appointment scheduling and patient queue management in a clinic?
2. How can real-time monitoring provide authorised users with current appointment and queue status?
3. How can appointment booking and patient queue management be integrated while preserving workflow and data consistency?
4. To what extent does the implemented system satisfy defined technical efficiency and accuracy criteria, and what additional participant study is required to assess user satisfaction?

The fourth research question preserves the approved objective without claiming
that user satisfaction has already been measured. Technical verification is
available; participant-based satisfaction evidence remains outside the current
evaluation baseline.

Create one research question for each objective and preserve this one-to-one
mapping throughout design, implementation, testing, results, and conclusion.

## Technical Profile

- **Frontend:** React 19, Vite 8, Tailwind CSS, Axios, Socket.IO Client
- **Backend:** Node.js, Express 4, Sequelize 6, Socket.IO 4
- **Database:** PostgreSQL 16
- **Authentication:** Expiring JSON Web Tokens, bcrypt password hashing, and database-backed role/status checks
- **Deployment target:** Windows clinic LAN through Docker Desktop; generic Ubuntu VPS through Docker Compose and HTTPS; isolated evaluation edition
- **Development hardware constraint:** Not formally provided; Docker-backed verification was completed on the available Windows development host
- **External development environment:** None recorded
- **Required institutional technologies:** None provided

## Data or ML Profile

- **Dataset/source:** Not applicable; the project is a transactional software system and uses fictional seeded records for demonstration and verification
- **Licence/use permission:** Not applicable to a research dataset
- **Dataset age:** Not applicable
- **Rows, columns, target:** Not applicable
- **Algorithm(s) actually implemented:** Availability-slot validation; appointment collision prevention; transactional daily queue-number allocation; controlled queue-state transitions; role- and ownership-based authorisation
- **Training location:** Not applicable
- **Evaluation protocol:** Automated policy and regression tests, clean PostgreSQL migration and seeding, API workflow, headless browser checks, authenticated real-time tests, concurrency tests, 25-user request workload, restart persistence, and backup/restore rehearsal
- **Saved artefact contract:** Not applicable to a trained model; release artefacts are reproducible Docker-based packages with checksums
- **Validation boundary:** Internal technical verification with synthetic data; no external clinical or participant validation

## Academic Rules

- **University template:** No separate institutional template was supplied; corrected Chapter One is the presentation authority
- **Citation style:** APA 7th edition with narrative citations preferred
- **Reference year window:** 2021 to present, with documented exceptions for seminal methodology and current governing standards
- **English convention:** British English
- **Required chapter structure:** Five chapters
- **Required font and pagination:** A4; Times New Roman 12 pt; 1.5 spacing; justified body; 0.5-inch first-line indent; left margin 1.25 inches and other margins 1 inch, following the corrected Chapter One

## Evidence Locations

- Source code: `backend/`, `frontend/`, and `deploy/`
- Test evidence: `evidence/release-verification/2026-08-11_062512/`
- Model evidence: Not applicable
- Screenshots: `evidence/release-verification/2026-08-11_062512/`
- Research register: `Project writing standards/RESEARCH_SOURCE_REGISTER.md`
- Master references: `Project writing standards/MASTER_REFERENCES.md`
- Chapter files: `joe documentation/`

## Approval

- Profile completed by: Project owner with evidence-based assistance; personal identity not provided
- Date approved: 24 September 2026
- Scope locked: Yes, subject to explicit owner-authorised revision
- Writing standard locked: Yes from Chapter Three onward, subject to an overriding institutional rule
