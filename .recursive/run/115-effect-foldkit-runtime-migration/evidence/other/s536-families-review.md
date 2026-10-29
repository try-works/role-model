# S536 — independent review: S534 families structural port

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only source/test/audit; no edits, no commit.

## Frozen bytes

- `src/families-view.ts` `60F645A1C8B0192063FD994154958CC9D743D5E20FA7598F3CC31A5E5EF9B547` (5328 B)
- `src/view.ts` `1BE8A3F2427B9C5695A66D30485A043DAFE6EB6237E68EEE329A4DFDA5548DB6` (76944 B)
- `test/s534-families.test.ts` `8B7D21F712592D12527B5F5C855D5F89D93F1422C4954FB4B248FA589AB1EF1D` (4966 B)
- `evidence/logs/s534-audit.log` `E4A89F8673D497E719670056F06078B851203F5D435087F415DB2265B61A5344` (2341 B)

All match.

## Bounded verdict: HOLD

The implementation adds section/table/SVG shells, but it does **not** carry the reference titles for several of the 12 family pages. The test and audit validate a set of port labels, not the reference headings, so their “titles missing none” result is circular.

### Concrete reference-title gaps

- **`/system/operator`** (`_app_system_operator`): reference headings are `Operator controls`, `Operator Controls`, `Trace lineage`, `Replay Jobs`, `Evaluation Jobs`, `Shadow Learning`. Current page uses `Operator status` and `Trace roots`; all five control/lineage/job/learning labels are absent.
- **`/system/peers`** (`_app_system_peers`): reference `Peer topology`, `Peer inventory`, `Peer config`, `Contract fields`; current only `System peers` / `Peer registry`.
- **`/system/storage-retention`** (`_app_system_storage_retention`): reference `Storage & retention`, `Logical classes`, `Retention policy`, `Manual pruning`; current has `Storage retention`, `Retention policy`, `Retention transactions`. `Logical classes` and `Manual pruning` are absent; the reference ampersand title is absent.
- **`/local/choose`** (`_app_local_choose`): reference `Choose local backend`, `Peer-backed models`, `Llama-swap models`, plus blocks `EXTERNAL SERVER` and `MANAGED BY ROLE-MODEL`. Current title `Local choose`, lowercase `llama-swap models`, and no `EXTERNAL SERVER`/`MANAGED BY ROLE-MODEL` blocks.
- **`/local/peers`** (`_app_local_endpoints`): reference `Local endpoints`, `Endpoint inventory`, `Add peer endpoint`; current `Local peers` / `Peer registry`.
- **`/local/logs`** (`_app_local_llama_swap_logs`): reference `Llama-swap logs`, `Structured local log history`, `Raw log streams`; current `Local logs` / `Log history`.
- **`/local/swap`** (`_app_local_llama_swap_swap`): reference `Llama-swap swap history`, `Event ledger`, `Ledger semantics`; current `Local swap` / `Swap event ledger`; reference sub-blocks `Initial load`, `Swap reason`, `Timeline order` absent.
- **`/local/llama-swap/models`** (`_app_local_llama_swap_models`): reference `Llama-swap models` (capital L); current `llama-swap models` (lowercase) though `Load model`/`Loaded models` are present.
- **`/local/llama-swap/policy`** (`_app_local_llama_swap_policy`): reference `Llama-swap host policy`, `Policy configuration`, `Raw policy`; current only `llama-swap policy`.

Pages that do match their reference task labels: `/control/providers` (three sections), `/system/extensions` (all five), and the Studio tab labels required by S534 (`Chat workspace`/`Request`/`Result workspace`, `Image request modes`, `Audio mode and request`, `Rerank request`/`Ranked results`, `Advanced workspace`).

### Why the gate passed

- `s534-families.test.ts` asserts the current port labels, e.g. `System peers`/`Peer registry`, `Local logs`/`Log history`, `Local swap`/`Swap event ledger`, `Operator status`/`Trace roots`. It does not encode the reference headings above.
- `s534-red.log` is mechanically genuine (16/16 failed before wiring) but the assertions are for those port labels; it is not evidence that the reference titles were absent/present.
- `s534-audit.log` reports “titles missing none” against the same port-label expectations; its 12/12 SVG and table counts are valid, but the title gate is circular.

## What passes

- All 12 rendered pages contain at least one SVG; the expected bounded table shell is present where the audit expects one (8 pages; providers/studio/policy have zero reference tables).
- Text-length ratios are honest: `s534-audit.log` reports 3/12 >=0.9 and explicitly does not claim 0.9 for empty-data pages.
- `src/view.ts` still contains the parallel worker’s learning entries (`learningOverviewRoute`, `learningConfigurationPage`, `learningPacksPage`, `learningDecisionsPage`, `learningEvidencePage`, `learningHistoryPage`) and models entries (`modelsRoute`, `modelsRolesRoute`); S534 did not delete them.
- Targeted run: s534 + s397 + s425 + s499 = **49/49 passed**; s247 **3/3**; UI tsc 0.
- Lint: `families-view.ts` 0, s534 test 0; `view.ts` 29 is the existing whole-file baseline, no added-line finding.
- Device-auth suites s397/s425/s499 are untouched and green.

