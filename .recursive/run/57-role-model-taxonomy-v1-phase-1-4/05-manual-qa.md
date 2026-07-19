Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-24T16:50:00Z`
LockHash: `c3366aa75129331a8109212045444b6a97c99102816b03cd644d8cee8e0ce0c1`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/04-test-summary.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
Scope note: Records agent-operated rebuilt-runtime and real-Pi QA for proposal Phase 1-4 scope, including Phase 5 TDD repairs and documented QA-runtime backend limitations.
QA Execution Mode: `agent-operated`
Audit Result: `PASS_WITH_QA_RUNTIME_LIMITATION`

## TODO

- [x] Re-read the approved proposal as the Phase 5 verification checklist
- [x] Rebuild Role-Model runtime package from the run 57 worktree
- [x] Rebuild and pack `pi-role-model` from the run 57 worktree
- [x] Launch the rebuilt runtime locally
- [x] Install/update the rebuilt `pi-role-model` package in the local Pi instance
- [x] Verify Pi loads the run 57 extension command and skill
- [x] Command Pi to configure and inspect the Role-Model endpoint and alias
- [x] Command Pi to send proposal request prompts with taxonomy intent
- [x] Inspect runtime taxonomy, downstream discovery, router, request, and UI surfaces
- [x] Repair Phase 5 defects through TDD and rerun affected verification
- [x] Record benchmark and telemetry as later-phase placeholders only

## QA Execution Record

- Agent Executor: Codex in the isolated run 57 worktree
- Tools Used: PowerShell shell commands, `corepack pnpm`, real local `pi --mode rpc`, local HTTP probes, Node capture servers, recursive lock tooling
- Worktree: `D:/DEV/role-model/.worktrees/57-role-model-taxonomy-v1-phase-1-4`
- Runtime Endpoint: `http://127.0.0.1:4567`
- Pi Package Source: `D:/DEV/role-model/.worktrees/57-role-model-taxonomy-v1-phase-1-4/packages/pi-role-model`
- Evidence Root: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/`

## QA Scenarios and Results

| Scenario | Evidence | Result |
| --- | --- | --- |
| Rebuild runtime and Pi package | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-package-sea-after-pi-compat.log`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-package-build-final.log`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-package-pack-final.log` | PASS |
| Launch rebuilt runtime and probe discovery/taxonomy | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-probes-clean-after-compat.json` | PASS |
| Install/update Pi package and load extension/skill | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-install-worktree-path.log`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-list-clean-run57-only-final.log`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-rpc-get-commands-run57-only.log` | PASS |
| Configure endpoint and alias through Pi | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-rpc-persistent-command-checklist-final.log` | PASS |
| Send taxonomy-classified requests through Pi provider transport | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-transport-capture-six-proposal-prompts.log` | PASS |
| Exercise rebuilt runtime routing/UI surfaces | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-ledgers-after-pi-routed-prompt.json`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-ui-route-probes.json` | PASS_WITH_QA_RUNTIME_LIMITATION |
| Final affected tests and builds | `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-package-test-final.log`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/host-index-taxonomy-tests-final-rerun.log`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/core-taxonomy-routing-tests-final.log` | PASS |

## Proposal Verification Source

Phase 5 used `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` as the explicit verification checklist for proposal Phase 1-4 scope.

| Item | Evidence | Result |
| --- | --- | --- |
| Proposal file hash | `Get-FileHash D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` | PASS: SHA256 `A82BD58B3860389CD430CDA39EC6CACAC7BEA158F6BEE10AB5128F3EBE82C387` |
| Proposal line count | `Get-Content ... | Measure-Object -Line` | PASS: 2227 lines available during QA |
| Requirement traceability | `00-requirements.md`, this artifact | PASS: `R14` and `R15` mapped to observed QA evidence below |

## Rebuilt Artifacts

| Artifact | Evidence | Result |
| --- | --- | --- |
| Runtime SEA package | `evidence/logs/phase5/runtime-package-sea.log`, `runtime-package-sea-after-pi-compat.log` | PASS: rebuilt after downstream discovery compatibility repair |
| Runtime package hash | shell output after final runtime rebuild | PASS: final rebuilt runtime package SHA256 `797bb08972a56b7ac3a78b1e04956b3d49d10c205b9071a1b4eb54305c768008` |
| Pi package build | `evidence/logs/phase5/pi-package-build-final.log` | PASS |
| Pi package pack | `evidence/logs/phase5/pi-package-pack-final.log` | PASS: `try-works-pi-role-model-0.1.1.tgz` includes compact taxonomy data and `src/request-intent.ts` |

