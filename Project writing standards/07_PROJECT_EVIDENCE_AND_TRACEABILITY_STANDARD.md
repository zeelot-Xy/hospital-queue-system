# Project Evidence and Traceability Standard

## Objective Traceability

Maintain a living matrix with one row per objective:

```text
Objective → Research question → Requirement → Design component → Source module
→ Test case → Evidence artefact → Chapter 4 finding → Chapter 5 conclusion
```

No objective is achieved merely because it appears in a chapter. It requires
implementation or research evidence and a verified result.

## Evidence Folder

Recommended structure:

```text
project-evidence/
├── planning/
├── architecture/
├── data/
├── model-training/
├── database/
├── api/
├── frontend/
├── testing/
├── security/
├── milestones/
└── final-verification/
```

## Evidence Rules

- Use synthetic or properly authorised data.
- Remove credentials, tokens, secrets, real patient/customer/user details, and
  local filesystem information that should not be published.
- Prefer machine-readable evidence plus a concise human-readable explanation.
- Record date, phase, environment, command/action, expected outcome, actual
  outcome, and related objective/test.
- Preserve full outputs only when useful; summarise noisy dependency logs while
  retaining the decisive result.
- Use stable descriptive filenames rather than `screenshot1` or `final2`.
- Never alter screenshots or logs to make a failure appear successful.
- Mark superseded evidence and preserve the final verified baseline clearly.

## Defence Readiness

For each major claim, be able to show the code, test, result, interface, and
limitation. Prepare concise evidence for architecture, database design,
security, model/data workflow, primary use case, error handling, automated test
totals, responsive behaviour, and final release boundaries.

## Documentation Reconciliation

At every milestone compare evidence against README, API guide, testing guide,
model/data guide, user/admin guides, deployment guide, and academic chapters.
Correct stale documentation in the same phase; do not leave contradictory
totals or completed/planned ambiguity.
