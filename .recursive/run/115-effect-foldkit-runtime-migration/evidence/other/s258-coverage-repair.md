# S258 Coverage repair after independent review

Status: repairs verified; overall adoption acceptance remains open.
Actual goal round: 229 (goal tool); previous conversational 230/231 labels are not authoritative.
TDD: regression-sensitivity check for test-only repair. No persistent production change.

## Effective correction to S256 batch evidence

S256's claim that old s46a measured count was 4 was false. At f3419212 it had 6 sites. The delegated conversion removed integration assertions. S254 prefix/uniqueness checks did not preserve exact paths/payloads. Scene/model-injection tests do not replace mounted-shell-to-client wiring. S254 was authored by the earlier Lead then committed by the worker; controller owns inadequate assertions and acceptance claims.

Current budget is **27**, not 22 or 26: s46a6, s76a11, diagnostics1, mount1, routes1, s25b1, s26b3, s26k1, s40b1, s73a1. Coverage takes priority over reducing this metric. Restoring lost coverage is an explicit repair exception, not a hidden increase.

## Repairs

- S254: exact literal method/path/body expectations for all five tabs; five real createStudioClient checks for URL, serialization, headers, signal, error status/raw response.
- S46a: restored pointer/idle integration and all-tab click -> client dispatch with exact paths/payloads, 404 presentation and duplicate detection.
- S76a: restored f3419212 verbatim: invalid click/no-PUT, real diff derivation/applied editor and notice, stale-confirm, 409.
- Inventory: mounted-shell proof references restored; advanced/audio/rerank downgraded verified -> wired; totals 33 verified/4 wired. Images limited explicitly to fixture request/404, not live capability.

## Verification

Temporary audio mutation alloy -> s258-mutant: original S254 **3/3 passed** (s258-old-proof-mutant.log); strengthened S254 **2 failed/6 passed** (s258-new-proof-red.log). Source restored in finally; no persistent src diff.
Targeted typed restored suites 24/24; click invariant3/3.
Final full command corepack pnpm run test, TMP=TEMP=E:/rm-tmp: exit0, **39 files/326 tests**, **20/20 invariants**, tsc included. Local raw log E:/rm-tmp/s258-final-full.log; not packaged proof.
anti_slop_lint: repaired S254 clean (1 file/15 rules). Earlier S251/S253 each have15 findings (chained casts, unknown parameters, unsafe dictionaries); restored s46a11 findings in existing code. Whole directory is NOT lint-clean.

## Review and limits

Subagent Capability Probe: s9b-reviewer team metadata deepseek-flash; reviewer reports actual deepseek-official/deepseek-flash route. No new controller request-header proof gathered in this slice. Earlier implementation workers were GPT per team metadata, not retroactively Flash.
Delegation Decision Basis: independent read-only reviewer, not original worker or Lead repair author.
Canonical diff basis: 00-worktree.md f0d50fab083e3fe8daf2474cd9fb08b51066c8e1 -> working-tree; bounded batch 9a856e90..a02b8c11, repairs against469fb94b.
Lead read s258-independent-review.md rejecting original coverage and s258-recheck.md confirming restored assertions (33 targeted passes) with caveats. Reviewer corrected Lead total26 ->27; corrected here.

Open before overall adoption acceptance:
1. Domain-typed command/model/update test harnesses instead of positional as-never/as-unknown casts (S245/S250/S251/S253/S255/S256/S257).
2. S257 must check all commands, not only save factory count.
3. Broad audio/advanced/rerank endpoints and configured-model execution remain unverified. Fixture defaults are not worker-route evidence.
4. Backend R27 CLI Layer DAG is NOT closed by a frontend Foldkit Layer change. Earlier S245/S247 equations are hypotheses, not verification.
5. F152 private caller fix not implemented here. Historical cause does not waive the current release gate.

No overall goal or adoption-phase completion claimed.