## Runtime Launch And Probes

The rebuilt QA runtime was launched at `http://127.0.0.1:4567`.

| Check | Evidence | Result |
| --- | --- | --- |
| Clean runtime start | `runtime-qa-stdout-clean-after-compat.log`, `runtime-qa-stderr-clean-after-compat.log`, `runtime-qa-pid.txt` | PASS |
| Stale listener cleanup | `runtime-qa-stop-stale-listener.log` | PASS: removed orphan child process before clean restart |
| `/healthz` | `runtime-probes-clean-after-compat.json` | PASS_WITH_EXPECTED_DEGRADED_BACKENDS: runtime API up; local vendors inactive and seeded remote auth degraded |
| `/api/version` | `runtime-probes-clean-after-compat.json` | PASS: `0.0.0-qa` |
| `/api/role-model/downstream/openai` | `runtime-probes-clean-after-compat.json` | PASS: `contractVersion`, alias/model `type`, `capabilities`, `modalities`, `piMapping`, and `freshness` present |
| taxonomy summary | `runtime-endpoint-probes.log`, `runtime-probes-clean-after-compat.json` | PASS: schema `role-model.taxonomy.schema.v1`, taxonomy `1.0.0-alpha.1`, counts `6/28/280/46/9/15` |

## Pi Installation And Command Checks

| Check | Evidence | Result |
| --- | --- | --- |
| Install run 57 package | `pi-install-worktree-path.log` | PASS: Pi installed the worktree package |
| Remove stale package sources | `pi-remove-public-package-for-clean-qa.log`, `pi-remove-old-root-package-absolute.log` | PASS: QA state used only the run 57 worktree package |
| Confirm installed source | `pi-list-clean-run57-only-final.log` | PASS |
| Command and skill discovery | `pi-rpc-get-commands-run57-only.log`, `pi-rpc-get-commands-after-no-startup-registration.log` | PASS: `role-model` extension and `skill:role-model` load from the run 57 worktree |
| Endpoint and alias command checklist | `pi-rpc-persistent-command-checklist-final.log` | PASS: `/role-model status`, `setup`, `doctor`, `ui`, alias list/recommended/use/refresh/current all returned successful RPC responses against `http://127.0.0.1:4567` |

The command checklist used a persistent Pi RPC process. One-line stdin pipelines can close before slower async extension commands finish, which is why earlier exploratory logs show empty output or a Windows libuv assertion. The persistent harness is the reliable Pi RPC mode for this QA.

## Phase 5 Defects Found And Repaired

| Defect | RED evidence | Repair | GREEN evidence |
| --- | --- | --- | --- |
| QA runtime fallback downstream discovery lacked the rich Pi-compatible contract | `red-downstream-openai-fallback-pi-compat.log` | Enriched fallback model records with `contractVersion`, `type`, limits, capabilities, modalities, routable/declared metadata, `piMapping`, and freshness | `green-downstream-openai-fallback-pi-compat-2.log`, `host-build-after-pi-compat-2.log`, `runtime-probes-clean-after-compat.json` |
| Pi discovery used reusable fetch sockets in short-lived RPC runs | `red-pi-discovery-close-connections.log` | Runtime discovery requests now set `keepalive: false` and `connection: close` | `green-pi-discovery-close-connections.log`, `pi-package-test-final.log` |
| Pi classifier existed but request metadata was not wired into provider transport | `red-pi-provider-request-intent-injection.log` | Added `before_provider_request` injection for known Role-Model aliases via `src/request-intent.ts` | `green-pi-provider-request-intent-injection.log`, `pi-transport-capture-intent-body.log`, `pi-transport-capture-six-proposal-prompts.log` |
| Downstream discovery route test still asserted the obsolete compact shape | `host-index-taxonomy-tests-final.log` | Updated the test to assert the new compatibility contract and enriched model fields | `host-index-taxonomy-tests-final-rerun.log` |

## Pi Taxonomy And Metadata Checks

