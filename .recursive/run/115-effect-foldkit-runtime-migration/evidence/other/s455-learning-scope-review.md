# S455 — independent review: S448 Learning scope authority

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only product/test/config; no source writes, no commit. Frozen hashes verified: learning-ranking `E42453C196D7C48D151249C2F5ADD95979B347EB24DD2DA0A6A57670A0D1E9AE`, ranking-view `62E9B07AE3E745C47F8CDC89D9B7974625D57122B9B0AF57580AF50479983874`, readback `5E9E3F1BB24F28D4BA012FCF0210E9582DA870D8D04017C7B860D9F4C13A6761`, update `C8490F189631D5E8115B018A65F3CFE61FEEE2466436505A41EBEEE06AAACFD0`, message `500AA0D978CFA413D6B464322A2BE6918576FCB80F5909973DDD30F3044BACF5`, commands `43B0BD575EE320495D1A394163C64AA625070E1E17898AFAC4D9B02C4D20A454`, s448 `6A63098F898D7C70A8BF38B7F49243CA86A937EB4248A7AD4B122A7E9696E67B`, s412 `EDE766CEC11A2D018AF27C8AD88BC87C7B775D263097B165EFC654DDAB857435`.

## Bounded verdict: HOLD (1 integration repair)

The scope-authority core is correct, but the **actual initial Learning entry does not fetch the records authority**. The s448 fixture pre-seeds `readbacks.learningPacks` with status ok/scope, so it cannot prove the direct-entry workflow that users hit.

### Concrete counterexample (fresh `/app/learning`)

1. `init.ts:132-150` for `route._tag === "Learning"` issues only `readReadback({key:"learning"})`, `replayJobs`, and `evaluationJobs`; it never reads `learningPacks`.
2. `update.ts:390-405` `readPlanForRoute` has special cases only for ModelsRoles/SystemOperator; Learning falls through `readbackKeyForRouteTag("Learning")` => `"learning"`. It never includes `learningPacks`.
3. Therefore `model.readbacks.learningPacks` remains `idle`; `LearningLadderToggleRequested` (`update.ts:1184-1200`) sees no fresh `ok/empty` scope and writes the error “Learning scope is unavailable…” with zero commands. The ladder rows are visible on `/app/learning` via `view.ts:844-852` (`readbacks.learning.rows`), but the authorized mutation is unusable until the user separately visits `/learning/packs`; navigating back reinitializes `readbacks` and loses it again.
4. Required narrow fix: add the existing `READBACK_SPECS.learningPacks` source (`/api/role-model/operator/learning/records?kind=pack`, already in `runtime-endpoints.ts`) to the Learning initial plan **and** `readPlanForRoute`, setting `learningPacks: loadingReadback(token)`; no new endpoint/schema. Then `ReadbackLoaded` scope sync/invalidation runs on direct entry. Add a direct-init/read-plan test, not another pre-seeded fixture.

### Callback-during-authority-loading window

`LearningLadderUpdated`/`LearningLadderFailed` (`update.ts:1229,1244`) require `state.scopeId === scopeId`, entry scopeId and token, but **do not require the fresh records readback to be `ok/empty` with the same scope**. If a refresh sets `readbacks.learningPacks` to `loading` while `learningRanking.scopeId` is still the old scope, a pending old-scope callback can be accepted before `ReadbackLoaded` clears the state. Require the fresh records guard in the callback too (or clear the ranking authority at loading start), and test a pending callback while the records read is loading. `ReadbackFailed`'s learningPacks route exception is correctly special-cased; the missing initial read is the primary defect.

## What passes (preserve)

- Records root scope parse: `readback.ts:651-678` captures typed `scopeId` from the records root; `parseLearning` on the non-authoritative `/operator/learning` state is not used for authority.
- Fresh-status fail-closed: toggle reads only `readbacks.learningPacks.status === "ok" || "empty"`; loading/error and missing scope produce error/no command. `ReadbackFailed` clears active scope/confirmations and preserves `nextToken`.
- Accepted readback guard: `ReadbackLoaded` checks handler token and snapshot token for `learningPacks` (`update.ts:610-627`); scope change filters phases to the new scope.
- Callback identity: messages/commands carry `scopeId`; callbacks require `state.scopeId`, scoped key, and token; old-scope result cannot repaint new row.
- ABA monotonic: `nextToken` survives scope clears and is used for the next token; A->B->A gets a new token, and old-A callbacks are ignored. RED4 is the genuine ABA failure; RED3's one genuine failure plus two expected-shape errors are correctly disclosed, not retroactively counted.
- Exact production Effect/client path and payload: s448 test executes `defineLearningRankingCommands(createLearningRankingClient({fetchImpl}))`, asserts the existing rollback URL/body and scope; s412 exact payload/token tests remain.
- Current run: **6 files / 64/64 passed**, UI tsc 0. Scope extension in message/commands is the Lead-authorized LearningLadder-only change (board task-42); no unrelated command/route drift found.

