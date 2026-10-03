# Design and Implementation of a Smart Clinic Appointment and Patient Queue Management System

> Final-year project report draft. Replace the bracketed student and institution fields before submission. Questionnaire-based user-satisfaction results must be added only after actual user evaluation.

## Title page information

- Student: **[Student Name]**
- Matriculation number: **[Matriculation Number]**
- Department: **[Academic Department]**
- Institution: **[Institution Name]**
- Supervisor: **[Supervisor Name]**
- Submission date: **[Month Year]**

## Abstract

Manual appointment booking and physical patient queues can cause avoidable waiting, scheduling conflicts, poor communication, and limited visibility into clinic operations. This project presents the design and implementation of a Smart Clinic Appointment and Patient Queue Management System. The system integrates online appointment booking, doctor availability, walk-in registration, daily queue generation, real-time queue updates, patient notifications, consultation records, audit logging, and operational reporting within one web application. A three-tier architecture was implemented using React for the user interface, Node.js and Express for application services, Socket.IO for real-time communication, Sequelize for object-relational mapping, and PostgreSQL for persistent storage. Role-based workflows support patients, doctors, staff, and administrators. Security controls include password hashing, JSON Web Token authentication, server-side account-status verification, public-registration role restrictions, ownership checks, and database constraints. Verification included automated regression tests, static syntax checks, frontend linting, and a production build. The implemented system demonstrates that appointment and queue activities can be coordinated through a single responsive platform. Further evaluation with real clinic users is recommended to measure changes in waiting time and user satisfaction under operational conditions.

**Keywords:** appointment scheduling, patient queue, smart clinic, real-time monitoring, health information system, web application.

# Chapter One: Introduction

## 1.1 Background to the Study

Healthcare delivery increasingly depends on information technology to improve the efficiency, accuracy, and coordination of patient care. Small and medium-sized clinics commonly experience operational difficulties in appointment scheduling and patient queue management. Manual processes based on paper registers, telephone calls, and physical waiting lines can produce overcrowding, prolonged waits, scheduling conflicts, and poor utilization of clinical staff.

Appointment scheduling influences both patient access and the effective use of service capacity. Cayirli and Veral (2003) reviewed outpatient scheduling research and showed that scheduling rules must account for arrival patterns, service-time variation, no-shows, and provider availability. Gupta and Denton (2008) similarly described appointment scheduling as a healthcare operations problem involving competing objectives such as timely access, patient convenience, and efficient use of resources.

Queue management is closely related to scheduling because appointments do not remove the variability that occurs during daily service delivery. Patients may arrive early or late, consultations vary in length, urgent circumstances arise, and walk-in patients must be accommodated. A clinic therefore requires both planned appointment slots and a live operational queue.

Digital health policy also supports the use of information systems to improve access, service management, and evidence-based decision-making. Nigeria's National Health ICT Strategic Framework identifies health information technology, interoperability, governance, and capacity development as foundations for improved healthcare delivery. The World Health Organization's global digital health strategy likewise encourages appropriate digital technologies that strengthen health systems.

Despite these developments, many clinics still lack an affordable system that integrates appointment booking with real-time queue coordination. This project therefore focuses on the design and implementation of a Smart Clinic Appointment and Patient Queue Management System that supports patients, doctors, and clinic staff through a unified web interface.

## 1.2 Statement of the Problem

Manual appointment and queue processes create several related problems. Patients may need to visit or call a clinic merely to secure a consultation. Staff can accidentally allocate overlapping appointments or struggle to determine which doctor is available. On arrival, patients may join an informal physical queue without reliable information about their position or expected wait. Doctors and reception staff may coordinate patient calls verbally, making it difficult to trace missed calls, transfers, and completed consultations. Management also lacks structured data for measuring patient volume, missed appointments, waiting time, and service performance.

The absence of an integrated digital system therefore contributes to delays, administrative workload, communication gaps, and limited operational visibility. A computerized solution is required to combine appointment scheduling, daily queue organization, real-time status updates, and management reporting.

## 1.3 Aim and Objectives of the Study

The aim of this study is to design and implement a smart digital system that improves appointment scheduling and patient queue management in clinics.

The specific objectives are to:

1. design a digital framework for appointment scheduling and patient queue management;
2. incorporate real-time monitoring of appointments and queue status;
3. implement integrated patient, doctor, staff, and administrator workflows;
4. protect clinical and operational functions through authentication and authorization;
5. generate useful operational reports and audit records; and
6. evaluate the implementation for functional correctness, build quality, and user acceptance.

## 1.4 Significance of the Study

