# Phase-by-Phase Engineering Playbook

## Global Phase Gate

Every phase follows: **inspect → decide → implement → test → document → preserve
evidence → review → approve**. A phase may be split when it contains an external
handoff, as model training and application integration do.

## Phase 1 — Project Planning and Scope

### Work

- verify title, problem, aim, objectives, users, scope, exclusions, constraints,
  ethics, and institutional requirements;
- inspect existing files and identify conflicts;
- select a proportionate stack and architecture;
- define folder structure, environment strategy, database approach, test
  strategy, evidence plan, phase roadmap, and risks;
- create an objective-to-deliverable traceability baseline.

### Exit evidence

- approved project profile and scope;
- architecture/component diagram;
- phase roadmap and dependency list;
- testing and evidence checklist;
- explicit non-goals.

## Phase 2 — Reproducible Environment Setup

### Work

- initialise the repository structure;
- create isolated backend and frontend environments;
- pin direct dependencies;
- add `.env.example`, ignore rules, configuration loading, health check, and
  minimal application shells;
- verify development commands on the actual machine.

### Exit evidence

- clean installation succeeds from instructions;
- frontend and backend start;
- health check passes;
- secrets/local databases/build output are ignored;
- setup guide records exact commands and versions.

## Phase 3 — Data and Persistence Foundation

### Work

- design entities, fields, constraints, indexes, ownership, and deletion rules;
- implement models and migrations;
- add reproducible seed/bootstrap commands without hard-coded credentials;
- test create/read/update/delete behaviour, relationships, constraints, and a
  fresh migration cycle.

### Exit evidence

- schema/ER diagram;
- migrations and model tests;
- fresh upgrade, downgrade where appropriate, and re-upgrade results;
- sanitised sample data only.

## Phase 4 — Authentication and Session Security

### Work

- implement only the required roles and flows;
- hash passwords, authenticate, protect routes, restore sessions, and log out;
- configure token/session expiry, revocation/invalidation, secret handling,
  origin restrictions, and rate limiting;
- test valid, invalid, missing, expired, revoked, and deactivated-user cases.

### Exit evidence

- authentication flow diagram;
- automated backend/frontend tests;
- no committed credentials;
- documented environment configuration and recovery behaviour.

## Phase 5 — Core Domain Workflow

### Work

- implement the central entity or record-management workflow;
- keep route/controller, schema, service, model, API client, UI, and tests
  separated;
- add validation, search, filtering, pagination, confirmation, empty/loading/
  error states, and ownership constraints.

### Exit evidence

- complete CRUD or equivalent core workflow;
- API, service, model, and interface tests;
- documented error contract;
- responsive manual smoke check.

## Phase 6A — External Data/Model Development, When Applicable

Use Kaggle or another reproducible environment when local hardware is limited.

### Work

- preserve source provenance and hashes;
- inspect quality, missingness, duplicates, types, ranges, and target balance;
- define preprocessing without leakage;
- create reproducible split/cross-validation and controlled parameter search;
- train only the approved algorithm(s);
- evaluate with metrics suitable to the task;
- save plots, metrics, metadata, preprocessing, and fitted model together;
- reload and verify the exported artefact.

### Exit evidence

- executable notebook/script and requirements;
- data-quality report and training guide;
- metrics and confusion matrix or appropriate evaluation outputs;
- artefact and metadata hashes;
- screenshots or saved notebook version;
- explicit internal/external validation boundary.

## Phase 6B — Model or External-Service Integration

### Work

- define a strict inference/service contract;
- validate feature names, order, type, category, range, model version, and
  artefact integrity;
- load expensive resources once and fail safely when unavailable;
- map outputs into domain language without overstating meaning;
- test valid, missing, malformed, unknown, extreme, unavailable, and reload
  cases.

### Exit evidence

- integration service and contract tests;
- exact agreement between training and inference preprocessing;
- safe unavailable/corrupt artefact behaviour;
- integration guide.

## Phase 7 — Core Transaction or Prediction API

### Work

- create the authenticated endpoint and service flow;
- validate related records and inputs;
- perform the transaction/prediction;
- store versioned inputs, outputs, user, time, and related entity as justified;
- return a stable response and error contract;
- prevent invalid partial persistence.

### Exit evidence

- happy-path and failure-path API tests;
- persistence and rollback verification;
- API documentation with sanitised examples.

## Phase 8 — Complete User Interface Workflow

### Work

- implement forms, validation, result/detail views, history, summaries, and
  navigation needed by the approved objectives;
- add loading, empty, success, recoverable error, confirmation, and session
  expiry states;
- verify keyboard use, labels, focus, contrast, responsive layout, and
  accessible dialogs;
- avoid UI claims that exceed backend/model evidence.

### Exit evidence

- interaction/component tests and production build;
- desktop and mobile smoke evidence;
- sanitised screenshots;
- user-facing limitations/disclaimers where required.

## Phase 9 — Reporting and Retrieval

### Work

- implement only necessary summaries, history, filters, detail reports, and
  print/export behaviour;
- keep aggregates consistent with filtered records and database truth;
- validate dates, categories, pagination, and empty states;
- protect sensitive data and exclude interactive controls from print layouts.

### Exit evidence

- report API/UI tests;
- expected-versus-actual aggregate checks;
- A4 or required print inspection;
- documentation of supported and unsupported export formats.

## Phase 10 — System Verification

### Work

- run backend lint/tests, frontend lint/tests/build, model tests, dependency
  checks, migration cycle, and full integration workflow;
- perform a controlled browser/device smoke test with synthetic data;
- record each test case, expected result, actual result, and outcome;
- log defects, root causes, fixes, regressions, and unresolved limitations.

### Exit evidence

- testing guide and test-case register;
- exact command outputs and totals;
- integration and browser evidence;
- zero unexplained failing gates.

## Phase 11 — Proportionate Optimisation and Security Review

### Work

- profile before optimising;
- remove duplication and clarify interfaces without changing verified behaviour;
- review authentication, authorisation, secrets, token lifecycle, throttling,
  body limits, validation, CORS, headers, logging, dependency exposure, and
  sensitive data;
- review accessibility, responsive behaviour, error recovery, and slow/cold
  paths;
- run regression tests after every material change.

### Exit evidence

- prioritised findings with source evidence;
- verified fixes and regression tests;
- documented residual risks;
- no invented claim of penetration testing or formal certification.

## Phase 12 — Documentation and Final Release

### Work

- reconcile all guides with the current repository;
- produce README, installation, deployment, user/admin, API, ML/data, training,
  testing, folder-structure, project-summary, and deployment-checklist documents
  as applicable;
- perform a clean setup/release verification;
- audit secrets, real personal data, licences, local links, Git diff, and tags;
- create the final milestone summary and release tag when authorised.

### Exit evidence

- documentation index with no broken local links;
- final verification record with exact commands/results;
- clean release boundaries and known limitations;
- recoverable source, migrations, artefacts, and evidence;
- academic-writing handoff package.

## Milestone Strategy

Recommended milestone grouping:

1. **Foundation:** planning, setup, data foundation;
2. **Core system:** authentication, domain workflow, model/data development and
   integration;
3. **Functional system:** transaction/API, complete UI, reports;
4. **Final release:** testing, optimisation/security, documentation.

Tags, commits, and summaries are evidence, not a substitute for tests. Never
rewrite shared history or push without the project owner's authorisation.
