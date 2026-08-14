Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-08-04T12:06:04Z`
LockHash: `c056f517483c66a8f7aee1186412d00126e56e2b71af5a660a1122e8e6b92202`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED)
- `/.recursive/run/89-codex-role-model-package/00-worktree.md` (LOCKED)
- `packages/pi-role-model/**` (behavioral parity reference)
- `apps/docs-site/content/docs/integrations/pi.mdx` (docs pattern)
- `pnpm-workspace.yaml`
Outputs:
- `/.recursive/run/89-codex-role-model-package/01-as-is.md`
Scope note: Current-state inventory for Codex consumer integration before implementing `@try-works/codex-role-model`. All product claims refer to baseline commit `6cf19bf033c23246c173a1bf634d13b2c822b2d8`; untracked working-tree WIP under `packages/codex-role-model/` is noted in Worktree Diff Audit but is not AS-IS authority for this phase.

## TODO

- [x] Re-read locked requirements and worktree diff basis
- [x] Confirm `packages/codex-role-model` is ABSENT at baseline commit `6cf19bf0`
- [x] Inventory pi-role-model parity surfaces for discovery, intent, config, ops, inspection
- [x] Record Codex integration constraints (user-level config, Responses wire, local compaction, adapter seam)
- [x] Build Source Requirement Inventory for R1–R11
- [x] Map current behavior per requirement with novice-runnable reproduction steps
- [x] Record reserved-provider-id verification obligation and Phase 5 live-stack unknowns
- [x] Complete audited-phase gates

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: Task/explore subagents are available in this harness; Phase 3 implementation delegation is planned for product code, not for this AS-IS inventory phase.
- Delegation Decision Basis: self-audit — controller performed local file inspection, baseline git checks, and pi-role-model cross-reads; AS-IS is observational and does not require delegated audit.
- Delegation Override Reason: N/A — implementer Task subagent is reserved for Phase 3 code, not this AS-IS audit.
- Audit Inputs Provided: locked `00-requirements.md`, locked `00-worktree.md`, baseline git tree at `6cf19bf0`, `packages/pi-role-model/**`, docs-site Pi integration page, prior consumer run requirements artifacts.

## Effective Inputs Re-read

- `/.recursive/run/89-codex-role-model-package/00-requirements.md` — defines R1–R11, Fixed Decisions (user-level Codex config only, adapter `:3460`, pi-parity discovery/intent, Codex-owned compaction, strict TDD, Phase 5 real Codex + real runtime routing proof).
- `/.recursive/run/89-codex-role-model-package/00-worktree.md` — isolated worktree at `D:\DEV\role-model\.worktrees\89-codex-role-model-package`, branch `recursive/89-codex-role-model-package`, diff basis commit `6cf19bf033c23246c173a1bf634d13b2c822b2d8`.
- `pnpm-workspace.yaml` — includes `packages/*`; a new `packages/codex-role-model` directory would be workspace-discovered once added.
- `packages/pi-role-model/**` — authoritative consumer behavior for discovery, trust, intent classification, alias ops, requests/explain, model guidance.
- `apps/docs-site/content/docs/integrations/pi.mdx` — integration docs pattern; no Codex counterpart exists at baseline.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/55-pi-role-model-package/00-requirements.md` — first consumer package patterns (discovery, provider registration, status/doctor, skill, safety tests).
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md` — trust/auth fail-closed and alias-selection hardening context.
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md` — canonical provider-relative model-id guidance and deterministic diagnostics to reuse/adapt for Codex CLI.
- `/.recursive/memory/domains/pi-role-model-package.md` — not present in this worktree; pi package source used directly instead.

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: Create `packages/codex-role-model` as a workspace package `@try-works/codex-role-model` with TypeScript build/test scripts, a `codex-role-model` bin entry, README, and `"private": true`. | Summary: Codex consumer package scaffold does not exist at baseline; workspace already supports `packages/*`. | Owner: `pnpm-workspace.yaml`, future `packages/codex-role-model/`
- `R2` | Disposition: `in-scope` | Source Quote: Discovery probes, in order: trust assessment → `GET /healthz` → `GET /api/version` (best-effort) → `GET /api/role-model/downstream/openai` → on **404 only**, `GET /v1/models` compact fallback. | Summary: No Codex-side discovery module exists; pi-role-model implements the probe order and fail-closed remote/auth behavior to adapt. | Owner: `packages/pi-role-model/src/config.ts`, `packages/pi-role-model/src/runtime-discovery.ts`, `packages/pi-role-model/src/downstream-openai.ts`
- `R3` | Disposition: `in-scope` | Source Quote: Writes only under user Codex home `config.toml`. Attempting to target project `.codex/config.toml` for provider keys is refused with a non-zero exit and actionable message. | Summary: No Codex config manager exists; pi uses Pi-native config paths instead of `$CODEX_HOME/config.toml`. | Owner: future `packages/codex-role-model/src/codex-config.ts` (planned); pi has no direct analogue
- `R4` | Disposition: `in-scope` | Source Quote: Catalog is a non-empty Codex `ModelsResponse` JSON (not a bare alias string list). | Summary: No Codex `ModelsResponse` catalog generator exists; pi registers models via Pi provider API rather than Codex `model_catalog_json`. | Owner: future `packages/codex-role-model/` catalog module; pi `packages/pi-role-model/src/downstream-openai.ts` for alias metadata source
- `R5` | Disposition: `in-scope` | Source Quote: Default listen: `127.0.0.1:3460` (or `ROLE_MODEL_CODEX_ADAPTER_PORT`); binds loopback only. | Summary: No loopback Responses forwarder exists; pi injects intent via Pi `before_provider_request` hook instead of an HTTP adapter. | Owner: future `packages/codex-role-model/src/forwarder.ts`; pi `packages/pi-role-model/src/request-intent.ts` for intent parity
- `R6` | Disposition: `in-scope` | Source Quote: Compaction is **Codex-managed**, not role-model/router-managed. | Summary: No Codex compaction ownership documentation exists; runtime/router does not own remote Compact v2 for custom providers per requirements. | Owner: future README + docs-site; no adapter compact endpoint at baseline
- `R7` | Disposition: `in-scope` | Source Quote: Expose a standalone CLI with a command matrix that mirrors pi-role-model ops semantics without claiming Pi slash-command UX. | Summary: No standalone `codex-role-model` CLI exists; pi exposes similar ops via `/role-model` slash commands in `packages/pi-role-model/src/commands.ts`. | Owner: future `packages/codex-role-model/` CLI; pi `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/src/runtime-inspection.ts`
- `R8` | Disposition: `in-scope` | Source Quote: `skills/role-model/SKILL.md` and `agents/openai.yaml` exist and instruct setup/doctor/start/refresh without asking users to paste secrets in chat. | Summary: No Codex skill/plugin packaging exists for role-model; pi ships `packages/pi-role-model/skills/role-model/SKILL.md`. | Owner: future `packages/codex-role-model/skills/`; pi skill as pattern
- `R9` | Disposition: `in-scope` | Source Quote: Add `apps/docs-site/content/docs/integrations/codex.mdx` following the Pi integration docs pattern. | Summary: Docs-site has Pi integration page only; `codex.mdx` is absent at baseline. | Owner: `apps/docs-site/content/docs/integrations/pi.mdx` (pattern); missing `codex.mdx`
- `R10` | Disposition: `quality-gate` | Source Quote: Iron Law holds: for each code-bearing slice, a failing test is written and observed RED before production code that makes it GREEN; both evidence paths are cited in `03-implementation-summary.md`. | Summary: No codex-role-model tests exist at baseline; strict TDD is a Phase 3 obligation. | Owner: future `packages/codex-role-model/test/**`
- `R11` | Disposition: `quality-gate` | Source Quote: Supported path exercised: `setup` → `start` → Codex restart/reopen as needed → select role-model alias → at least one live prompt/turn → adapter receives `POST /v1/responses` → upstream runtime receives the proxied turn. | Summary: No live Codex→adapter→runtime routing proof exists; Phase 5 hybrid QA obligation. | Owner: future `05-manual-qa.md`, real local Codex client + role-model runtime

## Current Behavior by Requirement

### R1 — Package scaffold and workspace identity

**Codex package status:** `@try-works/codex-role-model` at `packages/codex-role-model` is **ABSENT** at baseline commit `6cf19bf033c23246c173a1bf634d13b2c822b2d8` (`git ls-tree` lists no `packages/codex-role-model`).

**Related existing behavior:** `pnpm-workspace.yaml` includes `packages/*`, so a new package directory will be auto-discovered. `packages/pi-role-model` exists as the first consumer package with `@try-works/pi-role-model`, build/test scripts, README, and skill layout — the structural template for R1.

### R2 — Runtime discovery, trust, and auth fail-closed

**Codex package status:** **ABSENT** — no Codex discovery or trust module.

**Related existing behavior (pi parity):** `packages/pi-role-model/src/config.ts` implements loopback trust (`localhost`, `127.0.0.1`, `::1`, `[::1]`), remote block unless `ROLE_MODEL_ALLOW_REMOTE`, and endpoint normalization (`ROLE_MODEL_ENDPOINT`, default `http://127.0.0.1:3456`). `packages/pi-role-model/src/runtime-discovery.ts` orchestrates probe order and classifies `blocked-remote`, `auth-required`, `unavailable`, etc. `packages/pi-role-model/src/downstream-openai.ts` validates rich discovery and fail-closed auth.

### R3 — Surgical user Codex config + backup/restore

**Codex package status:** **ABSENT** — no user `$CODEX_HOME/config.toml` manager, no managed block markers, no backup/restore.

**Related existing behavior:** Pi stores alias/state under `~/.pi/agent/role-model.json` via `packages/pi-role-model/src/alias-store.ts` (different host config surface). Requirements Fixed Decision #3 mandates user-level-only Codex writes with `# BEGIN role-model-provider-managed` markers — entirely new for this package.

### R4 — Full `ModelsResponse` catalog generation

**Codex package status:** **ABSENT** — no `$CODEX_HOME/role-model/models.json` generator, no golden `ModelsResponse` fixture in-repo for Codex.

**Related existing behavior:** Pi maps discovery models to Pi provider registration in `packages/pi-role-model/src/downstream-openai.ts` (provider-relative alias ids such as `baseline.remote-only`). Codex requires a separate full `ModelsResponse` JSON file referenced by `model_catalog_json` — a Codex-specific artifact Pi does not produce.

### R5 — Local Responses forwarder with intent inject + streaming passthrough

**Codex package status:** **ABSENT** — no loopback adapter on `:3460`, no `POST /v1/responses` proxy, no streaming passthrough.

**Related existing behavior (intent parity):** Pi injects `role_model.intent` through the Pi extension hook path in `packages/pi-role-model/src/request-intent.ts` using progressive-disclosure taxonomy classification. Codex hooks cannot rewrite provider HTTP bodies (Fixed Decision / OOS8), so the ship path requires a local forwarder — a seam Pi does not need.

### R6 — Compaction policy documentation and non-implementation

**Codex package status:** **ABSENT** — no compaction documentation or adapter behavior to describe.

**Related existing behavior:** No repo-owned Codex integration docs exist. Requirements fix compaction as Codex-local via ordinary `/v1/responses` summarization; remote Compact v2/v1 and required `POST /v1/responses/compact` adapter endpoints are explicitly out of scope (OOS3). Pi integration docs do not cover Codex compaction routing.

### R7 — Ops CLI command matrix

**Codex package status:** **ABSENT** — no `codex-role-model` binary or command router.

**Related existing behavior (pi parity):** `packages/pi-role-model/src/commands.ts` implements status, doctor, alias list/recommended/use/current, requests, and explain with structured diagnostics. `packages/pi-role-model/src/runtime-inspection.ts` calls runtime inspection APIs (`/api/role-model/requests`, router decisions). `packages/pi-role-model/src/model-guidance.ts` provides deterministic invalid-model guidance to reuse/adapt.

### R8 — Skill and Codex plugin packaging

**Codex package status:** **ABSENT** — no `skills/role-model/SKILL.md`, no `.codex-plugin/plugin.json` under a codex-role-model package.

**Related existing behavior:** `packages/pi-role-model/skills/role-model/SKILL.md` documents Pi setup/doctor flows. Codex plugin/skill paths differ (user-level config authority, no hook-based intent inject).

### R9 — Docs-site Codex integration page

**Codex package status:** **ABSENT** — `apps/docs-site/content/docs/integrations/codex.mdx` does not exist at baseline.

**Related existing behavior:** `apps/docs-site/content/docs/integrations/pi.mdx` documents Pi install, env vars, slash commands, trust/auth, and runtime ownership — the docs pattern for R9.

### R10 — Strict TDD and secret-safety contract

**Codex package status:** **ABSENT** — no package-owned production code or tests to enforce Iron Law.

**Related existing behavior:** `packages/pi-role-model/test/**` demonstrates offline vitest patterns, discovery/config/command tests, and secret-safety expectations the Codex package should mirror under `TDD Mode: strict`.

### R11 — Phase 5 real-runtime + real Codex routing proof

**Codex package status:** **ABSENT** — no adapter, no setup path, no routing proof artifacts.

**Related existing behavior:** Pi run 75 established live Pi CLI + runtime proof patterns. Codex Desktop/CLI/IDE share user `$CODEX_HOME` config but require a distinct Phase 5 matrix: setup → start → Codex restart → alias selection → live turn → adapter `:3460` hit → runtime request id → `explain`/router-decision evidence, with iterate-until-green on routing defects.

## Reproduction Steps (Novice-Runnable)

From the locked worktree (`D:\DEV\role-model\.worktrees\89-codex-role-model-package`):

1. Confirm Codex package absent at baseline:

```powershell
git ls-tree -d --name-only 6cf19bf033c23246c173a1bf634d13b2c822b2d8 packages/
```

Expected: lists `packages/pi-role-model` and other workspace packages; **no** `packages/codex-role-model`.

2. Confirm working-tree absence at HEAD commit (same tree as baseline if no commits yet):

```powershell
git cat-file -e 6cf19bf033c23246c173a1bf634d13b2c822b2d8:packages/codex-role-model 2>&1
```

Expected: fatal error — path does not exist in baseline tree.

3. Confirm Pi parity package exists and tests pass (recorded in `00-worktree.md`):

```powershell
corepack pnpm --filter @try-works/pi-role-model test
```

Expected: PASS (95 tests at worktree setup).

4. Confirm docs gap:

```powershell
Test-Path apps/docs-site/content/docs/integrations/codex.mdx
Test-Path apps/docs-site/content/docs/integrations/pi.mdx
```

Expected: `False` then `True`.

5. Confirm pi-role-model discovery/trust modules present:

```powershell
Test-Path packages/pi-role-model/src/runtime-discovery.ts
Test-Path packages/pi-role-model/src/config.ts
Test-Path packages/pi-role-model/src/request-intent.ts
```

Expected: all `True`.

6. List working-tree drift vs baseline (includes run binder; may include untracked Phase 3 WIP):

```powershell
git diff --name-only 6cf19bf033c23246c173a1bf634d13b2c822b2d8
git ls-files --others --exclude-standard
```

Expected: `git diff --name-only` empty for tracked files; untracked list includes `.recursive/run/89-codex-role-model-package/` and may include `packages/codex-role-model/` if Phase 3 WIP is present (not AS-IS authority).

## Relevant Code Pointers

- `pnpm-workspace.yaml` — `packages/*` glob auto-discovers new consumer packages
- `packages/pi-role-model/package.json` — `@try-works/pi-role-model` naming/bin pattern for R1
- `packages/pi-role-model/src/config.ts`
  - loopback trust and remote block: `40-73`
  - `ROLE_MODEL_ENDPOINT` / `ROLE_MODEL_ALLOW_REMOTE` config: `92-104`
- `packages/pi-role-model/src/runtime-discovery.ts`
  - discovery failure states: `18-24`
  - probe orchestration and 404 fallback: throughout file
- `packages/pi-role-model/src/downstream-openai.ts` — rich discovery validation, auth fail-closed, model mapping
- `packages/pi-role-model/src/request-intent.ts`
  - existing `role_model.intent` detection: `9-11`
  - progressive-disclosure classification for inject: imports `classify-with-progressive-disclosure`
- `packages/pi-role-model/src/commands.ts` — status/doctor/alias/requests/explain command matrix (pi UX, not CLI bin)
- `packages/pi-role-model/src/runtime-inspection.ts` — runtime requests + router decision inspection APIs
- `packages/pi-role-model/src/model-guidance.ts` — deterministic invalid-model guidance
- `packages/pi-role-model/skills/role-model/SKILL.md` — skill packaging pattern for R8
- `apps/docs-site/content/docs/integrations/pi.mdx` — docs-site integration page pattern for R9

## Known Unknowns

- Whether Codex provider id `role-model` collides with reserved provider ids (Fixed Decision #24 — must verify during implementation/Phase 5; addendum if collision).
- Exact Codex Desktop vs CLI vs IDE restart/catalog-refresh UX on this machine (Phase 5).
- Live role-model runtime channel/port availability for Phase 5 proof (expected local `:3456`; runtime not managed by this package per OOS14).
- Whether untracked `packages/codex-role-model/` WIP in the working tree predates Phase 2 lock — Phase 1 treats baseline commit as sole product authority.

## Evidence

- Baseline tree inspection: `git ls-tree` at `6cf19bf0` shows no `packages/codex-role-model`
- Worktree setup baseline: `corepack pnpm --filter @try-works/pi-role-model test` PASS per `00-worktree.md`
- Docs inspection: `pi.mdx` present, `codex.mdx` absent
- Requirements Fixed Decisions captured: user-level Codex config only, adapter `:3460`, pi-parity intent, Codex-owned compaction, strict TDD, Phase 5 real Codex + runtime proof

## Gaps Found

None for the Phase 1 AS-IS audit artifact. Product implementation gaps (Codex package absent for every R#) are expected baseline findings recorded under Current Behavior by Requirement and Requirement Completion Status for Phase 2 planning.

## Repair Work Performed

None. Phase 1 is observational only; no production code, tests, or docs were changed for this artifact.

## Earlier Phase Reconciliation

- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED) remains fully aligned with observed baseline; no requirement widening needed during AS-IS.
- `/.recursive/run/89-codex-role-model-package/00-worktree.md` (LOCKED) diff basis fields match live git: baseline `6cf19bf033c23246c173a1bf634d13b2c822b2d8`, comparison `working-tree`, command `git diff --name-only 6cf19bf033c23246c173a1bf634d13b2c822b2d8`.
- No addenda exist for run 89.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- Comparison reference: `working-tree`
- Normalized baseline: `6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- `git diff --name-only 6cf19bf033c23246c173a1bf634d13b2c822b2d8` result: *(empty — no tracked file diffs vs baseline)*
- Untracked paths (`git ls-files --others --exclude-standard`) at audit time:
  - `.recursive/run/89-codex-role-model-package/00-requirements.md`
  - `.recursive/run/89-codex-role-model-package/00-worktree.md`
  - `.recursive/run/89-codex-role-model-package/01-as-is.md`
  - `.recursive/run/89-codex-role-model-package/02-to-be-plan.md`
  - `.recursive/run/89-codex-role-model-package/locks/00-requirements.receipt.json`
  - `.recursive/run/89-codex-role-model-package/locks/00-worktree.receipt.json`
  - `packages/codex-role-model/**` (untracked Phase 3 WIP — not claimed by this AS-IS baseline matrix)
- Unexplained product drift: none relative to baseline commit; untracked codex package is post-baseline WIP outside Phase 1 authority.

## Subagent Contribution Verification

- No subagent was used for Phase 1 AS-IS analysis.
- Main-agent verification: baseline git tree inspection, pi-role-model source reads, docs path checks, and reproduction commands above.
- Acceptance Decision: N/A
- Repair Performed After Verification: none

## Traceability

- `R1` → baseline absence of `packages/codex-role-model`; workspace `packages/*`; pi package scaffold reference
- `R2` → pi `config.ts` + `runtime-discovery.ts` + `downstream-openai.ts` as parity source; no Codex discovery
- `R3` → no Codex `config.toml` manager; pi alias store uses different host paths
- `R4` → no Codex `ModelsResponse` catalog; pi provider registration supplies alias metadata only
- `R5` → no `:3460` forwarder; pi `request-intent.ts` covers intent via hooks instead
- `R6` → no Codex compaction docs; requirements fix Codex-local compaction ownership
- `R7` → no `codex-role-model` CLI; pi `commands.ts` + `runtime-inspection.ts` ops parity
- `R8` → no Codex skill/plugin; pi `skills/role-model/SKILL.md` pattern
- `R9` → missing `integrations/codex.mdx`; `pi.mdx` docs pattern present
- `R10` → no codex tests/TDD evidence; pi test layout reference
- `R11` → no live Codex routing proof; Phase 5 obligation per Fixed Decision #25

## Requirement Completion Status

- `R1` | Status: deferred | Rationale: Disposition pending — Phase 1 AS-IS only; `@try-works/codex-role-model` is ABSENT at baseline `6cf19bf0`. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: workspace supports `packages/*`; pi scaffold is reference.
- `R2` | Status: deferred | Rationale: Disposition pending — no Codex discovery/trust module; pi-role-model is the parity source for Phase 3. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: pi discovery probe order confirmed in source.
- `R3` | Status: deferred | Rationale: Disposition pending — no user-level Codex config manager at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: pi uses Pi-native paths, not `$CODEX_HOME/config.toml`.
- `R4` | Status: deferred | Rationale: Disposition pending — no Codex `ModelsResponse` catalog at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: pi maps aliases to Pi provider, not Codex catalog JSON.
- `R5` | Status: deferred | Rationale: Disposition pending — no loopback Responses forwarder at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: pi intent via hooks; Codex requires adapter seam.
- `R6` | Status: deferred | Rationale: Disposition pending — no Codex compaction documentation at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: remote compact endpoints explicitly OOS.
- `R7` | Status: deferred | Rationale: Disposition pending — no standalone `codex-role-model` CLI at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: pi command matrix is behavioral reference.
- `R8` | Status: deferred | Rationale: Disposition pending — no Codex skill/plugin packaging at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: pi skill exists as pattern.
- `R9` | Status: deferred | Rationale: Disposition pending — `integrations/codex.mdx` absent at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: `pi.mdx` pattern available.
- `R10` | Status: deferred | Rationale: Disposition pending — no package-owned code or strict TDD evidence at baseline. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: Iron Law applies from Phase 3 onward.
- `R11` | Status: deferred | Rationale: Disposition pending — no live Codex→adapter→runtime routing proof. | Deferred By: `/.recursive/run/89-codex-role-model-package/01-as-is.md` | Audit Note: iterate-until-green gate per Fixed Decision #25.

## Coverage Gate

- [x] R1–R11 each mapped to baseline absence plus pi/docs parity references where applicable
- [x] Codex package ABSENT at baseline explicitly recorded for every requirement
- [x] Source Requirement Inventory lists all in-scope R1–R11 with quotes from locked requirements
- [x] Reproduction steps are novice-runnable from the worktree
- [x] Reserved-provider-id and Phase 5 unknowns captured in Known Unknowns
- [x] Worktree diff basis matches locked `00-worktree.md`

Coverage: PASS

## Approval Gate

- [x] AS-IS is sufficient to drive Phase 2 TO-BE planning without inventing runtime compact ownership
- [x] Diff basis remains `6cf19bf033c23246c173a1bf634d13b2c822b2d8`
- [x] No requirement contradictions with locked Phase 0

Approval: PASS

## Audit Verdict

Phase 1 confirms the greenfield baseline: `@try-works/codex-role-model` is entirely absent at commit `6cf19bf0`, while `packages/pi-role-model` and `integrations/pi.mdx` provide the authoritative behavioral and documentation patterns to adapt. Codex-specific seams (user-level `config.toml`, `ModelsResponse` catalog, loopback `:3460` forwarder, skill/plugin packaging, and Phase 5 live routing proof) have no baseline implementation.

Audit: PASS
