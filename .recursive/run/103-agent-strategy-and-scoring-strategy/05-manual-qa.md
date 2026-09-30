Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-09-30T13:48:16Z`
LockHash: `f701d33d2350c198a4b2ba5c8def4cdcabf5d378468fabf3fcb2272d76c471a9`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md` (LOCKED)
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md`
Scope note: Records the rebuilt packaged runtime, the live pi-CLI matrix of design document section 10.3 and
requirement R12, the receipts the live decisions carried, and the one live finding the matrix produced.

## TODO

- [x] Rebuild the packaged runtime from this worktree (`runtime:package-sea`) against the paired private distribution
- [x] Start the rebuilt development-channel runtime on `:3458` with a clean QA posture config
- [x] Install the pi role-model package and drive the live matrix with `pi --no-session --provider role-model --model <alias> -p "<prompt>"`
- [x] Inspect each live decision for the effective strategy, `strategy_source`, weights digest and the latency-override outcome
- [x] Record the latency-override absence honestly (off by default, no authorized evidence in the window)
- [x] Repair the live finding (the compact observation stub dropped the run-103 receipts) and re-verify

## QA Execution Record

- QA Execution Mode: agent-operated
- Agent Executor: `/root` (controller), driving the packaged runtime and the pi CLI directly
- Tools Used: `corepack pnpm run runtime:package-sea`, the packaged `role-model-dev.exe` (SHA-256
  `ee6b5cbb24483d43f789ea79ffb3a153e69f1ba6ba9b40a72ca90fe04b0e3485`), `pi` 0.84.2 with
  `pi install ./packages/pi-role-model`, `Invoke-WebRequest`/`Invoke-RestMethod` against
  `http://127.0.0.1:3458`, and `node:sqlite` reads of the dev state root's observation ledger
- Environment: development channel (`role-model-dev.exe`, `127.0.0.1:3458`, dev state root
  `%LOCALAPPDATA%\role-model-runtime-dev`), two activated remote endpoints
  (`deepseek.personal.run103.global.deepseek-v4-pro`, `deepseek.personal.run103.global.deepseek-v4-flash`); the
  user's stage runtime on `:3457` and production on `:3456` were not touched.
- Start command: `role-model-dev.exe --port 3458 --runtime-state-root %LOCALAPPDATA%\role-model-runtime-dev --unified-runtime-config <qa-config> --operator-auth-token <qa-token>`
- Result: `status=healthy`, `ready=true`; every live request below returned a real provider answer.

## QA Scenarios and Results

| # | Scenario | Expected | Observed | Verdict |
| --- | --- | --- | --- | --- |
| S1 | Rebuilt runtime + SEA gate (R12) | `runtime:package-sea` produces an executable from this worktree and the private distribution pairs with it | `role-model-dev.exe` sha256 `ee6b5cbb…`; private distribution rebuilt against this worktree's source tree (13 extensions, sidecar `7471af1f…`); `/healthz` `healthy`, `ready=true` | PASS |
| S2 | Preset scoring posture | saved `balanced` ranks the request; the decision records who chose it | `baseline.remote-only` → `strategy balanced`, `source operator` (the operator saved `balanced` explicitly), weights digest `sha256:8c49b853…` | PASS |
| S3 | Custom weights posture | `custom` travels with its weights and digest | `baseline.remote-only` → `strategy custom`, `source operator`, `weights {quality 0.35, latency 0.1, throughput 0.05, cost 0.35, reliability 0.1, preference 0.05}` + digest | PASS |
| S4 | Pinned posture on a hard request | the pin keeps the saved strategy and records the difficulty override it discarded | hard prompt → `difficulty hard`, receipt `strategy latency`, `source operator`, `discarded {source difficulty, strategy quality}` | PASS |
| S5 | Unpinned hard request | difficulty decides (`hard` → `quality`) | hard prompt → receipt `strategy quality`, `source difficulty` | PASS |
| S6 | Intelligent mode with controller guidance | the controller's directive decides and the receipt says so | `controller.remote-only` → `controllerRouting.active true`, accepted `strategy balanced`, receipt `strategy balanced`, `source controller` | PASS |
| S7 | Agent strategy alias | the alias binds the role preset and its strategy | `coder.remote-only` → `aliasPostureBinding {kind role, presetRoleId coder, roleSource preset, scoringStrategy quality}`, receipt `strategy quality`, `source operator` | PASS |
| S8 | Workload alias | the alias binds the workload posture | `batch.remote-only` → `aliasPostureBinding {kind workload, roleSource none, scoringStrategy cost}`, receipt `strategy cost`, `source operator` | PASS |
| S9 | Measured-latency override | it acts only with authorized evidence; otherwise its absence is recorded | every decision carries `latencySelection {outcome disabled, reason "measured-latency selection input is not authorized"}`; the override is off by default and the window has no S2-stage evidence, so it did not act - recorded, not hidden | PASS (recorded) |
| S10 | Decision readback + UI surface | the live decision detail exposes the receipt | `/api/role-model/router/decisions/<id>` and `/api/role-model/requests/<id>` carry `strategyResolution`, `aliasPostureBinding` and `latencySelection` after the S11 repair | PASS |
| S11 | Live finding and repair | a live decision must carry the receipt the design promises | first live pass: 0 of 80 stored observations carried `strategyResolution`; the compact observation stub's allowlist dropped it (the capture is deferred on this runtime, so the stub *is* the decision record). Repaired in `790da3e2`, repackaged, and S2-S8 above were re-run on the new executable | PASS (repaired) |

