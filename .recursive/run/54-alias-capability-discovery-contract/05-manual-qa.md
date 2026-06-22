Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-22T05:30:26Z`
LockHash: `ebd417254615d9265664f1662c354e37b2f33f6bffe5e825c6cf857bdc393f3f`
Inputs:
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/02-to-be-plan.md`
- `/.recursive/run/54-alias-capability-discovery-contract/03-implementation-summary.md`
- `/.recursive/run/54-alias-capability-discovery-contract/04-test-summary.md`
Outputs:
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/runtime-probes-real-state/`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/runtime-probes-post-all-aliases/`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/pi-probe/`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/pi-probe-post-all-aliases/`

## TODO

- [x] Declare QA execution mode
- [x] Execute updated-runtime discovery scenario
- [x] Execute all-configured-alias readback scenario
- [x] Execute Pi configured-endpoint discovery mapping scenario
- [x] Review capability-constrained request evidence
- [x] Confirm runtime process was stopped after QA
- [x] Audit QA evidence against the plan scenarios

## QA Execution Mode

QA Execution Mode: `agent-operated`

Human sign-off is not required for this run because the plan declared agent-operated
QA and no Pi UI or manual-only downstream workflow was available under `D:\pi\agent`.

## Scenario Results

### Scenario 1: Start the updated runtime on Pi's configured port

Result: PASS

- Started the updated worktree runtime on `127.0.0.1:3456`.
- Health returned a degraded-but-serving runtime state with rehydrated remote endpoints.
- Evidence:
  - `evidence/runtime-probes-post-all-aliases/summary.json`
  - `evidence/runtime-probes-post-all-aliases/downstream-openai.json`

### Scenario 2: Rich discovery returns the alias capability contract

Result: PASS

- `GET /api/role-model/downstream/openai` returned
  `role-model.downstream.openai.v1`.
- `hybrid.hybrid` reported:
  - safe context window `262144`
  - safe max output `128000`
  - max context window `1050000`
  - max output `384000`
  - guaranteed input `text`
  - available input `image`, `pdf`, `text`, `video`
  - tool calling, reasoning, and structured output support
- Evidence:
  - `evidence/runtime-probes-post-all-aliases/summary.json`
  - `evidence/runtime-probes-post-all-aliases/downstream-openai.json`

### Scenario 3: Discovery covers every configured alias

Result: PASS

- Runtime config `model_aliases` contained `15` aliases.
- Rich discovery emitted `15` alias records.
- Missing aliases from discovery: none.
- Unexpected aliases in discovery: none.
- Evidence:
  - `evidence/runtime-probes-post-all-aliases/alias-config-discovery-comparison.json`

### Scenario 4: Pi configured endpoint can discover replacement values

Result: PASS with Pi-side follow-up

- Pi provider config points `role-model` to `http://127.0.0.1:3456/v1`.
- Pi model config contains `hybrid.hybrid`.
- Pi's static entry remains stale:
  - context window `128000`
  - max tokens `16384`
  - input `text`
  - reasoning `false`
- The same configured endpoint now exposes:
  - context window `262144`
  - max tokens `128000`
  - available input `image`, `pdf`, `text`, `video`
  - function tools `true`
  - reasoning `true`
  - structured output `true`
- No local Pi discovery executable or API command was found under `D:\pi\agent`.
- Evidence:
  - `evidence/pi-probe-post-all-aliases/pi-role-model-discovery.json`

Follow-up: Pi needs a consumer-side change to call
`/api/role-model/downstream/openai` and replace its stale static local fields with
the discovered values.

### Scenario 5: Capability-constrained alias routing is enforced

Result: PASS

- Prior updated-runtime evidence sent image input to a DeepSeek text-only target.
- The runtime returned HTTP `400` with stable `no_eligible_target`.
- Excluded target reason included `missing_input.image`.
- Client-facing error evidence was sanitized.
- Evidence:
  - `evidence/runtime-probes-real-state/deepseek-image-rejection.json`
  - `evidence/runtime-probes-real-state/deepseek-image-rejection-sanitized.json`

### Scenario 6: Runtime cleanup

Result: PASS

- The updated worktree runtime was stopped after QA.
- `127.0.0.1:3456/healthz` returned stopped/unreachable after shutdown.

## Audit Execution

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed multi-agent tooling earlier in the
  run.
- Delegation Decision Basis: QA was agent-operated with direct HTTP/file evidence; no
  separate delegated QA runner was needed.
- Delegation Override Reason: The direct QA evidence was complete and a subagent would
  not have access to a better Pi automation surface.
- Audit Inputs Provided: Phase 2 QA plan, Phase 4 test summary, live runtime evidence,
  Pi configured-endpoint evidence, and capability-constrained request evidence.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct inspection of QA evidence files and command
  outputs.
- Acceptance Decision: `accepted`.
- Refresh Handling: not applicable.
- Repair Performed After Verification: none.

## Requirement Completion Status

- `R10`: `verified`; Pi configured-endpoint mapping is captured with a clear Pi-side
  follow-up.
- `R12`: `verified`; updated-runtime and Pi-configured verification were executed.
- `R13`: `verified`; docs were built after alias lifecycle documentation updates.
- All other requirements remain verified by Phase 4 automated and runtime evidence.

## Coverage Gate

- [x] Planned QA scenarios were executed
- [x] Pi configured endpoint was inspected
- [x] Live updated runtime was queried
- [x] All configured aliases were compared against discovery
- [x] Capability-constrained routing evidence was reviewed
- [x] Runtime shutdown was verified

Coverage: PASS

## Approval Gate

- [x] QA evidence is sufficient for Phase 6 decisions update
- [x] Pi-side gap is stated as a follow-up, not hidden
- [x] No human-only QA dependency remains

Approval: PASS

## Audit Gate

- [x] Effective inputs re-read
- [x] QA evidence reconciled with plan scenarios
- [x] Runtime and Pi evidence paths resolve

Audit: PASS
