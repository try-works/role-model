# Run 115 - consolidated status (written at round 78, refreshed at round 124, from evidence in this directory)

> **Current state at round 162 (2026-10-26).** Sections below are historical and were written at rounds 78-124; the numbers in them are the numbers *then*. Everything in this first block was re-measured today.
>
> | Measure | Value | Evidence |
> |---|---|---|
> | requirement ledger | **5 verified (R4, R6, R19, R25, R26), 2 implemented (R22, R33), 32 blocked** | `03-implementation-summary.md` |
> | public host suite | **2,687 / 2,693**, one classified pre-existing failure (`run105-review-advisory-safety`), reproduces at baseline `24678a66` | `evidence/other/s186-full-suite-after-ui.md` |
> | private track-b suite | **2,886 / 2,931**, 39 failures: 5 diagnosed today as concurrency contention in `run108` (26/26 pass in isolation), the rest the same set as before, none individually proven | `evidence/other/s187-private-suite-after-backend.md` |
> | packaged candidate | `0.0.20-188-gd362b404`, exe sha `e3181d50…`, private sidecar `5c09f4ef…`, **10 gate checks PASS** | `evidence/other/s188-pair-rebuilt.md` |
> | rendered UI | 20 routes x 2 viewports x keyboard focus, **0 failures**; 5 defect classes automated (invisible control, control naming, contrast, overflow, focus) | `evidence/other/s182-rendered-ui-audit.md`, `s184-focus-visibility-check.md` |
> | parity | **D (0.0.20-1) vs C (0.0.20-188): 7 same, 2 environment-state, 0 different**; R leg **dated**, not re-measurable with a dev candidate | `evidence/other/s189-parity-at-188.md` |
> | R23 burndown | **44** transaction sites and **4** schema sites remain, each reason-bearing, both inventories enforced by tests that fail on any unlisted site | `addenda/01-transaction-ownership-semantics.md` |
> | trees | public and private both **clean**; private distribution builds without the dirty allowance | `evidence/other/s163-private-tree-clean.md` |
>
>
> **Round 184 additions to that block (UI journeys, not just rendering):**
>
> | Journey | Result |
> |---|---|
> | controller select + Save | works, model follows endpoint (S190) |
> | Studio request (click Run) | works after the route-scoped catalogue fix (S207); now a gate check |
> | endpoint admission | **not implemented**; control disabled with a reason (S208-S210) |
> | provider reconnect | targets a real account; **not exercised** |
>
> The packaged gate now drives: 10 HTTP checks, a real `/v1/chat/completions` request, the worker catalogue with a required model, 20 rendered routes at 1440x900 **and** 390x844 with focus checks, seeded Overview cards, and one Studio request. Three CI steps, all advisory pending `vars.R39_VERIFY_BLOCKING`.
>
> **Not claimed at any point:** completion. 32 rows remain blocked, each by a named external precondition (Run 88 identity, live credentials, private trace-root route, CI dispatch, or an owner decision).


This file exists because the disposition rows are the run's completion argument, and 39 rows with 32 blocked cannot be summarised by any single one of them. It states what is verified, what is blocked, and what would unblock each category - derived from the evidence files, not from intent.

## Where the run actually stands

| Disposition | Count |
|---|---|
| `verified` | **5** (R4, R6, R19, R25, R26) |
| `implemented` | **2** (R22, R33) |
| `blocked` | **32** |

I am not claiming completion. Five of thirty-nine requirements are verified, and this round added no row to that column.

## Verified in this session, with reproducible evidence

