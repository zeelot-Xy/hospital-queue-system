# Project Writing Standards Starter Pack

## Purpose

This folder is a reusable control system for planning, engineering, testing,
documenting, and writing a strong final-year software or software-plus-machine-
learning project. It transfers the methods used in a completed project without
copying that project's title, dataset, results, modules, or claims.

## Start Here

1. Copy this entire folder into the root of the new project.
2. Open `00_PROJECT_PROFILE.md` and replace every square-bracket placeholder.
3. Paste `01_MASTER_SOFTWARE_PROJECT_PROMPT.md` into the first Codex task.
4. Keep `AGENTS.md` in the documentation folder so its gates remain active.
5. Use `02_PHASE_BY_PHASE_ENGINEERING_PLAYBOOK.md` to build and verify one
   phase at a time.
6. Lock `03_PROJECT_WRITING_STANDARD_TEMPLATE.md` before Chapter One begins.
7. Use `04_PORTABLE_ACADEMIC_WRITING_PROMPT.md` when the software is ready to
   be converted into an academic report.
8. Maintain the registers in `templates/` throughout development and writing.

## Included Standards

| File | Controls |
|---|---|
| `00_PROJECT_PROFILE.md` | Project identity, scope, stack, objectives, constraints, and evidence locations |
| `01_MASTER_SOFTWARE_PROJECT_PROMPT.md` | Engineering behaviour, architecture, phase gates, resource-aware tactics, and completion rules |
| `02_PHASE_BY_PHASE_ENGINEERING_PLAYBOOK.md` | Twelve-phase implementation sequence and exit evidence |
| `03_PROJECT_WRITING_STANDARD_TEMPLATE.md` | Five-chapter university, APA, software, and ML writing standard |
| `04_PORTABLE_ACADEMIC_WRITING_PROMPT.md` | Ready-to-paste prompt for a new report-writing task |
| `05_RESEARCH_EVIDENCE_AND_CITATION_STANDARD.md` | Deep research, source verification, evidence strength, and citation discipline |
| `06_TESTING_SECURITY_AND_RELEASE_STANDARD.md` | Proportionate tests, security baseline, defects, release gates, and final verification |
| `07_PROJECT_EVIDENCE_AND_TRACEABILITY_STANDARD.md` | Objective-to-code-to-test-to-report traceability and defence evidence |
| `08_FINAL_REPORT_COMPILATION_PLAN_TEMPLATE.md` | Front matter, chapter merge, references, pagination, fields, and submission QA |
| `AGENTS.md` | Enforceable instructions for an AI agent working inside the documentation folder |
| `templates/` | Registers and checklists to copy and complete during the new project |

## Non-transfer Rule

Transfer the process, not the facts. Never copy another project's objectives,
system features, dataset claims, model results, screenshots, tests, citations,
or conclusions into a new report. The new repository and verified evidence are
always the source of truth.

## Recommended Folder Placement

```text
new-project/
├── AGENTS.md
├── project-profile.md
├── frontend/ or client/
├── backend/ or server/
├── machine-learning/          # only when applicable
├── tests/
├── docs/
├── project-documentation/
├── project-evidence/
└── scripts/
```

## Control Principle

Plan narrowly, implement one verified slice at a time, preserve authentic
evidence as work proceeds, and write only what the completed system and current
research can support.
