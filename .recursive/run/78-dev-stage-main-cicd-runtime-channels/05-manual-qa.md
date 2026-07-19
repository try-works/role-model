Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `05 Manual QA`
Status: `DRAFT`
Inputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/02-to-be-plan.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/logs/green/workflow-runtime-migration-green.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/logs/red/workflow-runtime-migration-red.md`
Outputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/05-manual-qa.md`
Scope note: Scaffolds the manual-QA receipt and captures any preview URL evidence that should appear in the QA record.

## TODO

- [ ] Declare the QA execution mode and supporting evidence
- [ ] Record the manual QA scenarios and observed results
- [ ] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: agent-operated
- Agent Executor: populate the actual executor before locking
- Tools Used: populate the actual tools used before locking
- Evidence Path: populate the concrete QA evidence path before locking

## QA Scenarios and Results

- Record each manual QA scenario and observed result here before locking.

## Evidence and Artifacts

- List concrete evidence paths under `/.recursive/run/<run-id>/evidence/` that support this phase.

## User Sign-Off

- Approved by: N/A (set a real approver when QA mode requires human sign-off)
- Date: N/A (set a real approval date when required)

## Traceability

- Map the closeout evidence back to the in-scope requirements before locking.

## Coverage Gate

- Replace these checklist items with phase-specific proof before locking.
Coverage: FAIL

## Approval Gate

- Replace these checklist items with phase-specific approval proof before locking.
Approval: FAIL