Patients benefit from convenient booking, clearer queue status, and timely notifications. Doctors gain an organized view of waiting and active patients, availability management, and structured consultation records. Clinic staff gain tools for walk-ins, admission, transfer, rescheduling, and queue monitoring. Administrators gain reports and audit logs that support accountability and operational decisions. Academically, the work demonstrates the integration of web engineering, database design, real-time communication, and role-based security within a health informatics application.

## 1.5 Scope of the Study

The project covers patient and doctor registration, controlled staff and administrator provisioning, authentication, department management, doctor assignment, availability scheduling, appointment booking, walk-in registration, arrival confirmation, daily queue numbering, real-time queue status, patient calling and admission, queue transfer, consultation recording, notifications, reports, and audit logs.

The system is intended as a clinic operations prototype. It does not provide laboratory, pharmacy, billing, insurance, inpatient, emergency-triage, biometric, or national electronic-health-record functionality. It is not a certified medical device and should not be used for real clinical deployment without privacy, security, legal, operational, and usability assessment.

## 1.6 Definition of Key Terms

**Appointment Scheduling:** The allocation of a date and time slot for a patient to receive a medical service.

**Queue Management System:** A computerized system used to organize and control the order in which patients receive services.

**Real-Time Monitoring:** Continuous communication and display of system changes as they occur.

**Patient Flow:** The movement of a patient through booking, arrival, waiting, admission, consultation, and completion.

**Web-Based System:** An application accessed through a web browser over a network.

**Role-Based Access Control:** Restriction of functions and data according to the responsibilities assigned to a user role.

# Chapter Two: Literature Review

## 2.1 Concept of Healthcare Appointment Scheduling

Healthcare appointment scheduling matches patient demand to finite provider time. Unlike a simple calendar, a healthcare schedule must consider uncertain service duration, patient punctuality, cancellations, no-shows, walk-ins, and differences in clinical need. Cayirli and Veral (2003) classify outpatient scheduling decisions according to appointment rules, patient characteristics, and performance measures. Common performance measures include patient waiting time, provider idle time, overtime, and access delay.

Gupta and Denton (2008) explain that healthcare scheduling problems occur at several levels, including long-term capacity decisions, allocation of appointment capacity, and day-to-day sequencing. Their work shows why an effective application must distinguish between published doctor availability, booked slots, and the actual queue on the service date.

## 2.2 Queue Management in Clinics

Queueing occurs when demand temporarily exceeds available service capacity. In a clinic, the waiting population changes with arrivals, consultation duration, missed appointments, and staff decisions. A useful queue system should provide an explicit order, allow authorized exceptions such as transfer or return to waiting, and preserve timestamps for later measurement. Pure first-come-first-served logic is insufficient when clinics also need scheduled appointments and controlled staff intervention.

## 2.3 Real-Time Web Systems

Traditional request-response applications update only when the browser requests new data. Real-time systems add a persistent communication channel so the server can notify relevant clients immediately. Socket.IO was selected for this project because it supports authenticated event-based communication and browser reconnection. The design uses rooms for individual users, roles, patients, and doctors, limiting events to users affected by a queue change.

## 2.4 Digital Health in Nigeria

Nigeria's Health ICT Strategic Framework recognizes the importance of digital infrastructure, standards, interoperability, governance, workforce capacity, and secure information exchange. More recent national digital-health initiatives continue to emphasize architecture and data exchange. A clinic queue application has a narrower scope than a national health-information exchange, but it contributes to the same goals of structured data, operational visibility, and improved service coordination.

## 2.5 Review of Related System Categories

Existing solutions generally fall into separate categories: electronic calendars, hospital management suites, standalone ticket displays, and telemedicine platforms. Calendar products schedule time but may not model arrival, calling, admission, consultation, transfer, and completion. Full hospital suites can be expensive and overly broad for a small clinic. Standalone ticket systems manage order but often lack appointments, clinical roles, and patient accounts. The proposed system combines the essential parts of these categories in a focused clinic application.

## 2.6 Gap Identified

The reviewed literature establishes the importance of scheduling and queue decisions, while digital-health policy establishes the need for appropriate information systems. The implementation gap addressed by this project is an affordable web application that connects scheduled appointments and walk-ins to a real-time, role-aware clinical queue with notifications, consultation summaries, and operational reports.

# Chapter Three: Methodology and System Design

## 3.1 Development Method

An iterative development method was adopted. The work progressed through requirements identification, workflow modelling, database design, backend implementation, interface development, real-time integration, security review, and verification. Iteration was appropriate because queue transitions and role responsibilities became clearer as working screens were tested.

## 3.2 Requirements Elicitation