| Check | Evidence | Result |
| --- | --- | --- |
| Compact taxonomy packaged | `pi-package-pack-final.log` | PASS: compact manifest, groups, role summaries, role task index, group chunks, and role task chunks included |
| Offline classification API | `pi-package-test-final.log` | PASS: package tests cover progressive group/role/task classification and no hidden model call |
| Transport-level metadata send | `pi-transport-capture-intent-body.log` | PASS: real Pi provider request body included `role_model.intent` with `coder` / `coder.edit` |
| Six proposal prompts classified and sent | `pi-transport-capture-six-proposal-prompts.log` | PASS: all six prompts sent through `role-model/default.decision-only` with role/task metadata |

Minimum request-set results from `pi-transport-capture-six-proposal-prompts.log`:

| Prompt | Role | Task |
| --- | --- | --- |
| Review this diff for security risks and likely regressions. | `security` | `security.audit` |
| Implement this small bug fix and add a regression test. | `coder` | `coder.edit` |
| Compare current public documentation for this API and cite differences. | `researcher` | `researcher.web_research.current` |
| Turn these support notes into a clear customer reply. | `support` | `support.ticket.reply` |
| Inspect this schema and propose a migration plan. | `architect` | `architect.migration.strategy` |
| Create product requirements and acceptance criteria for this workflow. | `product` | `product.requirements` |

## Runtime Routing And UI Checks

| Check | Evidence | Result |
| --- | --- | --- |
| Pi selected Role-Model alias and sent a live prompt to rebuilt runtime | `pi-rpc-live-routed-prompt-with-intent.log` | PASS: Pi selected `role-model/default.decision-only` and submitted a prompt |
| Runtime router ledger after live Pi prompt | `runtime-ledgers-after-pi-routed-prompt.json` | PASS_WITH_QA_RUNTIME_LIMITATION: a router decision was recorded; selected endpoint was `routing.failed.pre-execution` because QA runtime backends were inactive/degraded |
| Runtime request observation list | `runtime-ledgers-after-pi-routed-prompt.json` | PASS_WITH_LIMITATION: request list was empty for the pre-execution failure path |
| UI routes | `runtime-ui-route-probes.json` | PASS: `/app/models`, `/app/models/roles`, `/app/router/candidates`, `/app/router/decisions`, `/app/observe/requests`, and `/app/observe/routing` returned HTTP 200 from the rebuilt UI bundle |
| Runtime tests for taxonomy routing and discovery | `core-taxonomy-routing-tests-final.log`, `host-index-taxonomy-tests-final-rerun.log` | PASS |

The QA runtime intentionally starts vendor processes disabled. It can prove discovery, configuration, routing decision creation, UI/API reachability, and Pi transport metadata. It cannot produce a successful model completion through a live local backend in this run's QA mode. Successful runtime execution paths remain covered by `host-index-taxonomy-tests-final-rerun.log` and existing vendor validation tests in the host suite.

## Benchmark And Telemetry Scope

| Area | Evidence | Result |
| --- | --- | --- |
| Phase 5 benchmark implementation | requirement scope, docs, tests | DEFERRED: placeholders and schema reserves only; no benchmark scoring engine or dashboard implementation added |
| Phase 6 telemetry implementation | requirement scope, docs, tests | DEFERRED: telemetry dimensions reserved only; no taxonomy telemetry rollups or routing influence added |
| Existing observability route reachability | `runtime-ui-route-probes.json`, `host-index-taxonomy-tests-final-rerun.log` | PASS: existing observe routes remain available |

## Final Automated Checks

| Check | Evidence | Result |
| --- | --- | --- |
| `@try-works/pi-role-model` tests | `pi-package-test-final.log` | PASS: 11 files / 41 tests |
| `@try-works/pi-role-model` typecheck | `pi-package-build-final.log` | PASS |
| runtime-host bridge build | `host-build-final-rerun.log` | PASS |
| runtime-host bridge affected tests | `host-index-taxonomy-tests-final-rerun.log` | PASS: 52 files / 427 tests |
| core taxonomy/routing tests | `core-taxonomy-routing-tests-final.log` | PASS |

## Proposal E2E Coverage

