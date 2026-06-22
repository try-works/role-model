Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Phase: `05 Manual QA Addendum`
Status: `PASS`
CreatedAt: `2026-06-22T08:02:33Z`
Inputs:
- `/.recursive/run/54-alias-capability-discovery-contract/05-manual-qa.md`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/pi-alias-matrix/summary.json`
Outputs:
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/pi-alias-matrix/summary.json`

## Context

After the locked Phase 5 receipt, additional Pi-operated QA verified the behavior the
user specifically requested: Pi must be able to configure role-model aliases without
issues, and at least three prompts must be sent from Pi to each alias.

The locked `05-manual-qa.md` remains valid for its original scenarios. This addendum
extends the manual QA evidence with the later alias matrix and supersedes the earlier
Pi-side follow-up-only conclusion for alias configuration.

## QA Execution Mode

QA Execution Mode: `agent-operated`

Human sign-off is represented by the user's instruction to mark manual QA as pass and
continue the run after reviewing the observed Pi behavior.

## Scenario 7: Pi can discover and configure every alias

Result: PASS

- `pi --provider role-model --list-models role-model` listed all `15` configured
  role-model aliases.
- Each alias was listed with:
  - context window `262.1K`
  - max output `128K`
  - thinking `yes`
  - images `yes`
- Concrete DeepSeek models still correctly showed image support as `no`, proving Pi did
  not flatten every model to a single multimodal posture.

Evidence:

- `evidence/pi-alias-matrix/summary.json`

## Scenario 8: Three Pi-originated prompts per alias

Result: PASS

Role-model telemetry showed at least three successful Pi-originated requests for every
configured alias:

| Alias | Successful Requests | Failures |
| --- | ---: | ---: |
| `baseline.decision-only` | 6 | 0 |
| `baseline.hybrid` | 4 | 0 |
| `baseline.remote-only` | 8 | 0 |
| `controller.decision-only` | 3 | 0 |
| `controller.hybrid` | 3 | 0 |
| `controller.remote-only` | 7 | 0 |
| `default.decision-only` | 6 | 0 |
| `default.hybrid` | 6 | 0 |
| `default.remote-only` | 6 | 0 |
| `difficulty.decision-only` | 6 | 0 |
| `difficulty.hybrid` | 6 | 0 |
| `difficulty.remote-only` | 97 | 0 |
| `hybrid.decision-only` | 5 | 0 |
| `hybrid.hybrid` | 10 | 0 |
| `hybrid.remote-only` | 4 | 0 |

Evidence:

- `evidence/pi-alias-matrix/summary.json`
- Runtime telemetry source:
  `GET http://127.0.0.1:3456/api/role-model/telemetry/requests?limit=700`

## Process Hygiene

Result: PASS

- No leftover Pi alias-smoke processes remained after QA.
- The role-model runtime remained running on `127.0.0.1:3456`, PID `43932`.
- Pi noninteractive processes still sometimes stay alive after role-model completes the
  backend request; role-model telemetry was used as the authoritative backend receipt,
  and only marker-specific smoke processes spawned for this QA were terminated.

## Requirement Completion Status

- `R10`: `verified`; Pi can discover all aliases and configure them with correct
  context/max-output/thinking/image metadata from the role-model provider.
- `R12`: `verified`; updated runtime and Pi-configured runtime verification now include
  all-alias prompt execution, not only read-only endpoint mapping.
- `R13`: `verified`; downstream consumers still have the rich discovery doc and compact
  `/v1/models` metadata, and Pi has been proven against the compact route.

## Coverage Gate

- [x] Pi alias discovery was executed against the configured role-model provider
- [x] All `15` aliases were listed by Pi
- [x] At least three Pi-originated prompts reached role-model for each alias
- [x] All alias prompt rows succeeded
- [x] Process cleanup was verified

Coverage: PASS

## Approval Gate

- [x] Manual QA can be marked pass for Pi alias configuration and alias prompt routing
- [x] The previous Pi follow-up-only caveat is superseded for alias configuration
- [x] The run can continue to updated closeout receipts

Approval: PASS