## Required repair

Replace the port-label titles/sections with the exact reference headings/blocks for operator, peers, storage retention, local choose, local endpoints, local logs, local swap, local models casing, and local policy; update `s534-families.test.ts` and the audit expectation from the reference JSON. No broad UI/release claim.

## RE-REVIEW on refrozen bytes — HOLD (RED evidence only)

Active model verified **deepseek-flash**. Refrozen hashes: families-view `66612F47…82E144` (5932 B); view `9F205A3D…13ED3D` (78529 B); s534 test `37853177…AF1825` (5555 B); audit `48994B5F…324F01` (2465 B). All match.

- **Exact reference headings adopted:** operator (`Operator controls`, `Trace lineage`, `Replay Jobs`, `Evaluation Jobs`, `Shadow Learning`), peers (`Peer topology`, `Peer inventory`, `Peer config`, `Contract fields`), storage (`Storage & retention`, `Logical classes`, `Manual pruning`, `Retention policy`), local choose (`Choose local backend`, `EXTERNAL SERVER`, `MANAGED BY ROLE-MODEL`, `Llama-swap models`), endpoints (`Local endpoints`, `Endpoint inventory`, `Add peer endpoint`), logs (`Llama-swap logs`, `Structured local log history`, `Raw log streams`), swap (`Llama-swap swap history`, `Event ledger`, `Ledger semantics`, `Initial load`, `Swap reason`, `Timeline order`), models (`Llama-swap models`), policy (`Llama-swap host policy`, `Policy configuration`, `Raw policy`).
- **Test expectations now reference strings:** the test hash is the refrozen 378531… and asserts those exact labels, so the earlier circularity is removed.
- **Audit now compares reference headings:** `s534-audit.log` says it uses reference `<key>.json` headings; **12/12 contain every reference heading**, SVG>=1 12/12, 5/12 >=90% textLen with the empty state and honest non-claims for the rest. Tables match where expected.
- **Gates:** s534 **16/16**, s247 **3/3**, UI tsc 0; lint families-view/test 0, view 29 pre-existing. Learning/model registry entries remain present in view.ts.

### Remaining HOLD: the RED log is stale relative to the refrozen test

`s534-red.log` still lists pre-fix examples `Operator status`, `Trace roots`, `Peer registry`, `Log history`, `Swap event ledger`, and `llama-swap policy` as the failed titles. Those are the old port-label expectations, not the refrozen reference headings. The log has no current test hash/byte-copy provenance and was not re-run after the refrozen test. It is mechanically a 16/16 pre-wiring failure, but it does **not** prove strict RED for the current test/reference expectations. The task explicitly requires strict RED per page.

**Required:** rerun the byte-copy registry revert with the current 378531… test, capture a fresh RED log showing reference headings absent (16/16), restore and re-run green. Then this becomes a bounded PASS; no broad UI/release claim.

## FINAL re-review on regenerated RED — PASS (bounded)

Active model verified **deepseek-flash**. The regenerated `s534-red.log` is `41D8E26F51BBF72C9BD130F7D8124C22FE1C6575C5CE578EDC3C9CEEE3BABE90` (42,191 B). Its header names the refrozen test `37853177…AF1825`, the RED view `5b7005b2…82bb5c`, and HEAD `3dd5d2c5…`; it records **16/16 failed** with reference-title failures including `Operator controls`, `Peer topology`, `Storage & retention`, `Choose local backend`, `Local endpoints`, `Llama-swap logs`, `Llama-swap swap history`, `Llama-swap models`, and `Llama-swap host policy`. The current `view.ts` hash is the restored `9F205A3D…13ED3D`; this is a valid strict RED against the current test/reference expectations.

- Refrozen source/test/audit hashes match; exact reference headings are present across 12/12 audit routes, SVG>=1 12/12, tables where expected, and text-len reporting remains honest (5/12 >=90%, no empty-data claim).
- Test expectations are the reference strings; no circular port-label gate remains.
- Learning and models registry entries remain intact in `view.ts`.
- Current gates: s534 **16/16**, s247 **3/3**, UI tsc 0; my combined s534+s530+s397+s425+s499 run was **57/57**. The Lead's 88/88 includes the additional parallel suites; no failure was observed in the independently run set. Lint families-view/test 0, view 29 is the pre-existing whole-file baseline.

### FINAL BOUNDED VERDICT: PASS

Strict RED is now genuine and current, the reference-heading/audit gate is honest, and the family structure gates pass. This is a bounded providers/studio/system/local structural port, not broad UI or release parity.

No source/test/config file was modified; no commit.

No source/test/config file was modified; no commit.

