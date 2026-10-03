# System Architecture

## Overview

The Smart Clinic Appointment and Patient Queue Management System uses a three-tier web architecture. React provides the browser interface, Express exposes authenticated HTTP and Socket.IO services, and PostgreSQL stores operational and clinical data.

```mermaid
flowchart LR
    P[Patient browser]
    D[Doctor browser]
    S[Staff or admin browser]
    UI[React and Vite frontend]
    API[Express REST API]
    RT[Socket.IO gateway]
    AUTH[JWT and role authorization]
    DB[(PostgreSQL)]

    P --> UI
    D --> UI
    S --> UI
    UI -->|HTTPS /api| API
    UI <-->|Authenticated real-time events| RT
    API --> AUTH
    RT --> AUTH
    API --> DB
    RT --> DB
```

## Roles and responsibilities

| Role | Principal capabilities |
| --- | --- |
| Patient | Maintain profile, find open slots, book appointments, join the queue, view live status, receive notifications, view visit summaries |
| Doctor | Maintain professional details and availability, view assigned queue, call patients, conduct consultations, save structured records |
| Staff | Manage departments and doctor assignments, register walk-ins, monitor queues, admit/transfer/return patients, reschedule appointments |
| Administrator | All staff functions plus responsibility for controlled staff provisioning and operational oversight |

## Core workflow

```mermaid
stateDiagram-v2
    [*] --> Booked: Patient books appointment
    Booked --> Waiting: Patient checks in or staff adds walk-in
    Waiting --> Called: Doctor calls next patient
    Called --> Waiting: Staff returns patient
    Called --> Admitted: Staff confirms admission
    Waiting --> Waiting: Staff transfers queue
    Admitted --> InConsultation: Doctor starts consultation
    Called --> InConsultation: Doctor starts consultation
    Admitted --> Completed: Authorized completion
    InConsultation --> Completed: Doctor completes consultation
    Waiting --> Missed: Staff marks missed
    Called --> Missed: Staff marks missed
    Completed --> [*]
    Missed --> [*]
```

## Data model

```mermaid
erDiagram
    USER ||--o| DOCTOR : owns
    USER ||--o| PATIENT_PROFILE : owns
    USER ||--o{ APPOINTMENT : books
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs
    DEPARTMENT ||--o{ DOCTOR : contains
    DOCTOR ||--o{ DOCTOR_AVAILABILITY : publishes
    DOCTOR ||--o{ APPOINTMENT : receives
    DEPARTMENT ||--o{ APPOINTMENT : classifies
    APPOINTMENT ||--o| QUEUE : creates
    QUEUE ||--o| CONSULTATION_RECORD : produces
    USER ||--o{ CONSULTATION_RECORD : patient
    DOCTOR ||--o{ CONSULTATION_RECORD : records
```

## Security boundaries

- Public registration accepts only patient and pending-doctor roles.
- Every protected HTTP request verifies the JWT and rechecks the current database role/status.
- Socket connections perform the same account validation before joining rooms.
- Staff/admin routes enforce server-side role checks; frontend guards are usability controls only.
- Doctor-to-patient access is limited to queue records assigned to that doctor.
- Notifications are stored per recipient so read state is private to each user.
- Database migrations provide uniqueness constraints for users, active appointment slots, queue records, and daily queue numbers.

## Real-time event model

Authenticated sockets join `user:<id>` and `role:<role>` rooms. Patients additionally join `patient:<user-id>` and doctors join `doctor:<doctor-id>`. Queue changes publish refresh events only to affected doctors, patients, and staff/admin rooms.
