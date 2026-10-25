# S1e verdict: PASS (S1e only)

**Artifacts / hashes (verified read-only)**
- `src/structure.ts` current SHA-256 `BC55B75B0407752DC42A5D512ED105B4A585845BCCEB03D4A71DD5B063002C84` (155 lines, 140 non-blank).
- `test/structure.test.ts` SHA-256 `349A2143F5239A998C94BB6904C5432A75D6AA82966EC0513CFD366FC4045A26` — unchanged across RED/GREEN/final.
- Receipted final source `8A8FE883C3F80156A594CFBEE37C2603405B3429612687ED18F0E48BF6629EC4`. I reconstructed that exact hash in memory by inlining the `PreparedCapture` return type and deleting the named interface. The current file is therefore the receipted runtime plus the disclosed type-only anti-slop fix; JS behavior is unchanged.
- Evidence logs all match `s1e-tdd.json`: RED `D9E4C025…`, GREEN `196B9DB7…`, refactor `A199BF8D…`, compact `8C88A7A2…`, tsc `76BD2084…`.
- RED = `18 failed | 7 passed`, exit 1, assertion-only (no missing module/setup). Compact = 25/25, exit 0. I reran the current suite once: **25 passed, exit 0**. tsc receipt exit 0; controller combined 120/tsc0 accepted as reported, not reproduced.

**Review answers**
1. **False PASS — none for valid finite captures.** `addPairDiffs` (L66–75) compares all four rect dimensions at exact default tolerance and the sorted union of style properties; `addIdentityDiffs` (L77–86) covers text/role/name/kind; every non-exact pair emits at least one draft, and every unmatched node becomes `missing_node`/`extra_node` (L143–153). Counts of repeated occurrences are tested, including missing/extra one-of-two.
2. **Determinism — passes.** Identity is exact text or exact role+name (L32–34). Exact geometry/style occurrences pair first, then remaining occurrences sort by canonical placement (L102–118). Repeated-identity reversal tests pass, and canonical ordering is independent of array order. Cross-identity ties at identical placement can change *classification* (e.g. two `kind_changed` vs `text_changed`+`name_changed`), but never suppress a finding; the locked order-independence clause is scoped to identity+geometry agreement, so this is out of contract.
3. **Grouping — correct.** Groups are keyed by code+detail, `count` is one per draft, and expected/actual index arrays are sorted ascending (L88–100). The three-occurrence style test asserts a single group with count 3 and indexes `[0,1,2]`.
4. **Tolerance — correct.** Default is 0 (L125); `Number.isFinite` plus non-negative validation throws for NaN/Infinity/negative tolerance (L126), so no option silently masks geometry. 0.01px and 5px fail; explicit 0.5 is applied inclusively.
5. **Full style-property loss — detected.** The union walk emits a `style_changed` per retained expected property, so expected `{color, display}` versus actual `[]` yields two findings. It is unit-tested only for one lost property; symmetric omission from both captures is inherently undetectable here and belongs to the adapter’s CSS property list.
6. **No default browser capture evidence.** The module has zero imports/IO; tests construct literals only. No browser, pixel, React, or full-parity claim is present.

**Residual, non-blocking**
- **NaN rect masks geometry:** `addPairDiffs` L68 uses `Math.abs(expected - actual) > tolerance`; `NaN > 0` is false, so `[text("A",{rect:NaN})]` vs `[text("A",{rect:0})]` returns `[]`. The contract defers capture validation (“externalvalidationlater”), so this is adapter-scope; recommend an adapter/`prepare` finite-value guard mapped to `invalid_capture`.
- **Invalid tolerance guard untested:** NaN/Infinity/negative throw correctly, but no test asserts it.
- **Whole-list style-loss test missing:** add expected `{color,display}` vs `[]` for explicit coverage.

**Scope**
HEAD is `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`, matching the public baseline. `git status` shows only stated pre-existing root/S1a–d work outside S1e; the reviewed source/test contain no index/export/browser edits. The untracked `ui-parity` package prevents independent diff isolation, but the S1e evidence names exactly the two permitted files plus `s1e-*` receipts.

No HOLD condition within the locked §6.3 comparator contract.
