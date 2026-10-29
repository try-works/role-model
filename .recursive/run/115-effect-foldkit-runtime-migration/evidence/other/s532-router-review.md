# S532 — independent review: S530 router-family structural port

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only source/test; no edits, no commit.

## Frozen bytes

- `src/router-family-view.ts` `8A63CAE20F765C7EE01673F9217AB7A378D4A66F5E58F83FF9F37EC92E7F7D03` (20181 B)
- `test/s530-router-family.test.ts` `36CB97A2895606CB14DA63A7439AF3364D84007B6BC06316657FC0910B9DE879` (6013 B)
- `src/view.ts` `338E5E5E3372E2783E0D6A91BE687A58E47AB4209070BCCA65E300066DC7C3E9` (74324 B)

All hashes match. Eight routes are wired in `view.ts:970-1013`: Router, RouterCandidates, RouterDecisions, RouterStrategy, RouterWorkloads, RouterConfig, RouterAgentStrategy, ControlController.

## Bounded verdict: HOLD

### 1. `/router` does not carry the reference title

The reference headings for `/app/router` are `Routing overview`, `Alias inventory`, and `Routing candidates` (audit ref JSON). The port renders `Router` as the page h2 (`router-family-view.ts:155`), then the two section titles. `Routing overview` is absent. The S530 test (s530:57-60) checks only the two section titles, so the missing reference title is not caught. Fix: render `Routing overview` (reference title) and add it to the test.

### 2. Presentation-only editor limitation is not disclosed

The strategy/workload/agent editors render disabled `select`/`input` controls (`router-family-view.ts:73-102`) and disabled buttons when no Message is supplied (`:61-71`), but there is no explanatory text that these editors are presentation-only/non-functional. Disabled styling alone is not the disclosure the task requires. Add an explicit read-only/preview limitation note on the editor pages (and test it).

### 3. Strict RED evidence is not captured

No `s530-red.log` or equivalent run evidence exists under the run's `evidence/logs`; the only available proof is the current 8/8 green suite. The task requires strict per-page RED. The review cannot verify that the reference titles failed on HEAD before implementation. Capture RED (titles absent per page) or provide the author evidence path.

### 4. The 0.9x route-dump textLen gate is not demonstrated

The S530 task acceptance says each route-dump textLen must be >= 0.9x reference. The S530 test renders a synthetic DOM with one seeded representative row and asserts selected labels; it does not measure the audit `textLen` against `audit/ref/<key>.json`. No live route-dump evidence is present in this slice. This is an acceptance gap, not a claim that every page is short.

## What passes

- The eight renderer functions exist and are wired to the eight routes.
- Reference section labels are present for candidates (`Candidate inventory`), decisions (`Routing decisions`, `Decision ledger`), strategy/config (`Routing strategy`), workloads (`Workloads`, `Posture diagnostics`, `Workload templates`, `Entries`), agent strategy (`Agent strategy`, `Posture diagnostics`, `Entries`), and controller (`Routing controller`, `Controller assignment`).
- `s530-router-family.test.ts`: **8/8 passed**; `s247-click-budget.test.mjs`: **3/3 passed** via `node --test`; UI tsc 0.
- Lint: `router-family-view.ts` 0, s530 test 0; `view.ts` 29 is the existing whole-file baseline and no added-line finding was found.
- Editors are visibly disabled, and controller promotion uses an existing control command; no source/runtime change outside these UI files.

This is not a broad router-family acceptance; the title, disclosure, RED evidence, and textLen gate gaps above need repair/re-evidence.

No source/test/config file was modified; no commit.

## FINAL re-review on refrozen bytes — PASS (bounded)

Active model verified **deepseek-flash**. Final hashes: router-family-view `165F77C6B0A2FC925CF939443E015B972A86F2FB5F8C60E2D3CDF2408CD7A0C1` (20693 B); s530 test `49DDEBED896AD1F9604CC32447EC661DBBD22CB42B9D946AD458F23C6C935116` (6097 B); view unchanged `338E5E5E…C7C3E9`. No edits/commit by me.

- **Title fixed:** `/router` now renders `Routing overview` plus `Alias inventory` and `Routing candidates`; s530 test asserts the title.
- **Disclosure fixed:** the four editor routes render `Preview only: these editors and controls are not wired to the runtime yet. Saving, templates, and add/remove actions are disabled and make no runtime writes.` (`preview-only` marker); strategy/config/workloads/agent tests assert `Preview only`.
- **RED evidence:** `s530-red.log` is a strict byte-copy revert of only the eight route-registry entries: **8/8 tests failed**, including `Routing overview` and `Preview only`; the restored current hashes and 8/8 green prove the restore.
- **Audit gate:** `s530-audit.log` reports 8/8 routes with reference structural titles. Five routes meet >=0.9x textLen with data (`/router` 107.3%, candidates 97.1%, strategy 686.2%, config 931.9%, controller 112.1%); three data-empty routes are reported honestly below 0.9x (`decisions` 1.6%, `workloads` 81.5%, `agent-strategy` 45.8%). This matches the Lead's 5/8-with-data + 3-data-empty description and does not fabricate length.
- **Gates:** s530 **8/8**, s247 **3/3**, UI tsc 0; lint router view/test 0, view 29 pre-existing baseline. No added-line finding.

### FINAL BOUNDED VERDICT: PASS

The four prior HOLD items are resolved with genuine RED and audit evidence. This is a bounded router-family structural port, not broad UI/release parity; data-empty pages retain honest short text states.

No source/test/config file was modified; no commit.

