# Testing, Security, and Release Standard

## Test Strategy

Use risk-based, layered testing:

- unit tests for pure rules and transformations;
- model/schema tests for constraints and validation;
- service tests for business behaviour;
- API tests for authentication, validation, status codes, and error contracts;
- database tests for relationships, transactions, deletion rules, and migrations;
- model tests for preprocessing, feature contract, reload, output range, and
  unavailable/corrupt artefacts;
- frontend tests for critical interactions and all loading/empty/error/success
  states;
- integration tests for the complete primary workflow;
- production build/lint/type checks; and
- manual browser/device/print checks using synthetic data.

Do not claim a test category that was not performed.

## Test Case Record

Every formal case states: ID, requirement/objective, setup, input, procedure,
expected result, actual result, outcome, evidence location, defect ID, and
verification date. A passing label without actual evidence is insufficient.

## Defect Discipline

For every material defect record observation, impact, reproduction, root cause,
fix, regression test, final status, and residual risk. Distinguish code defects,
configuration mistakes, environment/resource issues, and expected security
behaviour.

## Security Baseline

Review threat boundaries and verify secrets, authentication, authorisation,
password hashing, session/token lifecycle, login throttling, request size,
content type, schema validation, injection/XSS exposure, CORS, defensive
headers, error leakage, dependency risks, uploads, logging, sensitive data,
backups, and deployment configuration as applicable.

Security claims must match the review performed. A code review is not a
penetration test; local hardening is not public production readiness.

## Release Gate

Before a final milestone:

1. install/setup from documented instructions or a clean environment;
2. run all lint, test, build, model, migration, and dependency checks;
3. perform the primary synthetic end-to-end workflow;
4. verify documentation links and commands;
5. inspect the intended version-control diff;
6. confirm no secrets, real personal data, local databases, or generated
   clutter are included;
7. verify artefact/metadata hashes and versions;
8. record supported environment and explicit non-claims;
9. create the milestone summary; and
10. commit/tag/push only with owner authorisation.

The release record must contain exact commands and actual outcomes, not merely
“testing completed.”
