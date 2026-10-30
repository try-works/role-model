# S546 — independent review: S541 learning/models/studio density

Reviewer: `s9b-eventlog`, actual model **deepseek-flash** (verified with `list_agents`). Read-only review; no source/test edits and no commit. The only write is this evidence file.

Snapshot: public worktree `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, HEAD `c6e7d0c0`. S541 is still an uncommitted/untracked working-tree slice.

## Frozen bytes verified

| Artifact | sha256 | Result |
|---|---|---|
| `src/features/learning/routes.ts` | `283FB972D1EB04DAD0642F7BFF57604C67B7B215A482109137434532320BA867` | match (12309 B) |
| `src/features/models/routes.ts` | `5BFC7F1F62DB039CF0D200C5440EB7BD1B5DDF8DA7E2E178C39D82EB0C9A3F95` | match (8550 B) |
| `src/families-view.ts` | `EBBB8C06932183A2354371F4D89C71DEB556CCBFC71960615088B7E3E112B689` | match (5987 B) |
| `src/view.ts` | `71B8A04AB46731E22E8587B77486E9B1BCC003B0B636354034FA15D14C1CD6CB` | match (81481 B) |
| `test/s541-density.test.ts` | `016F10DE666A153B700CE22ECC9320F4B80424BC824FE22DAF838691EB187089` | match (4422 B) |
| `s541-red.log` | `41D8C678F8B84DB39418D2AB68B33C30A5D00E32910934201F40ADF4E096E596` | match (2068 B) |
| `s541-green.log` | `90C9EAC9DA343591CE16FEA3964B98260DB3C3E14049191CDB9AD2F927BCAB42` | match (158409 B) |
| `s541-audit.log` | `33DF23F6B2FC97E5D0D49792A8FBFDB84675C34BDD2C3E8DE679157EDF8D82BB` | match (2535 B) |

## Verdict: **HOLD**

The implementation is a real, honest density improvement, and the disclosures in `s541-audit.log` are accurate. It does **not** meet S541's own acceptance gate: only 6 of 11 target pages have a >=0.9 text measurement, `/models` is explicitly 74.3% and not claimed, four studio tabs have no text measurement, and the structural test asserts text labels only (not table columns or controls). Strict RED provenance is also not independently reproducible. Commit as WIP only, or have the Lead explicitly re-scope acceptance; do not mark S541 complete as written.

## Acceptance matrix

| Target | Frozen evidence | Verdict |
|---|---|---|
| `/learning` | 148.2% (797→1181) | PASS text gate |
| `/learning/packs` | 117.8% (887→1045) | PASS |
| `/learning/evidence` | 105.4% (1375→1449) | PASS |
| `/learning/decisions` | 131.5% (639→840) | PASS |
| `/learning/history` | 144.9% (503→729) | PASS |
| `/studio` (chat) | 165.4% (130→215) | PASS |
| `/models` | 74.3% (1570→1166) | **FAIL text gate; not claimed** |
| `/studio/images` | no URL text measurement | **structural-only** |
| `/studio/audio` | no URL text measurement | **structural-only** |
| `/studio/rerank` | no URL text measurement | **structural-only** |
| `/studio/advanced` | no URL text measurement | **structural-only** |

Arithmetic checks out: 797/1181=148.18%, 887/1045=117.80%, 1375/1449=105.38%, 639/840=131.46%, 503/729=144.93%, 1570/1166=74.27%, 130/215=165.38%. The audit does not claim `/models` as a pass. It states that the 60-request fixture seed got HTTP 503 for every alias and that the audit therefore used existing dev telemetry — a genuine limitation, honestly disclosed, but it means the required post-fixture text gate was not run.

Result: **6/11 pages have a passing text ratio**, not 11/11. 11/11 have the reference labels asserted by the test. That is a useful structural checkpoint, not the task's density acceptance.

## Strict RED and test adequacy

- `s541-red.log` records `Tests 11 failed (11)`, `VITEST_EXIT=1`, and one failure line per page. The listed absent strings match the current test's per-page labels. This is consistent with an 11/11 label RED.
- The RED provenance is **not** the frozen test: the log records `d9e40cbc6ec91f73235128d1cbb133bd957dc0bcc80d7b89068f7ea4c8a8358b`, while the reviewed test is `016f10de...`. No copy of `d9e40`, no diff, and no “type-only delta” disclosure exists in the public S541 artifacts. I searched `.recursive` for the hash and found only line 3 of `s541-red.log`.
- The RED log is a hand-written summary, not captured vitest output; it explicitly says the raw transcript was captured to the console and was not re-run after implementation. The strict RED claim is therefore plausible but not independently auditable at the frozen bytes.
- `test/s541-density.test.ts` only calls `expectTitles` and `expect(text).toContain(title)` on `container.textContent`. It does not assert `table`/`thead`/`tbody`/`svg`, column headers, button/input/select counts, accessible names, or handlers. It cannot prove the task requirement to render “table column set and control verbatim.”
- Some newly added controls are labels, not controls: `models/routes.ts:56-59` and `:80-83` add four buttons with no `OnClick`/message; `view.ts:796` and `:798` use text inputs for “Endpoint family” and “Contract /v1/rerank”; `view.ts:802` renders “Voice · Select…” as a `<p>`, not a select. The tests still pass because they only look for the strings.
- The audit's structural check is reference `headings` only. The captured reference JSONs in `D:/DEV/rm-clean/audit/ref` contain `headings`, `text`, `links`, `counts`, and `dataRoutes`; they do not contain table columns or controls. “No missing headings” is therefore not the same as “all sub-sections, metric blocks, columns and controls” from the task.

## What is genuinely restored and green

- `page()` in `features/learning/routes.ts` now sets `data-route=routeName` and `data-learning-family-state=stateOf(readback)`; the learning overview custom section sets `data-route=learning`. This restores the legacy markers used by `s386-learning-family.test.ts` (`[data-route='learning-decisions'][data-learning-family-state='ok']`, etc.) and `s67a-learning.test.ts` (`[data-route='learning']`, `[data-readback-route='learning']`).
- `s386` 7/7 and `s67a` 4/4 pass inside the 78/78 run. I independently ran the S541-green command's nine files: **9 files, 78 tests passed**. `s541-density` itself is 11/11 green.
- Independent checks: UI `tsc --noEmit -p tsconfig.json` → **0**; `node --test test/s247-click-budget.test.mjs` → **3/3**, exit 0; anti-slop on the four source files and the test → learning 0, models 0, families-view 0, test 0; `view.ts` 29 findings, same as the HEAD-view baseline (29), so no added-line finding was observed.
- `s541-green.log` independently records the same 78/78 result. The audit's 6/7 ratio table, the `/models` 74.3% non-claim, the four structural-only studio tabs, and the fixture 503 are all disclosed rather than hidden.

## Findings, ranked

1. **HOLD: density acceptance is 6/11, not 11/11.** `/models` is 74.3% and four studio tabs are unmeasured. The task requires reference headings plus >=0.9 text per page after fixture traffic; neither the missing fixture run nor the studio measurements were completed.
2. **HOLD: the structural test does not test structure.** It asserts only text containment. It would pass if the tables, columns, SVGs, and controls disappeared, provided their labels remained as plain text. The added models/studio controls include non-functional buttons and placeholder text that the test cannot distinguish from real controls.
3. **HOLD: strict RED provenance is unverified.** Current test `016f10de` is not the `d9e40` test recorded in the RED log, and no type-only delta artifact exists. The raw RED transcript was not retained. Re-run RED from a restored pre-S541 HEAD with the final test and record the raw output and matching hash, or retain the d9e40 file and a diff.
4. **Scope/commit risk:** S541 is still uncommitted (`learning/routes.ts`, `models/routes.ts`, `families-view.ts`, `view.ts`, untracked test/logs). The S540 wiring is also uncommitted in the same `view.ts`; committing S541 without S540 wiring leaves the S540 test broken at HEAD. Commit/review them as one coherent slice.
5. **Data-empty charts and metric blocks:** the new learning/models metric cards are static “not measured here”/“No evidence yet” blocks and the charts remain empty-state. That is honest, but it is not populated reference density; wire real data or keep the text gate explicitly data-exceptioned.
6. **The 4 studio tabs are state-selected, not URL-dumpable.** A CDP/scene flow could click each tab and measure the rendered panel; renderToString structural coverage is useful but does not meet the route-dump acceptance as written.

## Bounded-pass condition

If the Lead explicitly re-scopes S541 to **7 URL-dumped pages + 4 structural studio tabs**, and explicitly accepts `/models` as a data-empty exception rather than a 0.9 page, then the honest evidence supports a **bounded PASS for that narrower scope**. Without that written re-scope, the correct verdict is **HOLD**: the current slice is an improvement, not S541 acceptance.

No source or test edits; no commit. Review limited to the frozen S541 slice and the public artifacts above.

---

## FINAL RE-REVIEW — refrozen S541+S544 bytes

Re-reviewed 2026-10-30 after refreeze. Model still **deepseek-flash** (`list_agents`). Read-only; no source/test edits; no commit.

### Frozen hashes

| Artifact | sha256 | Result |
|---|---|---|
| `src/features/models/routes.ts` | `25C2BD2C4990457469CF42F842DFB9ECEE4E3ABAF67B114DAEBA8499B840A94F` | match (10035 B) |
| `src/view.ts` | `E56365D104AF2FA1595F2BAF1317E86646A950CD3B3B44FF707BF6DDB2691D48` | match (82824 B) |
| `test/s541-density.test.ts` | `882C518E209130E23C1F9FC707C490F3EF1BAEFED4BC4EA29B64BAE079F78D50` | match (7058 B) |
| `test/s544-models-studio-depth.test.ts` | `1FD561AC480427BA51A6A3465221A9DB026AADB8A478103AB7E4FFE1E396A922` | match (2754 B) |
| `s541-red-final.log` | `8C270E55B2751F6CDC9B858034DD237BFC45DA127C244780CFC991E0920DBFF3` | match (24431 B, full run) |
| `s544-red.log` | `9E679F0264670753125900C882C05A343B6C301E45A0569C2A61088965A6F4FD` | match (24410 B, full run) |
| `s544-audit.log` | `6E90AF5087CEC91D9F0FC98D99AD434D6A1366B6A74F85DEFD5C0DE75590FB8D` | match (1511 B) |

### HOLD item resolution

| Prior s546 HOLD | Resolution | Evidence |
|---|---|---|
| `/models` was 74.3%, below gate | **Resolved**: 2342/1570 = **149.2%**; 28 role rows; reference task counts visible | `s544-audit.log`; `s544-green.log`; current `models/routes.ts` |
| Models controls were no-op labels; columns unasserted | **Resolved**: `Make primary controller` and `Eject controller` dispatch `Message.ControllerSaveRequested`; `Open Roles`/`Open Benchmark` are `role=button` links; table columns and controls now asserted by accessible name | `models/routes.ts:56-63`; `s541-density.test.ts:85-88` (`expectEnvelope`, `table thead th`, control lookup) |
| 4 studio tabs were unmeasured | **Resolved**: measured via `?tab=` state-selected 5s dumps — images 123.6%, audio 154.7%, rerank 134.4%, advanced 153.6%, chat 165.4%, all >=0.9 | `s544-audit.log`; `studioTabFromUrl` in `studio.ts`/`init.ts`; arithmetic verified |
| Test only asserted text labels; did not prove columns/controls | **Resolved**: `expectEnvelope` now asserts `table thead th` columns and named `button`/`[role=button]`/`input`/`select` controls; models and learning column sets are asserted | `test/s541-density.test.ts:29-57, 64-108` |
| Strict RED provenance mismatch `d9e40` vs final test; no raw output | **Resolved**: RED regenerated against the FINAL tests with full vitest output and `FINAL_TEST_SHA256` matching `882C…` (s541) and `1FD5…` (s544); no hash mismatch remains | `s541-red-final.log`; `s544-red.log`; hashes above |
| Fixture/density insufficient | **Resolved for this slice**: models audited at 149.2% with live endpoint roleIds; studio tab ratios all >=0.9; audit states dev fixture traffic | `s544-audit.log` |
| 63/63, tsc, s247, lint | **Verified independently** | below |

### Independent verification

- Eight required suites: **63/63 passed** (`s544`, `s541`, `s533`, `s491`, `s534`, `s530`, `s386`, `s67a`). Also ran `s540` separately: **11/11**.
- UI `tsc --noEmit -p tsconfig.json`: **0**, exit 0.
- `node --test test/s247-click-budget.test.mjs`: **3/3**, exit 0.
- Anti-slop: models routes **0**, s541 test **0**, s544 test **0**; `view.ts` **29** findings, same count as the committed HEAD-view baseline (29), no added-line finding observed.
- RED logs are full vitest transcripts, not summaries: s541 **6/11 failed**, s544 **4/6 failed**, both exit 1, final test hashes appended and matching the frozen tests.

### Residual caveats (non-blocking)

- `s544-audit.log` says “dev fixture traffic” but does not record the exact fixture seed/command or request count. The ratio is reproducible only if that packaged state is retained; add the command/seed for a future rerun.
- The studio `Voice` control is now a real `<select>` with options and `aria-label`, but it has no state binding/`OnInput`; it is structurally real, not functionally wired. The S541 test asserts its accessible name only. Models controls are functional and dispatch messages.
- The s541 RED learning-overview failure is a `TypeError` from the pre-S544 view wiring (`h` undefined), not a pure missing-label assertion. It is still a genuine RED for the final view and is fixed by the S544 wiring; the other five s541 REDs are studio labels, covered by S544.
- The slice remains uncommitted in the working tree. To avoid the previously demonstrated broken-HEAD condition, commit the S540 density wiring and the S541/S544 files together.

### FINAL VERDICT: **bounded PASS**

For the S541+S544 learning/models/studio density and structure slice, the prior HOLD items are resolved: 11/11 structural tests, all 11 pages now have a >=0.9 text measurement (models 149.2%; studio 123.6–165.4%), models controls/columns are asserted and functional, studio tabs are measured, and RED is reproducible against the final test hashes with full output. This is a bounded PASS for this slice only — not whole Workspace/release parity, and not a substitute for the remaining full-matrix/packaged gates. The residual caveats above should be carried forward, not treated as failures of this review.