Requirements were derived from the approved project objectives and a typical outpatient clinic workflow. The principal actors were identified as patient, doctor, staff, and administrator. Functional requirements were expressed as observable tasks, while non-functional requirements covered security, responsiveness, maintainability, availability, and usability.

## 3.3 Functional Requirements

The system shall:

1. register patients and pending doctors;
2. authenticate users and direct them to role-specific dashboards;
3. allow staff to manage departments and doctor assignments;
4. allow doctors to publish valid, non-overlapping availability windows;
5. show patients only open appointment slots;
6. prevent simultaneous active bookings for the same doctor and slot;
7. generate a daily queue number when a patient arrives;
8. support the defined queue-state transitions;
9. publish relevant changes in real time;
10. restrict clinical information to the patient and assigned doctor;
11. record consultation summaries, notifications, and audit events; and
12. produce operational metrics for staff.

## 3.4 Non-Functional Requirements

- **Security:** Passwords must be hashed; privileged roles must not be publicly self-assigned; every protected request must be authorized server-side.
- **Integrity:** Database constraints must protect unique email addresses, appointment slots, queue records, and daily queue numbers.
- **Usability:** Screens must remain usable on mobile and desktop layouts.
- **Responsiveness:** Queue events should appear without manual refresh under normal network conditions.
- **Maintainability:** Application concerns are separated into routes, controllers, models, utilities, pages, and reusable components.
- **Recoverability:** PostgreSQL data should be backed up and schema changes applied through migrations.

## 3.5 System Architecture

The solution uses a three-tier client-server architecture. The presentation tier is a React single-page application. The application tier is an Express REST API with a Socket.IO gateway. The data tier is PostgreSQL accessed through Sequelize. JWTs authenticate HTTP and socket clients. The detailed component and data diagrams are provided in `docs/ARCHITECTURE.md`.

## 3.6 Database Design

The main entities are User, Doctor, Department, DoctorAvailability, PatientProfile, Appointment, Queue, ConsultationRecord, Notification, and AuditLog. Relationships enforce that a doctor belongs to a user account, appointments link patients to doctors and departments, an appointment produces at most one queue record, and a queue produces at most one consultation record. A composite constraint makes queue numbers unique for each doctor and date.

## 3.7 Queue Algorithm

When an eligible patient checks in, the system determines the queue date from the appointment, finds the largest existing number for the assigned doctor on that date, and allocates the next number. A database uniqueness constraint prevents duplicate daily numbers. The doctor selects the lowest numbered waiting patient. State-transition validation prevents invalid actions, while authorized staff may admit, return, miss, or transfer appropriate queue entries.

## 3.8 Security Design

Public registration uses an explicit allowlist containing only patient and doctor. Staff and administrator accounts are provisioned separately. JWT validation is followed by a database lookup so deactivated accounts and stale role claims are rejected. Doctor access to a patient profile requires a queue assignment in an allowed state. Notifications are stored per user so read state is not shared. Secrets are supplied through environment variables and the application refuses to start with a short JWT secret.

# Chapter Four: Implementation, Testing, and Results

## 4.1 Implementation Environment

The backend was implemented with Node.js, Express, Sequelize, PostgreSQL, bcrypt, JSON Web Tokens, and Socket.IO. The frontend was implemented with React 19, React Router, Axios, Lucide icons, Vite, and Tailwind CSS. Docker Compose defines the development database. Sequelize migrations create the schema and a seeder creates starter departments and the first administrator from environment variables.

## 4.2 Implemented Modules

The authentication module manages registration, login, status verification, and account deletion. Management modules cover departments, doctor assignment, and availability. Appointment modules cover open-slot search, booking, staff views, walk-ins, missed appointments, and rescheduling. Queue modules cover arrival, live boards, calling, admission, consultation, completion, return, and transfer. Supporting modules provide patient profiles, consultation history, notifications, reports, audit logs, queue metrics, and real-time events.

## 4.3 Interface Implementation

The patient dashboard combines booking, appointment history, queue state, profile management, visit history, and notifications. The doctor dashboard prioritizes the current consultation, queue overview, weekly availability, notifications, and controlled profile editing. The staff dashboard presents live queues, appointment operations, reports, doctor assignment, and department management. Responsive section menus adapt the dashboards for smaller screens.

## 4.4 Verification Approach

Verification used layered checks. Node syntax validation checked every backend JavaScript file. Automated regression tests covered the public-registration role boundary, required registration fields, password length, doctor specialization, normalization, and availability-window rules. ESLint checked the React source. Vite generated a production bundle. Dependency audits were used to identify and update vulnerable packages. The functional acceptance scenarios in `docs/TEST_PLAN.md` provide the remaining manual and database-backed test cases.

