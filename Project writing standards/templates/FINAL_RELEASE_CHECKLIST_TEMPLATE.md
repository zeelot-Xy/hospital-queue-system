# Final Release Checklist

## Scope and Evidence

- [ ] Title, aim, objectives, requirements, and implemented scope agree.
- [ ] Every achieved objective has implementation and test evidence.
- [ ] Planned/unimplemented work is labelled accurately.
- [ ] Evidence contains no secrets or real sensitive data.

## Code and Configuration

- [ ] Intended diff reviewed; unrelated user changes preserved.
- [ ] Direct dependencies pinned and consistency checks pass.
- [ ] `.env.example` is complete and live `.env` files are ignored.
- [ ] Production-required secrets fail closed.
- [ ] Migrations reproduce the database from a clean state.
- [ ] Model/data artefact versions and hashes agree where applicable.

## Quality Gates

- [ ] Backend lint and tests pass: [RESULT]
- [ ] Frontend lint, tests, type check, and build pass: [RESULT]
- [ ] Model/data tests pass: [RESULT]
- [ ] Migration cycle passes: [RESULT]
- [ ] Full integration workflow passes: [RESULT]
- [ ] Manual responsive/browser/print checks pass: [RESULT]
- [ ] Security review has no unhandled high-risk finding.
- [ ] Accessibility review is complete for the project scope.

## Documentation

- [ ] README and installation commands were re-run.
- [ ] API/data/ML/testing/user/deployment guides match current behaviour.
- [ ] Local documentation links resolve.
- [ ] Release boundaries and known limitations are explicit.
- [ ] Academic chapters and technical evidence agree.

## Version and Approval

- [ ] Final commit scope approved.
- [ ] Milestone summary completed.
- [ ] Release tag authorised and verified against the intended commit.
- [ ] Owner has approved the review build.
- [ ] Submission DOCX fields updated and layout reviewed.
- [ ] Submission PDF generated from the approved DOCX.
