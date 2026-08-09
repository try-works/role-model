Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-08-04T12:19:46Z`
LockHash: `901a61f56f03d156186b9db226ed49659a5dd02be301b68bc9d39151f193f9d1`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED)
- `/.recursive/run/89-codex-role-model-package/00-worktree.md` (LOCKED)
- `/.recursive/run/89-codex-role-model-package/01-as-is.md` (LOCKED)
- `packages/pi-role-model/**` (parity source)
- `packages/codex-role-model/**` (worktree implementation in progress / present)
Outputs:
- `/.recursive/run/89-codex-role-model-package/02-to-be-plan.md`
Scope note: ExecPlan for shipping `@try-works/codex-role-model` under strict TDD, then proving live Codex→adapter→runtime routing in Phase 5. Worktree already contains an implementation candidate with 28 offline tests green; Phase 3 must still record RED/GREEN evidence and Requirement Completion Status before Phase 5.

## TODO

- [x] Re-read locked requirements, worktree, and AS-IS
- [x] Map each R# to files, tests, and QA surfaces
- [x] Declare strict TDD slices and Phase 5 live stack procedure
- [x] Reconcile with prior consumer-package runs
- [x] Complete audited-phase gates

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: Task/generalPurpose agents available; Phase 3 package implementation was partially delegated; Phase 2 planning lock performed by controller.
- Delegation Decision Basis: self-audit for Phase 2 — plan must reconcile locked requirements with observed worktree package state; controller verifies headings and diff basis locally.
- Delegation Override Reason: planning artifact must match audit-v2 lock gates exactly; self-audit avoids stale delegated plan drafts.
- Audit Inputs Provided:
  - locked `00-requirements.md`, `00-worktree.md`, `01-as-is.md`
  - current worktree `packages/codex-role-model/**` and docs page
  - evidence logs under `evidence/logs/tdd-*-green.log`

## Effective Inputs Re-read

- `00-requirements.md` locks DeepSeek-style user Codex config, adapter `:3460`, pi-parity intent, Codex-owned compaction, strict TDD, and Phase 5 real runtime + real Codex iterate-until-green (`R1`–`R11`, `OOS1`–`OOS16`).
- `00-worktree.md` isolates work on `recursive/89-codex-role-model-package` from baseline `6cf19bf033c23246c173a1bf634d13b2c822b2d8`.
- `01-as-is.md` records package ABSENT at baseline and pi-role-model as behavioral parity source.
- Worktree now contains `packages/codex-role-model` with offline suite green (28 tests); Phase 3 must formalize that as audited implementation evidence, not treat AS-IS absence as current truth.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/55-pi-role-model-package/00-requirements.md` — first consumer package scaffold, discovery, doctor/status, skill, safety tests.
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md` — trust/auth fail-closed and discovery hardening.
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md` — canonical model-id guidance and secret-safe diagnostics.
- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md` — original package/runtime ownership boundary patterns reused here.

## Planned Changes by File

- `packages/codex-role-model/package.json` — private workspace package + `codex-role-model` bin
- `packages/codex-role-model/src/config.ts` — endpoint trust, `ROLE_MODEL_*` env, adapter port
- `packages/codex-role-model/src/runtime-discovery.ts`, `downstream-openai.ts` — pi-parity discovery
- `packages/codex-role-model/src/codex-config.ts` — managed block, backup/restore, project-config refuse
- `packages/codex-role-model/src/catalog.ts`, `fixtures/models-response.golden.json` — ModelsResponse catalog
- `packages/codex-role-model/src/forwarder.ts`, `responses-intent.ts`, `request-intent.ts`, `taxonomy/**`, `data/taxonomy/**` — adapter + intent
- `packages/codex-role-model/src/commands.ts`, `cli.ts`, `bin/codex-role-model.js` — CLI matrix
- `packages/codex-role-model/src/runtime-inspection.ts`, `alias-store.ts`, `secret-safety.ts`, `model-guidance.ts`
- `packages/codex-role-model/skills/role-model/**`, `.codex-plugin/plugin.json`, `README.md`
- `apps/docs-site/content/docs/integrations/codex.mdx`, `meta.json` — docs + nav link
- `packages/codex-role-model/test/**` — RED-first offline coverage
- `.recursive/run/89-codex-role-model-package/evidence/logs/**` — TDD RED/GREEN captures

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: Create `packages/codex-role-model` as a workspace package `@try-works/codex-role-model` with TypeScript build/test scripts, a `codex-role-model` bin entry, README, and `"private": true`. | Implementation Surface: packages/codex-role-model/package.json, packages/codex-role-model/bin/codex-role-model.js, packages/codex-role-model/README.md | Verification Surface: packages/codex-role-model/test/package-manifest.test.ts | QA Surface: CLI help from worktree
- R2 | Coverage: direct | Source Quote: Discovery probes, in order: trust assessment → `GET /healthz` → `GET /api/version` (best-effort) → `GET /api/role-model/downstream/openai` → on **404 only**, `GET /v1/models` compact fallback. | Implementation Surface: packages/codex-role-model/src/config.ts, packages/codex-role-model/src/runtime-discovery.ts, packages/codex-role-model/src/downstream-openai.ts | Verification Surface: packages/codex-role-model/test/config.test.ts, packages/codex-role-model/test/runtime-discovery.test.ts | QA Surface: live doctor against local runtime
- R3 | Coverage: direct | Source Quote: Writes only under user Codex home `config.toml`. Attempting to target project `.codex/config.toml` for provider keys is refused with a non-zero exit and actionable message. | Implementation Surface: packages/codex-role-model/src/codex-config.ts | Verification Surface: packages/codex-role-model/test/codex-config.test.ts | QA Surface: setup/uninstall on user-level Codex config
- R4 | Coverage: direct | Source Quote: Catalog is a non-empty Codex `ModelsResponse` JSON (not a bare alias string list). | Implementation Surface: packages/codex-role-model/src/catalog.ts, packages/codex-role-model/fixtures/models-response.golden.json | Verification Surface: packages/codex-role-model/test/catalog.test.ts | QA Surface: refresh-catalog then Codex restart
- R5 | Coverage: direct | Source Quote: Default listen: `127.0.0.1:3460` (or `ROLE_MODEL_CODEX_ADAPTER_PORT`); binds loopback only. | Implementation Surface: packages/codex-role-model/src/forwarder.ts, packages/codex-role-model/src/responses-intent.ts, packages/codex-role-model/src/request-intent.ts | Verification Surface: packages/codex-role-model/test/forwarder.test.ts, packages/codex-role-model/test/responses-intent.test.ts, packages/codex-role-model/test/request-intent.test.ts | QA Surface: Codex turn hits adapter port 3460
- R6 | Coverage: direct | Source Quote: Compaction is **Codex-managed**, not role-model/router-managed. | Implementation Surface: packages/codex-role-model/README.md, apps/docs-site/content/docs/integrations/codex.mdx | Verification Surface: packages/codex-role-model/test/docs-and-safety.test.ts | QA Surface: Phase 5 local-compaction note
- R7 | Coverage: direct | Source Quote: Expose a standalone CLI with a command matrix that mirrors pi-role-model ops semantics without claiming Pi slash-command UX. | Implementation Surface: packages/codex-role-model/src/commands.ts, packages/codex-role-model/src/cli.ts | Verification Surface: packages/codex-role-model/test/commands.test.ts | QA Surface: doctor/status/explain live
- R8 | Coverage: direct | Source Quote: `skills/role-model/SKILL.md` and `agents/openai.yaml` exist and instruct setup/doctor/start/refresh without asking users to paste secrets in chat. | Implementation Surface: packages/codex-role-model/skills/role-model/SKILL.md, packages/codex-role-model/.codex-plugin/plugin.json | Verification Surface: packages/codex-role-model/test/package-manifest.test.ts | QA Surface: skill text review
- R9 | Coverage: direct | Source Quote: Add `apps/docs-site/content/docs/integrations/codex.mdx` following the Pi integration docs pattern. | Implementation Surface: apps/docs-site/content/docs/integrations/codex.mdx, apps/docs-site/content/docs/integrations/meta.json | Verification Surface: packages/codex-role-model/test/docs-and-safety.test.ts | QA Surface: docs spot-check
- R10 | Coverage: direct | Source Quote: Iron Law holds: for each code-bearing slice, a failing test is written and observed RED before production code that makes it GREEN; both evidence paths are cited in `03-implementation-summary.md`. | Implementation Surface: packages/codex-role-model/src/secret-safety.ts, packages/codex-role-model/test/secret-safety.test.ts | Verification Surface: packages/codex-role-model/test/secret-safety.test.ts, .recursive/run/89-codex-role-model-package/evidence/logs/tdd-full-green.log | QA Surface: redacted doctor samples
- R11 | Coverage: direct | Source Quote: Supported path exercised: `setup` → `start` → Codex restart/reopen as needed → select role-model alias → at least one live prompt/turn → adapter receives `POST /v1/responses` → upstream runtime receives the proxied turn. | Implementation Surface: .recursive/run/89-codex-role-model-package/02-to-be-plan.md | Verification Surface: .recursive/run/89-codex-role-model-package/evidence/logs/ | QA Surface: live Codex CLI turn plus human sign-off


## Implementation Steps

1. Scaffold package + failing manifest/config tests (RED → GREEN).
2. Port/adapt discovery/trust from pi-role-model with Codex env vars.
3. Implement surgical user Codex config + catalog generation with tests.
4. Implement Responses forwarder + intent inject + compact 404 behavior.
5. Wire CLI commands and secret-safety tests.
6. Ship skill/plugin + docs page.
7. Record Phase 3 RED/GREEN evidence and RCS for R1–R10.
8. Phase 5: start real runtime, `setup`/`start`, real Codex client turn, `explain` routing proof; iterate under TDD until green.

## Testing Strategy

- `TDD Mode: strict` for package-owned logic.
- Offline unit/integration default: `corepack pnpm --filter @try-works/codex-role-model test`
- Build: `corepack pnpm --filter @try-works/codex-role-model build`
- Capture RED/GREEN logs under `evidence/logs/`.
- Phase 5 is not mock-substitutable.

## Playwright Plan (if applicable)

- Not applicable for v1. Phase 5 uses Codex CLI (Desktop/IDE preferred when available), not Playwright browser automation of Codex.

## Manual QA Scenarios

1. Runtime `/healthz` OK on local channel; discovery aliases present.
2. `codex-role-model setup` then `start`; doctor green.
3. Restart Codex; select role-model alias; send one prompt.
4. Prove adapter receive + runtime request + `explain latest` shows intent/routing.
5. On failure: record defect → TDD fix → re-prove.
6. Human sign-off that unrelated Codex settings survived setup.

## Idempotence and Recovery

- `setup` backups under `$CODEX_HOME/backup-role-model/`; `uninstall` restores managed block removal.
- `stop` clears forwarder state; `start` rebinds loopback port.
- Doctor classifies blocked-remote, missing catalog/managed block, and upstream failures without secrets.

## Implementation Sub-phases

- Slice A: scaffold + config/discovery
- Slice B: codex-config + catalog
- Slice C: forwarder + intent
- Slice D: CLI + safety
- Slice E: skill/plugin + docs
- Slice F: Phase 5 live routing iteration

## Plan Drift Check

- Remains public-repo package only (`OOS4`).
- No `openai_base_url` hijack (`OOS2`).
- No `/v1/responses/compact` implementation (`OOS3`).
- No LiteLLM path (`OOS1`).
- No MCP tools in v1 (`OOS11`).
- Compaction ownership stays with Codex (`R6`).
- Phase 5 requires real runtime + real Codex (`R11`); mocks insufficient (`OOS15`/`OOS16`).

## Earlier Phase Reconciliation

- Phase 0 requirements define R1–R11 and Fixed Decisions 1–25; this plan does not reopen them.
- Phase 0 worktree baseline `6cf19bf0` remains the diff basis.
- Phase 1 AS-IS absence-at-baseline remains historically true; product files appearing in the worktree are Phase 3 ownership, not AS-IS contradiction.

## Gaps Found

- None for plan completeness. Remaining execution gaps are Phase 3 formalization and Phase 5 live stack availability (runtime was unreachable during planning).

## Repair Work Performed

- Expanded this artifact from a short draft to full audit-v2 required sections so Phase 2 can lock.
- Reconciled plan with already-present worktree package + green offline tests.

## Subagent Contribution Verification

- Phase 3 implementation Task contributed package code/tests; controller verified `pnpm test` 28/28 and `pnpm build` pass in worktree before accepting as implementation candidate.
- Phase 2 lock content authored/verified by controller self-audit against locked upstream artifacts.
- No subagent action-record required for this planning-only lock beyond noting implementation Task verification above.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- Comparison reference: `working-tree`
- Normalized baseline: `6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- Tracked changed paths at plan lock time:
  - `apps/docs-site/content/docs/integrations/meta.json`
  - `pnpm-lock.yaml`
- Material untracked product/run paths (Phase 3 ownership):
  - `apps/docs-site/content/docs/integrations/codex.mdx`
  - `packages/codex-role-model/**`
  - `.recursive/run/89-codex-role-model-package/**`

## Traceability

- `R1` -> scaffold/bin/README + package-manifest tests
- `R2` -> discovery/trust modules + discovery/config tests
- `R3` -> codex-config manager + config tests
- `R4` -> catalog + golden fixture tests
- `R5` -> forwarder/intent modules + forwarder/intent tests
- `R6` -> README/docs compaction ownership assertions
- `R7` -> CLI commands + commands tests
- `R8` -> skill/plugin packaging assertions
- `R9` -> docs-site codex.mdx + meta link
- `R10` -> secret-safety tests + TDD evidence logs
- `R11` -> Phase 5 Manual QA Scenarios (live runtime + Codex)

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `packages/codex-role-model/package.json`, `packages/codex-role-model/bin/codex-role-model.js`, `packages/codex-role-model/README.md` | Verification Surface: `packages/codex-role-model/test/package-manifest.test.ts` | QA Surface: CLI help from worktree
- `R2` | Status: planned | Implementation Surface: `packages/codex-role-model/src/config.ts`, `packages/codex-role-model/src/runtime-discovery.ts`, `packages/codex-role-model/src/downstream-openai.ts` | Verification Surface: `packages/codex-role-model/test/config.test.ts`, `packages/codex-role-model/test/runtime-discovery.test.ts` | QA Surface: live doctor
- `R3` | Status: planned | Implementation Surface: `packages/codex-role-model/src/codex-config.ts` | Verification Surface: `packages/codex-role-model/test/codex-config.test.ts` | QA Surface: setup/uninstall user config
- `R4` | Status: planned | Implementation Surface: `packages/codex-role-model/src/catalog.ts`, `packages/codex-role-model/fixtures/models-response.golden.json` | Verification Surface: `packages/codex-role-model/test/catalog.test.ts` | QA Surface: refresh-catalog
- `R5` | Status: planned | Implementation Surface: `packages/codex-role-model/src/forwarder.ts`, `packages/codex-role-model/src/responses-intent.ts`, `packages/codex-role-model/src/request-intent.ts` | Verification Surface: `packages/codex-role-model/test/forwarder.test.ts`, `packages/codex-role-model/test/responses-intent.test.ts` | QA Surface: Codex→adapter turn
- `R6` | Status: planned | Implementation Surface: `packages/codex-role-model/README.md`, `apps/docs-site/content/docs/integrations/codex.mdx` | Verification Surface: `packages/codex-role-model/test/docs-and-safety.test.ts` | QA Surface: compaction note
- `R7` | Status: planned | Implementation Surface: `packages/codex-role-model/src/commands.ts`, `packages/codex-role-model/src/cli.ts` | Verification Surface: `packages/codex-role-model/test/commands.test.ts` | QA Surface: doctor/status/explain
- `R8` | Status: planned | Implementation Surface: `packages/codex-role-model/skills/role-model/SKILL.md`, `packages/codex-role-model/.codex-plugin/plugin.json` | Verification Surface: `packages/codex-role-model/test/package-manifest.test.ts` | QA Surface: skill review
- `R9` | Status: planned | Implementation Surface: `apps/docs-site/content/docs/integrations/codex.mdx`, `apps/docs-site/content/docs/integrations/meta.json` | Verification Surface: `packages/codex-role-model/test/docs-and-safety.test.ts` | QA Surface: docs spot-check
- `R10` | Status: planned | Implementation Surface: `packages/codex-role-model/src/secret-safety.ts`, `packages/codex-role-model/test/secret-safety.test.ts` | Verification Surface: `packages/codex-role-model/test/secret-safety.test.ts`, `.recursive/run/89-codex-role-model-package/evidence/logs/tdd-full-green.log` | QA Surface: redacted doctor output
- `R11` | Status: planned | Implementation Surface: `.recursive/run/89-codex-role-model-package/02-to-be-plan.md` | Verification Surface: `.recursive/run/89-codex-role-model-package/evidence/logs/` | QA Surface: live Codex + runtime routing proof

## Coverage Gate

- [x] Each R# mapped to implementation/verification/QA
- [x] Strict TDD and Phase 5 live procedure recorded
- [x] OOS boundaries preserved in Plan Drift Check
- [x] Diff basis fields present and executable

Coverage: PASS

## Approval Gate

- [x] Plan is executable from locked worktree
- [x] No OOS items pulled into ship path
- [x] Acceptance criteria remain observable

Approval: PASS

## Audit Verdict

- Controller self-audit confirms required audit-v2 sections, R1–R11 mapping, and diff basis consistency with `00-worktree.md`.
- Implementation candidate exists and offline tests are green; formal Phase 3/5 gates remain.

Audit: PASS