| Proposal E2E case family | Evidence | Result |
| --- | --- | --- |
| `E2E-P1-001` through `E2E-P1-003` | locked `01-as-is.md`, `02-to-be-plan.md`, `03-implementation-summary.md`, `04-test-summary.md`, final test logs | PASS |
| `E2E-P2-001` through `E2E-P2-005` | `runtime-probes-clean-after-compat.json`, `core-taxonomy-routing-tests-final.log`, `host-index-taxonomy-tests-final-rerun.log` | PASS |
| `E2E-P3-001` through `E2E-P3-003` | `runtime-ui-route-probes.json`, `host-index-taxonomy-tests-final-rerun.log`, runtime UI tests in `04-test-summary.md` | PASS |
| `E2E-P4-001` through `E2E-P4-005` | `pi-rpc-persistent-command-checklist-final.log`, `pi-transport-capture-six-proposal-prompts.log`, `pi-package-test-final.log` | PASS |

## Acceptance

Phase 5 satisfies `R14` and `R15` with one documented QA-runtime limitation: the rebuilt local QA runtime can accept Pi traffic and record routing decisions, but its vendor backends are disabled/degraded, so successful live completion was proven by Pi transport capture and runtime automated tests rather than by a live QA model backend.

Approval: `PASS_WITH_QA_RUNTIME_LIMITATION`

## Evidence and Artifacts

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-package-sea-after-pi-compat.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-probes-clean-after-compat.json`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-install-worktree-path.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-rpc-persistent-command-checklist-final.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-transport-capture-intent-body.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-transport-capture-six-proposal-prompts.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-ledgers-after-pi-routed-prompt.json`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/runtime-ui-route-probes.json`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/pi-package-test-final.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/host-index-taxonomy-tests-final-rerun.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/core-taxonomy-routing-tests-final.log`

## Traceability

- `R2` -> verified by canonical taxonomy schema/data tests recorded in `04-test-summary.md`, runtime taxonomy summary probes showing counts `6/28/280/46/9/15`, and package pack evidence containing generated compact taxonomy data.
- `R3` -> verified by canonical taxonomy validation/golden parity tests in `04-test-summary.md`, runtime taxonomy endpoint probes, and Pi compact manifest/hash/count package tests.
- `R4` -> verified by runtime discovery routes in `runtime-probes-clean-after-compat.json` and host bridge taxonomy API coverage in `host-index-taxonomy-tests-final-rerun.log`.
- `R14` -> verified by rebuilt runtime/package artifacts, real Pi install/list/command checks, runtime probes, UI route probes, and Pi routed prompt evidence.
- `R15` -> verified by the six proposal prompt capture receipts and mapped proposal E2E coverage table.
- `R5` and `R6` -> verified by runtime routing-intent/core tests and host bridge tests; live QA also recorded a runtime router decision from Pi traffic.
- `R7` -> verified by runtime UI route probes for existing model/router/observe pages and host bridge/UI tests recorded in `host-index-taxonomy-tests-final-rerun.log`.
- `R8` and `R9` -> verified by compact package data, Pi package tests, request-injection tests, and real Pi transport capture.
- `R10` -> verified by docs/static checks in `04-test-summary.md`, generated taxonomy docs, and Pi skill guidance packaged with the run 57 `pi-role-model` artifact.
- `R11` -> verified by scope-boundary tests/static scans in `04-test-summary.md` and Phase 5 benchmark/telemetry deferral checks in this artifact.
- `R12` -> verified by version/compatibility/deprecation/cache/persisted-decision tests recorded in `04-test-summary.md` and runtime taxonomy version probes.
- `R13` -> verified by RED/GREEN evidence records in `03-implementation-summary.md`, final affected automated checks in this artifact, and locked `04-test-summary.md`.
- Proposal Phase 5 benchmark and Phase 6 telemetry -> explicitly deferred; only placeholders/reserved surfaces verified.

## User Sign-Off

Agent-operated QA was required by `R14`; no additional human sign-off was required before locking this phase. User approval for implementing run 57 was given before Phase 0.

## Coverage Gate

Coverage: PASS

Rationale: Phase 5 exercised rebuilt runtime packaging, runtime launch, Pi install/update, endpoint and alias setup, taxonomy discovery, six proposal prompt classifications sent through Pi transport, UI route probes, runtime decision ledgers, and affected automated tests. The only limitation is documented and bounded to the QA runtime's disabled/degraded model backends.

## Approval Gate

Approval: PASS

Rationale: Agent-operated QA completed the approved `R14`/`R15` checklist with a documented runtime-backend limitation and no unresolved implementation blocker.
