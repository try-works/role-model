# Run 115 - consolidated status (written at round 78, from evidence in this directory)

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
| Full host suite 2,620/2,626, one classified pre-existing failure | `s100-host-suite-final.md`, `s98-host-full-after-scope.md`, `s53a` baseline reproduction |
| Client suite 257/257 (26 files), `tsc` 0 | `s85-repairs-verified.md` and repeated serial runs |
| D-vs-C **byte-identical** on 6 of 7 surfaces under one fixture config | `s91-byte-parity.md` |
| R/D/C triple with **zero migration regressions** | `s89-rdc-triple.md` |
| R staged byte-identical (159 files, same exe sha256) and run isolated on its own state | `s90-r-staging.md` |
| Controller PATCH and runtime-config PUT verified (falsifiable test + scripted logged E2E) | `s74-controller-verified.md`, `evidence/e2e/s86-config-editor.ps1` + `.log` |
| R17 J3 cancel/error PASS; J4/J6 honesty PASS | `s66-r17-corrections.md`, `s67-journeys-verified.md` |
| Every UI state (success/empty/error) witnessed on the SHIPPED build | `s101-final-visual.md` |

## The 32 blocked rows, by what would unblock them

**A. External capability absent from this environment (cannot be produced here):**
- **R15** - needs a live provider through an isolated client profile; no credential may be replayed from the operator runtime.
- **J4 effort-honoring (inside R17)** - needs an OpenAI Codex subscription account or a catalog carrying `reasoningEffortLevels`; the repo catalog has no such field (`s97-j4-effort-seam.md`).
- **J6 execution (inside R17)** - needs the private replay-core authoritative trace root; only read routes exist (`s88-j6-contract.md`).
- **Model pool (inside R13)** - needs benchmark/profile data; the released runtime's own endpoints report `operationalProfile: null` and no completed benchmark run (`s79-r16-refreshed.md`).

**B. Owner decision required:**
- **R16** - the like-for-like seeding clause needs an equivalent authorised config; using the operator's real config would put credentials on disk, so it needs explicit permission (`s93-owner-questions.md`). The R/D/C comparison and the isolated-R staging are already done.

**C. Network action forbidden in this run:**
- **Packaging self-containment** - declaring the CSS toolchain needs `pnpm install` to regenerate the lockfile; the offline attempt failed and was reverted cleanly (`s92-lockfile-blocked.md`).

**D. Engineering still available to me:**
- **R27** - ownership is done (one scope, ordered release, failures visible); the closed **Effect Layer DAG** is not, and acquisition remains imperative.
- **R7/R8 and similar rows** carry generic rationales ("part of this requirement has landed... not satisfied in full"). Those rows need a per-requirement audit before their status means anything; I am flagging that rather than pretending the boilerplate is evidence.

## What I would do next, in order

1. Per-requirement audit of the generic blocked rows (R7, R8, and any other boilerplate rationale), because a status nobody can act on is worse than an honest "unknown".
2. R27 Layer DAG for the host composition root, sequenced as its own run.
3. R16 seeding and J6 execution as soon as the owner decides.
