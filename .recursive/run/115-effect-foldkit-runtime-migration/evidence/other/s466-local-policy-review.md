# S466 — independent S458 review: HOLD (inventory/freeze mismatch)

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only; no source writes/commit.

## Frozen hash check

All supplied hashes match except the route inventory:

- readback `0D2C2C5A…21F291`, commands `5A560BC4…B8FB72`, message `EB5D4E31…CE29E`, update `2AEE63DB…A1E2A5`, route `D7FE3AD7…2AF151`, view `3E10C147…4680701`, legacy-redirects `1F195A53…96FB156`, runtime-endpoints `2D3997A9…8184BE`, init `6825098A…C4338`, s458 test `3F5C4659…0335DE` — all match.
- **`test/s26a-route-inventory.test.ts`: supplied `771807689D348124C264663899CD38A77BCDA8F6BF1FBA396A6F4B9CCAFC2320`; actual `25701CA9883D60B9BEB711F70A096DCB30BA26581486AA7A3BE9681F3B3AA24E`.** This is the exact frozen-inventory file required by S458; the current bytes are not the supplied freeze.

## Concrete inventory failure

Running `vitest run test/s26a-route-inventory.test.ts` on current bytes:

- **2 failed / 3 passed**.
- `validates every row...`: `named test: route:local-policy: expected false to be true` — the inventory row's `proofTestName` does not exist in the proof source.
- `records totals...`: `expected 12 to be 11` at line 196 — the verified count is 12 while the expected table is still 11.

So S458 added the LocalPolicy route/readback but did not land the matching s26a inventory update/fixture expected by the freeze. The supplied s26a hash is not present.

## Functional checks that pass on current bytes

- **Only the existing API:** readback path `/api/role-model/local/policy`; `SaveLocalPolicy` uses that path with PUT; no `/local/llama-swap/policy` API invented. Host GET/PUT parity and defaults are preserved as server data.
- **Whole-draft PUT:** `localPolicyDraftFromReadback` round-trips the full object; S458 test proves `extra:"keep-me"` survives and the command payload equals the whole draft. Save failure preserves draft and shows the error.
- **Policy/host errors:** non-object body => parse error; host defaults are displayed as returned data; no client fallback to stage/other channel. Raw policy is the returned object.
- **Redirects:** `/app/local/policy -> /local/llama-swap/policy`; matrix (legacy and direct) -> fixed `/local/llama-swap/models?view=grid`, replace; incoming search/hash dropped for the matrix family (`FIXED_SEARCH_ORIGINAL_PATHS`); both targets removed from `MISSING_ORIGINAL_TARGETS`.
- **Direct entry/read plan:** init LocalPolicy reads `localPolicy`; readPlan/readback-key includes it; S458 direct-entry test passes.
- S458 suite: **8/8 passed**; UI tsc exit 0.

## Residual parity issue (secondary)

The original save flow replaces policy/draft from the PUT response. Current `LocalPolicySaved` discards the response and issues a fresh GET readback (`update.ts:1264-1270`). Normally the host GET returns the same merged record, but if the post-PUT GET fails/stale the UI cannot show the successful save and reports a read failure. The S460 review's "save success replaces policy+draft from returned merged record" is not literally met. This should be either fixed (return the merged body in the saved message and use it) or explicitly accepted as a bounded compatibility difference with the failure mode tested.

## Bounded verdict: HOLD

Functional policy/redirect behavior is largely correct, but the supplied s26a inventory freeze is not present and its test fails (2 failures); the S458 evidence's GREEN set omitted this inventory suite. Refreeze the actual s26a inventory (matching proofTestName and totals) or supply the correct hash, then re-run s458 + s26a + tsc. The save-response re-read divergence also needs an explicit decision. No broad R13-R18/M8 completion claim.

No product/test/config file was modified; no commit.

## FINAL re-review on settled bytes — PASS (bounded)

Active model verified **deepseek-flash**. Final hashes match the settled set: readback `8EA01515…D8D4E0A`, commands `2DFB7A7B…D5BCB5C`, message `529926F2…4D27E830`, update `30CBAF20…A4F8576` (includes S458+S459 hunks), route `D7FE3AD7…`, view `3E10C147…`, legacy `1F195A53…`, runtime-endpoints `2D3997A9…`, init `6825098A…`, s458 test `2A1FB410…8C332DE8`, s26a test `F060A15E…4476FA1`, s269 unit `DBCA40EA…`, s269 scene `970F2F0A…`, s389 `74CF7942…`, s26a inventory evidence `08CBD8CE…`. No source edit/commit by me.

- **s26a inventory fixed:** current s26a is 5/5 pass; LocalPolicy proof name resolves and verified count is 12. Supplied hash now present (earlier mismatch was the pre-fix file).
- **Save adopts PUT merged response:** `SaveLocalPolicy` returns `LocalPolicySaved({policy: JSON.stringify(exit.value), token})`; update validates the token and installs `localPolicyReadback(merged, token)` without a follow-up GET. S458 test covers `hostMerged` and a failed post-save refresh retaining the merged state.
- **PUT parity:** whole draft, extra fields preserved, exact `/api/role-model/local/policy` PUT; no invented llama-swap policy API.
- **Redirects/canonical tests:** s269 unit/scene and s389 now assert the real LocalPolicy/LocalLlamaSwapModels targets; policy and matrix targets are absent from MISSING (empty inventory is honest); matrix fixed `?view=grid` drops incoming search/hash and uses replace. No weakening found: the old missing-target expectations were replaced by real landed-route assertions and the s26a partition count was updated to 12.
- **Direct entry/readPlan:** init LocalPolicy + readback-key/readPlan load the policy; test passes.
- **Run:** our scoped set (s458+s26a+s25d+s380+s269 unit/scene+s389) = **7 files / 129 passed**; s458+s26a specifically 13/13; UI tsc exit 0. Lint: no added-line findings; whole-file counts remain baseline-classified (readback 79, commands 18, update 10, view 30, init 3, s26a 5 pre-existing).

### FINAL BOUNDED VERDICT: PASS

The S458 policy/matrix port now matches the original GET/PUT contract, full-draft save with merged response, default/error honesty, fixed matrix redirect, legacy target removal, and direct-entry read plan. This is not full R13-R18/M8 completion and not broad acceptance of unrelated features. No source/test/config changes or commit by this review.

