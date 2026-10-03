# Hospital Queue Management System — Client Delivery

Version: 1.0.0

This delivery contains a safe evaluation edition and two production installation choices. Start with the evaluation edition if the client wants to explore the workflow before choosing a production deployment.

## Explore first - evaluation edition

Use `00-Explore-Evaluation/hospital-queue-evaluation-1.0.0.zip` on a Windows computer with Docker Desktop. Extract it completely, open `deploy/evaluation`, and double-click `INSTALL-EVALUATION.cmd`.

The installer generates private demonstration credentials, prepares sample administrator, staff, doctor, patient, appointment, queue, and visit-history data, then opens the application. Read `Client_Evaluation_and_Guided_Tour_Manual.pdf` for the illustrated 15-minute tour.

This edition uses its own database and displays an evaluation warning. Do not enter real patient information.

## Which package should I use?

### 1. Clinic computer and local network

Use `01-Clinic-LAN/hospital-queue-local-1.0.0.zip` when one Windows computer will host the system inside the clinic. Other authorized computers and phones on the same clinic network can open it in a web browser.

Before installation, read either version of the manual:

- `01-Clinic-LAN/Clinic_Computer_and_Local_Network_Manual.pdf`
- `01-Clinic-LAN/Clinic_Computer_and_Local_Network_Manual.docx`

Main requirement: Windows 10/11 with Docker Desktop installed and running.

### 2. Online server

Use `02-Online-Server/hospital-queue-online-1.0.0.zip` when the clinic wants access through an internet domain hosted on an Ubuntu server.

Before installation, read either version of the manual:

- `02-Online-Server/Online_Server_Deployment_Manual.pdf`
- `02-Online-Server/Online_Server_Deployment_Manual.docx`

Main requirements: an Ubuntu VPS, Docker, a domain name pointing to the server, and ports 80 and 443 open.

## Important first-installation notes

1. Extract the selected ZIP completely before running installation commands.
2. The package does not contain live passwords or patient data.
3. On first use, the deployment tool creates a local `.env` settings file from `.env.example`. Replace every `CHANGE_TO` value with a strong private value before continuing.
4. Do not send the completed `.env` file through email or messaging applications.
5. Create a backup after initial setup and test that the backup can be found.

## Package integrity

`SHA256SUMS.txt` contains a SHA-256 fingerprint for every supplied archive and manual. A fingerprint confirms that a file has not changed after delivery.

On Windows PowerShell, check a file with:

```powershell
Get-FileHash -Algorithm SHA256 ".\01-Clinic-LAN\hospital-queue-local-1.0.0.zip"
```

On Ubuntu, check all listed files from this directory with:

```sh
sha256sum -c SHA256SUMS.txt
```

## Acceptance status

The included release passed automated backend tests, frontend quality and production-build checks, PostgreSQL workflow testing, role and authorization checks, real-time queue testing, concurrency testing, browser checks, performance testing, restart persistence, and backup/restore rehearsal. See `Acceptance/SOFTWARE_ACCEPTANCE_SUMMARY.md` for the concise result.