| Claim | Evidence |
|---|---|
| Packaged candidate `0.0.20-81-g17cbdd21` ships the Foldkit client (2,660,667 B) and answers `/models` 200 text/html | `s97-repackaged-verified.md` (exe sha256 recomputed by the lead) |
| **Cross-origin write vulnerability closed** - foreign Origin -> 403 `cross_origin_write_rejected`, no ACAO, no state change; same-origin and no-Origin 200; GET keeps ACAO `*` | `s84-origin-gate-verified.md` (read + ran the falsifiable test), `s86-packaged-verification.md` (packaged proofs) |
| Acquisition owned by ONE scope; both release paths through it; index 218/218 | `s95-acquisition-wired.md` (wired by the lead) |
| Full host suite **2,673/2,679**, one classified pre-existing failure (reproduces at baseline `24678a66`) | `s100-host-suite-final.md`, `s132-suite-after-slices.md`, `s53a` baseline reproduction |
| Client suite **289/289** (28 files), `tsc` 0, plus nav-resolution (25), per-route accessible names (7) and focus-visible/reduced-motion pins | `s85-repairs-verified.md`, `s110-nav-audit.md`, `s111-a11y-audit.md`, `s112-css-a11y.md` |
| D-vs-C **byte-identical** on 6 of 7 surfaces under one fixture config | `s91-byte-parity.md` |
| R/D/C triple with **zero migration regressions** | `s89-rdc-triple.md` |
| R staged byte-identical (159 files, same exe sha256) and run isolated on its own state | `s90-r-staging.md` |
| Controller PATCH and runtime-config PUT verified (falsifiable test + scripted logged E2E) | `s74-controller-verified.md`, `evidence/e2e/s86-config-editor.ps1` + `.log` |
| R17 J3 cancel/error PASS; J4/J6 honesty PASS | `s66-r17-corrections.md`, `s67-journeys-verified.md` |
| R39 tooling: fail-closed verifier + symmetric comparator + one-command candidate gate, **wired advisory into `build-binaries.yml`**, repo workflow contracts still 11/11 and 16/16 | `s105-r39-fail-open.md`, `s106-r39-hardened.md`, `s108-workflow-contracts.md`, `s109-packaged-candidate-gate.md` |
| R27 slices S128-S140: **five resources scope-owned**, one uniform release path, guards against reversion, lint 64->0, behaviour parity measured on shipped binaries (8 same / 1 environment-state) | `s128-server-scope-slice.md`, `s129-backend-scope-slice.md`, `s130-packaged-slice-and-guard.md`, `s133-owner-scope-slice.md`, `s134-uniform-scope-release.md`, `s138-antislop-pass.md`, `s140-slice-behaviour-parity.md` |
| Cross-origin gate **re-proven on the current packaged binary** (403 / 200 / ACAO* shape unchanged) | `s137-origin-gate-reproven.md` |
| Private `run115-*` suite **85/85**; three R32 slices verified by the lead; one load-flake diagnosed and fixed | `s135-r32-private-slice-verified.md`, `s144-private-suite-flake.md` |
| R28 retention off-by-one **demonstrated with numbers**, one-line fix proven in a sandbox copy, not shipped (preserve-semantics instruction) | `s143-r28-prune-defect.md` |
| Every UI state (success/empty/error) witnessed on the SHIPPED build | `s101-final-visual.md` |

## The 32 blocked rows, by what would unblock them

**A. External capability absent from this environment (cannot be produced here):**
- **R15** - needs a live provider through an isolated client profile; no credential may be replayed from the operator runtime.
- **J4 effort-honoring (inside R17)** - needs an OpenAI Codex subscription account or a catalog carrying `reasoningEffortLevels`; the repo catalog has no such field (`s97-j4-effort-seam.md`).
- **J6 execution (inside R17)** - needs the private replay-core authoritative trace root; only read routes exist (`s88-j6-contract.md`).
- **Model pool (inside R13)** - needs benchmark/profile data; the released runtime's own endpoints report `operationalProfile: null` and no completed benchmark run (`s79-r16-refreshed.md`).

**B. Owner decision required:**
- **R16** - the like-for-like seeding clause needs an equivalent authorised config; using the operator's real config would put credentials on disk, so it needs explicit permission (`s93-owner-questions.md`). The R/D/C comparison and the isolated-R staging are already done.

**C. External event required (not a missing capability):**
- **R39** - both scripts exist, fail closed, are exercised against packaged artifacts, and are now **called from CI as advisory steps** in `.github/workflows/build-binaries.yml`: "Verify packaged client journeys (R39)" before archive/attest, and "Compare accepted stage package against the production candidate (R39)" in the production channel. Both are gated by `vars.R39_VERIFY_BLOCKING` and fail on exit 1 **and** 2 once blocking. Remaining: **one dispatch run** to validate the steps and discover the stage-package extraction path (the compare step is fail-closed `NOT RUN` until then), and the toggle flip.

**D. Network action forbidden in this run:**
- **Packaging self-containment** - declaring the CSS toolchain needs `pnpm install` to regenerate the lockfile; the offline attempt failed and was reverted cleanly (`s92-lockfile-blocked.md`).

**E. Engineering still available to me:**
- **R27** - ownership is done (one scope, ordered release, failures visible); the closed **Effect Layer DAG** is not, and acquisition remains imperative.
- **R7/R8 and similar rows** carry generic rationales ("part of this requirement has landed... not satisfied in full"). Those rows need a per-requirement audit before their status means anything; I am flagging that rather than pretending the boilerplate is evidence.

## What I would do next, in order

1. Per-requirement audit of the generic blocked rows (R7, R8, and any other boilerplate rationale), because a status nobody can act on is worse than an honest "unknown".
2. R27 Layer DAG for the host composition root, sequenced as its own run.
3. R16 seeding and J6 execution as soon as the owner decides.
