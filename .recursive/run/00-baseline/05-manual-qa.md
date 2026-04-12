Run: `/.recursive/run/00-baseline/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-04-12T03:31:53Z`
LockHash: `4c7be67d8c522b8da08af937c4bdfab8ec19b9516e263a31ab6a755dc7ab9bac`
Inputs:
- `/.recursive/run/00-baseline/02-to-be-plan.md`
- `/.recursive/run/00-baseline/04-test-summary.md`
Outputs:
- `/.recursive/run/00-baseline/05-manual-qa.md`
Scope note: This document records the agent-operated manual QA outcomes for the stable baseline repo in the absence of a browser UI or Playwright harness.
QA Execution Mode: agent-operated

## TODO

- [x] Read Phase 2 plan (QA scenarios)
- [x] Declare QA execution mode
- [x] Present QA scenarios to the user if human input is required
- [x] **PAUSE if needed:** Wait for user execution/sign-off when the selected mode requires it
- [x] Record observed outcomes for each scenario
- [x] Document pass/fail status
- [x] Record QA execution metadata and evidence
- [x] Record user sign-off if the selected mode requires it
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## QA Scenarios and Results

| Scenario | Expected | Observed | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Repo navigation | Root and router READMEs explain the repo split, baseline scope, and deferred items | Root docs describe the protocol repo, router family, and scaffold-only future runtime boundary | PASS | `/README.md` and `/role-model-router/README.md` were inspected directly |
| Schema tooling | Schema validation and generated protocol types work from canonical schemas | The recorded validation chain completed successfully | PASS | See green validation log |
| Routing conformance | Deterministic router tests pass | `7/7` conformance tests passed | PASS | See green validation log |
| Gateway smoke | Router decision, trace, usage, and observed-performance artifacts are emitted | Smoke artifacts exist and were copied into run evidence | PASS | See copied evidence paths |
| Config export | Stable machine-readable config export is emitted | `config-export.json` exists for the CLI endpoint | PASS | Copied evidence confirms the export |
| Rust placeholders | Native placeholder crates compile and test successfully | Both placeholder crates passed unit tests | PASS | See green validation log |

## Evidence and Artifacts

Store and reference artifacts under:
- `/.recursive/run/00-baseline/evidence/`
  - `evidence/logs/green/final-validation.log`
  - `evidence/other/router-decision.json`
  - `evidence/other/config-export.json`
  - `evidence/other/usage-events.jsonl`
  - `evidence/perf/observed-performance.json`
  - `evidence/traces/trace-spans.json`
  - `evidence/traces/trace-events.jsonl`

## QA Execution Record

QA Execution Mode: agent-operated
- Agent Executor: main agent
- Tools Used: PowerShell, `corepack pnpm`, `cargo`, direct file inspection
- Evidence:
  - `/.recursive/run/00-baseline/evidence/logs/green/final-validation.log`
  - `/.recursive/run/00-baseline/evidence/other/router-decision.json`
  - `/.recursive/run/00-baseline/evidence/other/config-export.json`
  - `/.recursive/run/00-baseline/evidence/other/usage-events.jsonl`
  - `/.recursive/run/00-baseline/evidence/perf/observed-performance.json`
  - `/.recursive/run/00-baseline/evidence/traces/trace-spans.json`
  - `/.recursive/run/00-baseline/evidence/traces/trace-events.jsonl`

## User Sign-Off

- Approved by: N/A (`agent-operated` mode)
- Date: N/A
- Notes: Human sign-off was not required for the selected QA mode.

## Traceability

- `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, `R15`, `R16`, `R17`, `R18`, `R19`, `R20` -> repo navigation, schema tooling, and shared protocol/package surfaces were manually inspected or validated. | Evidence: `/README.md`, `/role-model-router/README.md`, `/.recursive/run/00-baseline/evidence/logs/green/final-validation.log`
- `R21`, `R22`, `R23`, `R24`, `R25`, `R26` -> routing behavior and conformance remained correct during QA. | Evidence: `/.recursive/run/00-baseline/evidence/logs/red/router-conformance-red.log`, `/.recursive/run/00-baseline/evidence/logs/green/final-validation.log`
- `R27`, `R28`, `R29`, `R30`, `R31`, `R32`, `R33`, `R34`, `R35`, `R36`, `R37`, `R38`, `R39`, `R40`, `R41`, `R42` -> smoke/config/runtime outputs were manually checked through copied evidence artifacts. | Evidence: `/.recursive/run/00-baseline/evidence/other/router-decision.json`, `/.recursive/run/00-baseline/evidence/other/config-export.json`, `/.recursive/run/00-baseline/evidence/other/usage-events.jsonl`, `/.recursive/run/00-baseline/evidence/perf/observed-performance.json`, `/.recursive/run/00-baseline/evidence/traces/trace-events.jsonl`, `/.recursive/run/00-baseline/evidence/traces/trace-spans.json`
- `R43`, `R44`, `R45`, `R46`, `R47`, `R48`, `R49`, `R50`, `R51`, `R52`, `R53`, `R54`, `R55`, `R56`, `R57`, `R58`, `R59`, `R60` -> shared packages, rust placeholders, CI-ready validation flow, and repo closeout surfaces remained QA-clean. | Evidence: `/.recursive/run/00-baseline/evidence/logs/green/final-validation.log`, `/packages/store-contract/src/index.ts`, `/role-model-router/rust/Cargo.toml`

## Coverage Gate

- [x] QA scenarios from Phase 2 are represented
- [x] Observed results are recorded for all executed scenarios
- [x] QA execution mode is declared
- [x] Required execution metadata/evidence for that mode is present

Coverage: PASS

## Approval Gate

- [x] The selected QA mode's completion requirements are satisfied
- [x] Human sign-off is present if mode is `human` or `hybrid`
- [x] Agent execution evidence is present if mode is `agent-operated` or `hybrid`

Approval: PASS