## Lint (absolute filesScanned=1)

learning-ranking 0; ranking-view 0; message 0; s448 0; s412 0. readback 79, update 10, commands 18 = frozen baseline counts; no new region finding/suppression claimed.

No full Learning/R13/R31 completion claim. This HOLD is limited to the direct-entry read plan plus the loading-callback authority guard; re-review after the author’s narrow freeze.

## Post-entry-repair re-review — still HOLD

Current frozen bytes: update `1512C98E696D96A12C429E43EF8349FE734DFE8E97EA145AA6B3CF9AAC8CC467` (66088 B), init `C9B4BC41330AA4B3C77E3941506EC9FF2EE0D4C0570C231A58E1905B945DFD8C` (10945 B), s448 `866082CF0DC010CA6328EF91AB85CD780F5E7EBB480EBA89FBEDEAD93F59FB18` (14145 B). Init/direct plan is fixed (`init.ts:132-150`, `update.ts:395-396` include learningPacks); 67/67 six-suite + UI tsc 0.\n\nThe actual refresh transition is still broken. `invalidateCurrentRoute` (`update.ts:414-424`) only sets `readbacks.learningPacks = loadingReadback(token)`; it does not clear `learningRanking.scopeId` or scoped pending phases. The callbacks now require fresh records (`update.ts:1252-1254/1269-1271`), so a settle during that loading window is ignored and the pending entry remains. When the fresh same-scope records response arrives, `ReadbackLoaded` sees `scopeChanged=false` and retains the pending phase (`update.ts:620-630`); the next toggle returns at `phase === "pending"` (`update.ts:1227`).\n\nDirect probe on 1512C98E with the real `RuntimeRevisionReceived` path (route Learning; no synthetic ReadbackLoaded loading):
- refresh readback status = loading, phase still pending;
- late LearningLadderUpdated ignored, phase still pending;
- fresh same-scope ReadbackLoaded ok, phase still pending;
- next toggle issues 0 commands.
\nThe 12th test (s448:237-264) sends an artificial `ReadbackLoaded({status:'loading'})`, which filters scoped phases; real `readLearning` commands never emit a loading snapshot (they set the loading state and later return ok/error). That test therefore does not cover the actual refresh path. Required: clear scoped pending/scope at the real request transition (in `invalidateCurrentRoute` or equivalent) or store the terminal result pending-only until accepted fresh readback resolves; add the actual RuntimeRevisionReceived/refresh RED, not a synthetic loading message. Preserve HOLD until then; no broad closure.

## FINAL re-review on frozen bytes — PASS (bounded)

Active model verified **deepseek-flash**. Final hashes: update `85A06188C129C7C8EACC90E8CCAE3C310912B341967859D7B23B6F710C2920CF` (66370 B); init `C9B4BC41330AA4B3C77E3941506EC9FF2EE0D4C0570C231A58E1905B945DFD8C` (10945 B); s448 `829D036F272DEB221D1AEEB56EC233AFF2E877D4C5A6B9FEFA084B5F07CB95DE` (15924 B). Other eight hashes unchanged. No product/test/config edit by me.

- **Direct entry:** `init.ts:132-150` issues four Learning reads (learning, learningPacks, replayJobs, evaluationJobs) and marks learningPacks loading; `readPlanForRoute` update.ts:395-396 returns learning+learningPacks. Test s448:199-220 covers actual init, navigation, and telemetry refresh.
- **Real transition deadlock fixed:** `invalidateCurrentRoute` update.ts:414-427 clears Learning phases/scope at the request transition and preserves `nextToken`; no synthetic loading message is needed. Callbacks require fresh records scope (1251-1275), so late result is inert. Fresh same-scope read requires a new explicit confirm and a new monotonic token.
- **RED6:** s448-red6.log shows the genuine actual RuntimeRevisionReceived/telemetry event failing 1/13 before the fix; green is 68/68. The older synthetic ReadbackLoaded-loading test remains, but it is not the coverage claim for this fix; RED6 is the actual-event evidence.
- **ABA/bounds:** monotonic nextToken survives clear; scoped phases are bounded by invalidation clearing and scope-change filtering; old-A callback cannot settle after A->B->A.
- **Run:** 6 files / **68/68 passed**; UI tsc exit 0. Absolute lint: new regions 0; readback 79, update 10, commands 18, init 3 = frozen baseline; no new finding/suppression claim.

### FINAL BOUNDED VERDICT: PASS

The direct-entry authority, real refresh transition, pending clearing, callback fresh-scope guard, explicit reconfirmation, and monotonic ABA/identity behavior are now implemented and tested with the genuine actual-event RED. This is not full Learning/R13/R31 completion and not broad M8 acceptance. No source/test/config changes or commit by this review.

