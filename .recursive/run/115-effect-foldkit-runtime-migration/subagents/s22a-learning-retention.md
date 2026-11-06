# Subagent Action Record

## Metadata
- Subagent ID: `s22a-learning-retention`
- Run ID: `115-effect-foldkit-runtime-migration`
- Phase: `03 Implementation`
- Purpose: `Characterize public trial/learning retention with mutations (R31)`
- Execution Mode: `analyst`
- Timestamp: `2026-10-24T20:27:44Z`
- Action Record Path: `/.recursive/run/115-effect-foldkit-runtime-migration/subagents/s22a-learning-retention.md`

## Inputs Provided
- Current Artifact: `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s22a-tdd.json`
- Artifact Content Hash: `e7a467d3116792ef3eed5518bded6590873dbb7d451176680d10a15894c8d035`
- Upstream Artifacts:
- `/.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md`
- Addenda:
- none
- Review Bundle: `/.recursive/run/115-effect-foldkit-runtime-migration/tasks/s22a-learning-retention.md`
- Diff Basis: `See /.recursive/run/<run-id>/00-worktree.md for the normalized diff basis used.`
- Code Refs:
- none
- Memory Refs:
- none
- Audit / Task Questions:
- none

## Routing
- Router Used: `Agent Teams spawn (session model)`
- Routed Role: `none`
- Routed CLI: `none`
- Routed Model: `deepseek-flash`
- Routing Config Path: `none`
- Routing Discovery Path: `none`
- Routing Resolution Basis: `none`
- Routing Fallback Reason: `none`
- CLI Probe Summary: `none`
- Prompt Bundle Path: `none`
- Invocation Exit Code: `0`
- Output Capture Paths:
- `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/router/s22a-learning-retention.jsonl`

## Claimed Actions Taken
- Located the public learning orchestration, proved eight retention behaviours by mutation, and identified which R31 clauses live entirely in the private extensions

## Claimed File Impact
### Created
- none
### Modified
- none
### Reviewed
- `/role-model-router/apps/runtime-host-bridge/src/track-b-holdout-split.ts`
- `/role-model-router/apps/runtime-host-bridge/src/track-b-learning-pass.ts`
### Relevant but Untouched
- none

## Claimed Artifact Impact
### Read
- none
### Updated
- none
### Evidence Used
- `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s22a-tdd.json`

## Claimed Findings
- Provider receipts, holdout identity, provenance, tie/floor/rollback, no-raw aggregation and the revocation epoch fence are public and mutation-pinned; submitted-output reuse, the real floor gate, lease/sandbox enforcement, profile publication and the late-ack outbox have no public implementation at all

## Verification Handoff
- Inspect first:
- `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s22a-tdd.json`
- Notes:
- Controller ran four of the named learning suites (15/15) after correcting its own filename guesses
