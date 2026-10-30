# S291 — S290 refresh page-lifetime FINAL review (PASS, bounded)

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only: no source writes, no tests run, no CLI/children/runtime.
- Frozen hashes verified exactly: `refresh.ts 87CEFA2E512936D5844B1C9A1A45C9CBA39F2BF4C315E28247BD575027176710` (203 lines); `message.ts 43E9EB8136331FD037B3D4FB67E9065DEB94D650BC0E054D860D2D868D3FE300` (154); `update.ts 301E7C7415903D3786632F60E7373160113524E40567B78A47BE587E3F56155C` (749); `test/s290-refresh-page-lifetime.test.ts 15F53B872824796F182AF08D4011AF911FCE0A56D5F769CB0864B7A908D6587D` (407).

## Verdict

**PASS (static, bounded)** on the three prior failure paths plus typed restoration/retired guards. The prior HOLD items are repaired with rollback and covered by new failure tests; the core one-source/BFCache/watermark behavior remains as reviewed. Browser validation and the author's RED/GREEN counts are Lead/author evidence, not re-run here.

## The three failure paths

1. **Partial acquire / listener-attach failure — FIXED.** `open()` sets the generation, then attaches listeners inside `try`; on throw it marks `active=false`, clears `current` only if it is that generation, closes the source in its own try/catch, and rethrows (`refresh.ts:138-167`). Test `:350-364` makes the second attach throw, expects `runCollect` to reject, and asserts `closeCount()===1` and no pagehide listener. No leaked open source on failed acquire.
2. **Persisted-reopen factory failure — FIXED.** `onPageshow` catches `open(true)` failures, reports via guarded `console.error`, and leaves `current===null` so the next persisted pageshow retries (`refresh.ts:176-192`). Test `:366-396` throws on the second factory call, asserts the page callback does not throw, no restore message, one report, then a later pageshow opens exactly one source and emits exactly one `RuntimePageRestored`.
3. **Lifecycle-registration failure — FIXED.** The pagehide/pageshow registration is wrapped; on throw it removes both listeners, closes the current source, and rethrows (`refresh.ts:193-201`). Test `:398-410` throws on the pageshow registration, expects rejection, one source close, and zero pagehide listeners. Acquire failure cannot leave a registered listener.

## Typed restoration, guards, idempotence

- `RuntimePageRestored` is a typed empty-fact message (`message.ts:113,153`), emitted **once** after a successful persisted reopen only, after both listeners attach (`refresh.ts:168`); non-persisted/repeated pageshows do not emit (test `:329-348`).
- Handler reuses the existing query-preserving `invalidateCurrentRoute` (`update.ts:748`); no telemetry/revision fabrication. Test `:412-438` asserts one `ReadReadback`, `/api/metrics/page` with `windowMs=3600000`, watermark `0`, `resyncToken 0`, status `idle`, no message.
- Retired generations keep their own `active` flag, set false before `close`; late revision/telemetry callbacks from a retired source cannot offer after reopen (tests `:207`,`:269`). `closeCurrent` nulls before closing and is idempotent; dispose closes once and removes both page listeners.
- One source per owner: `current` is opened only at acquire and only when `current===null` on persisted pageshow; `makeRefreshSubscriptions` still has one persistent entry.
- Test typing: `messageTag` uses an `in`-narrowed `unknown` without unsafe double-casts; `sourceAt` bounds-checks instead of non-null assertion.

## Residual notes (non-blocking)

- The listener-attach-throw fixture covers the initial acquire; a persisted-reopen *listener* attach throw is not separately fixtured, but it executes the same checked `open` rollback plus the `onPageshow` catch, so code behavior is the same by inspection.
- `announceRestore` publish sits after the listener `try`; a hypothetical `Queue.offerUnsafe` failure during restore would leave the generation open without an invalidation. This is outside the three required paths and not exercised; normal queue lifetime makes it unlikely.
- No browser run; Lead owns the real full-gate build/audit after this patch.

No product edits by me.

## Final source-QA recheck (hashes unchanged)

- Re-verified at final freeze: `refresh.ts 87CEFA2E…6710` and `test/s290-refresh-page-lifetime.test.ts 15F53B87…87D` are unchanged from the reviewed freeze; message/update hashes remain `43E9EB81…`/`301E7C74…`. The three HOLD repairs and their tests are the same bytes reviewed above — no re-audit needed.
- Observed source QA (`E:/rm-tmp/s290-source-ui-fullgate.log`): all 20 routes, click sweeps, control action and **`studio run: clicked -> raw:success`** with `{"routes":20,"failures":0}`; unchanged 15 s gate, **no experimental pagehide bootstrap**. This is the repaired built client dist against the old pinned backend — an explicit **source-QA observation, not a sealed-package claim**.
- Lead evidence: tsc/build PASS and 5 files / 53 tests PASS on this frozen tree.
- **FINAL: PASS** for commit (bounded static review + observed source QA). Browser/sealed-package identity remains Lead-owned.

