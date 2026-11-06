# S567 — independent review: S563 Router/Observe/Connect layout

Reviewer: `s9-private-readonly`, actual model **deepseek-flash**. Read-only public worktree; no source/test edits, no commit.

## Frozen-byte check: FAIL

The supplied hashes do not match the working tree for four of eight files:

| file | supplied | actual |
|---|---|---|
| `src/features/s563-layout.ts` | b63e1368… | **b63e1368…** match |
| `src/features/s563-pages.ts` | 612770f0… | **612770f0…** match |
| `src/router-family-view.ts` | 903856bf… | **510162e2…** |
| `src/features/observe/views.ts` | 8ce5be47… | **8ce5be47…** match |
| `src/families-view.ts` | d19237be… | **47f5ac51…** |
| `src/features/density/supplements.ts` | b862886e… | **b862886e…** match |
| `src/view.ts` | 8611f445… | **b092542d…** |
| `test/s563-routerobserveconnect-layout.test.ts` | fcabb230… | **1bf3df58…** |

All four mismatched files are dirty/uncommitted in the public tree. This is not the frozen revision the review was requested against; the 16-test file itself differs, so “no test weakened” cannot be established from the supplied hash.

## Verdict: HOLD

### 1. Requested tsc gate is red on the current tree

`corepack pnpm exec tsc -p role-model-router/apps/runtime-ui-next/tsconfig.json --noEmit` exits **2** with errors in `test/s566-page-stories.story.test.ts` (property `update` missing; implicit any). Even if unrelated to S563, the requested gate does not pass in this tree.

### 2. Current tests pass but do not validate the frozen bytes

- `s563-routerobserveconnect-layout.test.ts`: **16/16 pass** on current code.
- `s529-observe-family`: **6/6**; `s530-router-family`: **8/8**; `s26e-readback-routes`: **49/49**.
- These are useful behavioral signals, but the S563 test and three implementation files are not the frozen hashes; they cannot certify the freeze.

### 3. Lint is not zero on the new test

Anti-slop on the current S563 test reports **4 findings** — `require-safety-comment-for-type-assertion` at lines 75, 79, 97 and 180. `s563-layout.ts` and `s563-pages.ts` are clean. The assertion findings are in the newly added test, so the “lint zero added” criterion fails on this tree.

### 4. Primitives and honest limits

On the current content, `s563-layout.ts` mirrors the reference card/filter/metric/table/chart classes and adds `data-s563-*` hooks; the test asserts ordered sections, table headers, control names and card/filter classes. I did not certify those claims against the frozen bytes because the test/source hashes differ. The stated honest limits (providers picker, candidates/decisions MetricStrip, queues empty table, routing single chart) are not independently evidenced by this test file; it is a structural render test, not a visual/limit assertion.

### 5. Data hooks/readback behavior

The current s26e suite passes 49/49, which is positive readback evidence, but it is not a diff against the frozen S563 revision. No data-* hook loss was detected on current code; that is not a frozen-byte acceptance.

## Required before PASS

1. Refreeze/report exact current S563 bytes (or revert to the supplied bytes) and re-run this review against them.
2. Get UI tsc to **0** (isolate or fix the s566 story test errors).
3. Add `SAFETY:` justifications to the four test type assertions, or remove them, so added-line lint is zero.
4. Re-run 16/16 + s529 + s530 + s26e + tsc + lint on the frozen hashes, and record the exact hashes.

No source/test/config file was modified; no commit.