Live commands (each one is the documented QA form):

```
pi install ./packages/pi-role-model
$env:ROLE_MODEL_ENDPOINT="http://127.0.0.1:3458"
pi --no-session --provider role-model --model baseline.remote-only -p "Reply with exactly: P5-S1-OK"
pi --no-session --provider role-model --model controller.remote-only -p "Route this with the controller: ..."
```

## Evidence and Artifacts

- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/package-sea.log` - the packaging run
  that produced the executable (`outputPath`, `sha256`).
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/sea-sha256.txt` - the executable digest.
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/private-distribution.log` - the paired
  private distribution rebuilt against this worktree.
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/runtime-config.yaml` - the QA posture
  config the runtime materialised from.
- The live decisions, each with `routingMode`, `controllerRouting`, `strategyResolution`,
  `aliasPostureBinding` and `latencySelection`:
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s1-preset.receipt.json`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s2-custom.receipt.json`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s3-pinned-hard.receipt.json`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s4-unpinned-hard.receipt.json`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s5-agent-strategy.receipt.json`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s6-workload.receipt.json`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s7-intelligent.receipt.json`.
- The pi CLI responses:
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s1-preset.pi.txt`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s3-pinned-hard.pi.txt`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s5-agent-strategy.pi.txt`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/p5-s7-intelligent.pi.txt`.
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/dev-3458.err.log` - the runtime's own
  log, including the posture materialisation warnings and the empty-scope (`ALIAS_POOL_EMPTY`) reports.
- The first live pass, kept as the evidence of the S11 finding (superseded by the `p5-*` receipts):
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/s1-preset-baseline.pi.txt`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/s2-custom-weights.pi.txt`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/s3-pinned-hard.pi.txt`,
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/phase5/s3c-pinned-hard.receipt.json`.
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/logs/green/p5-stub-fidelity-green.log` - the
  regression test that pins the S11 repair.

## User Sign-Off

- Not required: `QA Execution Mode: agent-operated`. The operator's acceptance point is the pull request and the
  stage promotion, both outside this run.

## Traceability

| Requirement | QA surface | Evidence |
| --- | --- | --- |
| R1 posture split | S2, S3 (mode + scoring strategy + weights round-trip through the live config API) | `evidence/phase5/p5-s2-custom.receipt.json`, `runtime-config.yaml` |
| R2 precedence and pin split | S4, S5 (pinned vs unpinned hard request) | `evidence/phase5/p5-s3-pinned-hard.receipt.json`, `p5-s4-unpinned-hard.receipt.json` |
| R3 provenance and honest readback | S6, S10, S11 (controller source, decision readback, stub repair) | `evidence/phase5/p5-s7-intelligent.receipt.json`, `evidence/logs/green/p5-stub-fidelity-green.log` |
| R4 Intelligent mode | S6 | `evidence/phase5/p5-s7-intelligent.receipt.json` |
| R5 agent strategy postures | S7 | `evidence/phase5/p5-s5-agent-strategy.receipt.json` |
| R6 workload postures | S8 | `evidence/phase5/p5-s6-workload.receipt.json` |
| R7 measured-latency override | S9 (absence recorded with its reason) | `evidence/phase5/p5-s1-preset.receipt.json` |
| R8 operator surfaces | the live readback the UI renders (S10) | `evidence/phase5/p5-s5-agent-strategy.receipt.json` |
| R9 Effect-first implementation | the SEA carries the Effect runtime (the packaging bundles `packages/effect`; the run-101 gate re-verified) | `evidence/phase5/package-sea.log` |
| R10 extensibility | the live config surfaces the canonical vocabulary and no synonym round-trips | `evidence/phase5/p5-s2-custom.receipt.json` |
| R11 strict TDD | the S11 repair is pinned by a test written with it | `evidence/logs/green/p5-stub-fidelity-green.log` |
| R12 live pi-CLI verification | S1-S11 above | this artifact and `evidence/phase5/` |

## Coverage Gate

- [x] The packaged runtime was rebuilt from this worktree and started on the development channel
- [x] The documented live pi-CLI form drove every scenario
- [x] Each decision was inspected for the effective strategy, source, weights digest and latency outcome
- [x] The latency-override absence is recorded honestly instead of claimed
- [x] The one live finding was repaired, repackaged and re-verified on the new executable

Coverage: PASS

## Approval Gate

- [x] No production or stage process was restarted; `:3457` and `:3456` were untouched
- [x] The QA window used the development profile, its own state root and a QA-owned posture config
- [x] Live evidence lives under the run folder
- [x] Remaining work: Phases 6-8 closeout

Approval: PASS
