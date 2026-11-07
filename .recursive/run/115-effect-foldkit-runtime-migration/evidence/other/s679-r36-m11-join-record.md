# S679 - R36 M11 backend/client join record (with durable action records)

Date: 2026-11-07.

## Join record (backend -> client -> private plane, per wave)

| Wave | Backend (host bridge) | Client (Foldkit UI) | Private plane | Action records |
|---|---|---|---|---|
| S664 OAuth connect | device-auth start/activation routes e4b576eb, d2bc3081 | connect card + device block 1f43f73d (modal), s664 tests | - | subagents/20261107T055129Z-s671-ui-fixes-action.md |
| S667 real-model lane | request telemetry + capture | benchmark + requests pages | - | evidence/other/s667-real-model-verification.md |
| S668-S669 benchmark | run progress/status 9b39c586, case ceiling 7d009224 | progress/results/outcome UI, off-by-one 161b340b | - | subagents/20261107T055133Z-s671-host-fixes-action.md |
| S671 state machines | activation/fence/ledger/capture/disposition 4ecf0d43+0562a130 | 6 P2s 662e67ff | drain/trim/close/two-phase/disposition b4688938; projection 223c82af; lease 423f439d | 20261107T055129Z/055133Z/055137Z/055141Z |
| S674 alias/R15 | runtime-config model_aliases; package restarts | - | - | evidence/other/s674-r15-pi-verification.md |
| S675-S677 build/proof | package-sea with paired private distribution | client baked into the exe | track-b manifests e1d678a8, 13 extensions | evidence/other/s675-new-build.md, s676, s677 |

## Durable action records
- 113 pre-existing records under subagents/ cover the earlier waves (as-is, plan, S10/S12 waves,
  S274-S285).
- 4 new records were written this increment for the S671 waves, each citing the changed files, the
  finding, and the verification path:
  subagents/20261107T055129Z-s671-ui-fixes-action.md,
  subagents/20261107T055133Z-s671-host-fixes-action.md,
  subagents/20261107T055137Z-s671-private-capture-action.md,
  subagents/20261107T055141Z-s671-private-projection-action.md.

## Verification of the join
The packaged build 0.0.20-818-g9ff48b98 contains the same client (verify-packaged-candidate 12/12 PASS),
the same host code (host suites 32/32, benchmark 22/22), and the private distribution built from
b4688938 (34/34 + 40/40). The live join is exercised in s676 (telemetry -> capture -> replay -> evaluation
-> learning) and s677 (cross-repo proof).