## 4.5 Recorded Results

The backend regression suite completed with twelve passing tests and no failures. In particular, an HTTP-level regression test submitted an administrator role to public registration and confirmed that the request was rejected before database access, while a legitimate patient registration still completed and returned a token. Additional tests verified availability validation, notification ownership, and the migration contract. Backend syntax validation passed for all JavaScript files. Frontend linting completed without errors after hook dependencies were stabilized. The Vite production build completed successfully and produced deployable HTML, CSS, and JavaScript assets.

These results establish code-level correctness for the tested boundaries and buildability of the frontend. They do not by themselves establish reduced real-world waiting time or user satisfaction. Those outcomes require deployment in a representative clinic and measurement with actual users.

## 4.6 Objective Assessment

| Objective | Implementation evidence | Status |
| --- | --- | --- |
| Design digital scheduling/queue framework | Architecture, data model, role workflows | Achieved |
| Add real-time monitoring | Authenticated Socket.IO queue and notification events | Achieved |
| Implement integrated system | Patient, doctor, staff, and admin modules | Achieved |
| Protect access and data | Role allowlist, status checks, ownership checks, constraints | Achieved at prototype level |
| Evaluate efficiency, accuracy, satisfaction | Automated correctness/build evidence; UAT instrument prepared | Partially achieved pending field evaluation |

# Chapter Five: Summary, Conclusion, and Recommendations

## 5.1 Summary

This project addressed the operational separation between clinic appointment calendars and daily patient queues. The implemented system links doctor availability and patient booking to arrival, daily queueing, calling, admission, consultation, completion, notification, reporting, and audit workflows. The use of a responsive web interface supports common devices, while real-time events reduce dependence on repeated manual refresh.

## 5.2 Conclusion

The study demonstrates that a focused web application can integrate appointment scheduling and patient queue management for a small or medium-sized clinic. The implemented prototype meets the central functional objectives and includes important security and integrity controls. Automated tests and build checks provide repeatable evidence that critical code paths remain valid. The system is therefore suitable as a final-year project prototype and controlled demonstration. Production clinical deployment would require additional legal, privacy, operational, infrastructure, and user-evaluation work.

## 5.3 Recommendations

Future work should:

1. conduct a pilot study measuring mean waiting time before and after adoption;
2. perform structured usability testing with patients, doctors, and reception staff;
3. add password reset and multi-factor authentication for privileged users;
4. add rate limiting, centralized monitoring, encrypted backups, and disaster-recovery tests;
5. implement SMS or email notification gateways;
6. add configurable priority/triage rules under clinical governance;
7. integrate billing, pharmacy, laboratory, or standards-based health-information exchange only after requirements and privacy assessment; and
8. conduct penetration testing and a data-protection impact assessment before real patient use.

# References

Cayirli, T., & Veral, E. (2003). Outpatient scheduling in health care: A review of literature. *Production and Operations Management, 12*(4), 519–549. https://doi.org/10.1111/j.1937-5956.2003.tb00218.x

Federal Ministry of Health, Nigeria. (2016). *National Health ICT Strategic Framework 2015–2020*. https://extranet.who.int/countryplanningcycles/sites/default/files/public_file_rep/NGA_Nigeria_Health-ICT-Strategic-Framework_2015-2020.pdf

Gupta, D., & Denton, B. (2008). Appointment scheduling in health care: Challenges and opportunities. *IIE Transactions, 40*(9), 800–819. https://doi.org/10.1080/07408170802165880

World Health Organization. (2021). *Global strategy on digital health 2020–2025*. https://www.who.int/publications/i/item/9789240020924

World Health Organization. (2024). *Strategy for optimizing national routine health information systems: Strengthening routine health information systems to deliver primary health care and universal health coverage*. https://www.who.int/publications/i/item/9789240087163

# Appendices

## Appendix A: Installation and User Guide

See `README.md` and `docs/USER_MANUAL.md`.

## Appendix B: Architecture and Database Diagrams

See `docs/ARCHITECTURE.md`.

## Appendix C: Test Plan and Acceptance Evidence Template

See `docs/TEST_PLAN.md`.

## Appendix D: Suggested User-Evaluation Questions

Rate each statement from 1 (strongly disagree) to 5 (strongly agree):

1. I could complete my assigned task without assistance.
2. The appointment and queue status information was easy to understand.
3. System responses and updates appeared quickly enough.
4. Error messages explained how to correct the problem.
5. I would prefer this system to the previous manual process.

Also record participant role, task-completion time, errors encountered, and open-ended improvement suggestions. Report the sample size and method when presenting the results.
