Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `03`
Status: `LOCKED`
LockedAt: `2026-07-08T12:47:03Z`
LockHash: `667c9d2ac189df1c17167115f0f2596cae99ed39381b09b9ec1e245e1c4e5277`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-04.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-05.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-04.md` (DRAFT)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-05.md` (DRAFT)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.audit-remediation.addendum-03.md`
Scope note: This addendum records the rebuilt packaged-runtime manual QA that was executed against `127.0.0.1:3456` using the worktree-built binary and canonical Pi/Craft alias request paths.

## TODO

- [x] Launch the rebuilt packaged runtime on `127.0.0.1:3456`
- [x] Drive Pi and Craft alias requests through `difficulty.remote-only`
- [x] Capture direct exact `chatgpt/gpt-5.4` proof on the rebuilt listener
- [x] Save request-detail and telemetry receipts under the run-local evidence folder

## Execution Record

- Rebuilt runtime surface: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- Base URL: `http://127.0.0.1:3456`
- Runtime state root: `C:\Users\erikb\AppData\Local\Role Model Runtime`
- Scope: `standalone-runtime`
- Runtime log files:
  - `/.runtime-logs/runtime-3456.stdout.log`
  - `/.runtime-logs/runtime-3456.stderr.log`

## Live Cases

| ID | Case | Result | Key proof |
| --- | --- | --- | --- |
| `Q-D3` | Pi alias streamed text on `difficulty.remote-only` | PASS | `providerId/providerFamily = deepseek`; first chunk was not reasoning-only |
| `Q-D4` | Craft alias streamed text on `difficulty.remote-only` | PASS | `providerId/providerFamily = deepseek`; first chunk was not reasoning-only |
| `Q-C3` | Pi alias inline-image on `difficulty.remote-only` | PASS | `providerId/providerFamily = openai`; `vendorId = codex-app-server`; `adapterFamily = ai-sdk-openai` |
| `Q-C4` | Craft alias inline-image on `difficulty.remote-only` | PASS | `providerId/providerFamily = openai`; `vendorId = codex-app-server`; `adapterFamily = ai-sdk-openai` |
| `Q-D1` | Direct exact `chatgpt/gpt-5.4` | PASS | `200`; `providerId/providerFamily = openai`; no active cooldowns surfaced |

Supplemental diagnostic:

- `q-c3-pi-alias-tools`
  - selected `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - treated as supplemental only because `Q-C3` was satisfied by the Pi image-bearing alias case

## Evidence Paths

- live summary:
  - `evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/summary.json`
- per-case receipts:
  - `evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/q-d3-pi-alias-stream-text.json`
  - `evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/q-d4-craft-alias-stream-text.json`
  - `evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/q-c3-pi-alias-inline-image.json`
  - `evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/q-c4-craft-alias-inline-image.json`
  - `evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/q-d1-direct-exact-gpt.json`
- packaged listener startup:
  - `/.runtime-logs/runtime-3456.stdout.log`
- packaged listener stderr:
  - `/.runtime-logs/runtime-3456.stderr.log`

## Findings

- The packaged rebuilt runtime is the listener on `127.0.0.1:3456`.
- Alias-routed Pi and Craft text requests used the canonical alias and preserved actual DeepSeek provider identity.
- Alias-routed Pi and Craft image-bearing requests used the canonical alias and preserved actual OpenAI provider identity plus `vendorId = codex-app-server`.
- The final clean live runtime did not carry an active GPT cooldown, so the live `Q-D2` denial path was not observed on `:3456`.
- The cooldown-denial behavior remains covered by deterministic focused tests and by the new request-detail/endpoint cooldown receipts implemented in addendum 05.

## Requirement Delta

- `R8` | Status: `verified locally` | live request-detail receipts on `:3456` expose truthful provider/vendor/execution/adapter fields
- `R10` | Status: `verified locally` | canonical alias proof was executed through both Pi and Craft request paths on the rebuilt runtime
- `R11` | Status: `pending external CI` | local packaged runtime, focused suites, and live alias verification are green; external CI remains outside this turn

## Coverage Gate

- [x] Pi and Craft text alias requests were verified live on the rebuilt listener
- [x] Pi and Craft image-bearing alias requests were verified live on the rebuilt listener
- [x] Direct exact GPT routing was verified live on the rebuilt listener
- [x] Rebuilt-runtime evidence is stored under the run-local addendum-05 folder

Coverage: PASS

## Approval Gate

- [x] The proof uses canonical aliases instead of invented alias ids
- [x] Provider, vendor, execution, and adapter facts are recorded separately in the receipts
- [x] The packaged listener on `:3456` was the actual process under test
- [x] The absence of a live cooldown-denial case on the clean final state is explicitly documented

Approval: PASS

## Audit Verdict

Audit: PASS
