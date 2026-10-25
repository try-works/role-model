## Verdict

**PASS — S1a only.** No nonempty finding on F1–F5. This does not accept S1 as a whole, the migration, the runner, live/pixel parity, or network/schema validation.

## Independently observed state

- Current `src/compare.ts` SHA-256: `EFDC8ED19259348545390361CBA8C199B9A3062BDC54B9D863FED1E8375788A2`
- Current `test/compare.test.ts` SHA-256: `C100622D07C9B165348879160498706191861A09C21A57BDB5A8B475E928290C`; 35 `it(` cases.
- From `role-model-router/packages/ui-parity`: `vitest run test/compare.test.ts` → **35/35 passed**, exit 0; `tsc -p tsconfig.json --noEmit` → **exit 0**.
- `git status --untracked-files=all`: no tracked modifications. Product delta is exactly the five untracked `packages/ui-parity` files; no root/lock/private/runtime edits.

## F1–F5 checks

**F1 PASS — exact-first independent-read multiset.** Independent reads are reserved first with exact field equality, then remaining same-step candidates are paired; duplicates and variants are preserved. The regression test `[first,second,first]` vs `[second,first,first]` resolves to `[]`, and unequal counts fall through to `missing_event`/`extra_event`. The reservation excludes dependent reads, so their order is governed by F2.

**F2 PASS — internal causal order.** `findCausalOrderDifference` checks every actual event, including reads, for a predecessor that is present in the capture but not yet seen; first violation yields `causal_order_mismatch`. Both controller regressions (dependent read before its write; write before the read it depends on) pass, and non-read events are compared in expected causal sequence, not sorted by endpoint.

**F3 PASS — explicit root and invalid-input rejection.** `$scenario` is the only external root; any event whose own `step` is `$scenario` is rejected, and every other dependency must have completed earlier in each capture. Null-dependency mutations still report `dependency_mismatch`; dangling, self, and cycle cases reject; the explicit-root case returns `[]`. Validation runs when field comparison would otherwise return `[]`, so equivalent invalid input cannot pass, while any other difference already rejects. Findings remain `{code,index,step}`; tests assert body, auth, and header values are absent from serialized findings.

**F4 PASS — sensitivity and RED chronology.** `s1a-review-regressions-red.log` shows 3 failed / 28 passed of 31 at assertion level exactly on F1/F2. `s1a-dependency-red.log` shows 1 failed / 34 passed of 35 for the undeclared-dependency case. Current GREEN is 35/35 plus tsc 0. The tests exercise the repaired behaviors rather than only count multiplicity; the earlier distinct-label duplicate tests remain weaker but are now supplemented by same-step variant coverage.

**F5 PASS — stale receipt superseded.** `s1a-controller-tdd-addendum.md` explicitly declares the original 28-test receipt and its hashes historical, then records 35/35, tsc 0, and the lint claim. `s1a-tdd.json` itself still contains the old `E2E206C7…`/`0AFDC3…` hashes, but it is explicitly supplanted by the addendum; the current hashes above are the on-disk values I measured.

## Narrow scope notes

Unpaired/changed events are handled deterministically: unmatched steps become missing/extra, and same-step changed events report field codes; a non-read count mismatch cannot yield `[]` because it necessarily produces a missing/extra or kind finding. Repeated labels remain label-ambiguous (an earlier duplicate can satisfy a later reference), which is the documented narrow limitation for this slice, not a repair defect. No custom fixtures were added or manipulated; the verdict is based on source/test tracing and the exact package suite.

**Residual within S1a: none.** Remaining S1 work stays open.
