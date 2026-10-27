S258 independent coverage review - UI test batch 9a856e90..a02b8c11

Read-only. I reviewed the four commits, the parent versions, the Lead's uncommitted S254 repair, s247/s249 and s256-phase1-batch1.md. Full suite before repair: 39 files / 317 tests green with TMP=TEMP=E:/rm-tmp. Targeted repaired S254/S255/S46a: 18/18 green. UI invariant files: 9/9 green. I made no product edits.

VERDICTS

1. Coverage loss: CONCERNS / FAIL for integrity. The per-tab click-to-client dispatch test is gone; the runtime-config invalid-save click/no-PUT and the real diff/applied-snapshot readback are gone. The repaired S254 exact builder/client checks do not replace the deleted integration assertions.
2. Weakening: CONCERNS. S254 remains pure-builder/client, not integration. S257 counts only the save factory, not all commands. S256 uses synthesized editor states. S251/S253/S255/S256/S257 positional casts hide signature drift.
3. Budget honesty: PASS for committed state. All ten entries equal my own comment-stripped call-site count; total 22. The batch artifact claim that s46a was over-provisioned by 2 (measured 4) is false: the parent has 6 call sites and budget 6. The 6 to 3 drop is deletion, not correction.
4. Inventory correctness: CONCERNS. The four proofTestName strings exist verbatim, but the committed test checks only /v1 prefix plus uniqueness, not exact routes or host endpoints. The repaired S254 makes the builder exact but is still not a route/UI proof. Actual route model is deepseek-official/deepseek-flash while tests pin moonshot/kimi-k2.5.
5. Test-only claim: PASS. All four commits touch tests, the inventory, or budget metadata only; no src.

COVERAGE LOSS, CONCRETE

A. Deleted s46a test "dispatches each tab with the exact method, path and body" is not replaced. Parent 52e3a6e8 had five tab clicks, five Run clicks, five real client calls, exact bodies for all five tabs, and exact paths chat/images/audio/rerank/responses. Committed S254 checks chat path/body, all tabs POST plus path startsWith /v1 plus distinct, and only the advanced custom body. Exact paths for images/audio/rerank/advanced and exact bodies for images/audio/rerank/default advanced are dropped. The Lead's mutation proves it: old S254 is 3/3 PASS with audio voice alloy changed to s258-mutant; repaired S254 is 2 fail / 6 pass.

The repaired working tree S254 now has five literal StudioRequest expectations and five createStudioClient serialization checks (URL, method, exact JSON body, headers, signal, status, raw text). That closes the builder and client-serialization hole. It does not restore the old integration fact: clicking a tab then Run in the mounted shell reaches the real client with that request. A view/update wiring bug for images/audio/rerank/advanced still passes. S249 says wiring cannot move to scene; restore it rather than emulate it.

B. Deleted s46a tab-rendering test: S255 covers five role tabs, tablist, selected chat, ArrowRight to images, RAW RESPONSE/idle text, per-tab panel and label. Dropped without equivalent: pointer click on images/audio/rerank/advanced (S255 only ArrowRight); data-studio-form=tab readiness; per-tab data-studio-raw=idle for non-chat tabs (S255 only checks idle on chat).

C. Deleted s76a invalid-save integration: old clicked Load, typed bad JSON, clicked Save, asserted alert, text kept, no PUT. S256 renders invalid state; S257 update asserts save factory zero plus valid-control one. The rule is stronger, but no test proves Save click dispatches RuntimeConfigSaveRequested on invalid text or that the real client gets no PUT. The factory counter is not the client.

D. Deleted s76a diff/applied snapshot: old after real Load/edit/Save/Confirm asserted confirm text "changed: b", editor value contains "b":99, notice text "Applied snapshot from server". Current s76a keeps PUT body and waits for notice existence, but drops confirm text, applied editor value, notice text. S256 renders these from hand-built states, so a broken update that fails to derive or apply the response passes. runtimeConfigDiff unit covers only the pure function.

E. Deleted s76a before-Load test also dropped no-PUT assertion. No user action occurs before Load, so lower risk, but it is an assertion without replacement.

F. Per-tab 404 alert after Run: old loop clicked Run per tab and waited role=alert. Current s46a has one chat 404. Other tab error rendering is not covered. Write a reason or restore.

WEAKENING

- Committed S254 is weaker than the old integration even after exact shape is repaired. It cannot prove tab click to builder/client.
- S257 invalid test says no save command but only counts the saveRuntimeConfig factory; it never asserts next.commands is empty. An update emitting a different command passes. Add all-commands-empty, or a spy over every dependency.
- S257 valid control proves the counter sees one save, good. It does not assert exact command args; s221 covers that.
- S251/S253 are earlier commits but same pattern: createUpdate called with undefined as never and result cast through unknown; a signature or slot change is not caught by TypeScript. Follow-on: type the harness.
- S256 role contract is sound for rendering: alert absent in editing, invalid alert role=alert, saved notice role=status, buttons by role/name. It is not evidence that the update produced those states.
- S255 role/label semantics are stronger than data attributes, but state injection is not a pointer-click test for four tabs.

BUDGET

diagnostics 1/1, mount 1/1, routes 1/1, s25b 1/1, s26b 3/3, s26k 1/1, s40b 1/1, s46a 3/3, s73a 1/1, s76a 9/9, total 22/22. PASS. If the Lead restores per-tab and invalid-save integration, budget must rise to at least s46a 6 and s76a 11 (total at least 26), with call sites counted honestly.

INVENTORY

The four rows route:studio-advanced, route:studio-audio, route:studio-images, route:studio-rerank all name s254-studio-request-shape.test.ts and proofTestName "every tab produces a POST with a distinct path and its own body". That name exists verbatim. It is not proof of the rows:
- committed test only checks POST, path startsWith /v1, tab, uniqueness; wrong paths pass.
- rows list endpoints the test never touches: audio voices and transcriptions, rerank reranking, advanced messages/count_tokens/embeddings.
- actual route is deepseek-official/deepseek-flash; studioIdle and S254 pin moonshot/kimi-k2.5. S207 covers catalogue substitution at run time, not this proof test.
- repaired S254 exact builder and client serialization is good evidence for the tab-to-request map, but still unit level. Do not verify the rows on names; mark map-only with a gap or add per-route exact assertions plus the mounted-shell dispatch test.

TEST-ONLY

PASS. git show --stat: 67054e29 test/s254 only; 8b1cccb7 inventory JSON only; 52e3a6e8 s247/s255/s46a tests only; a02b8c11 s247/s256/s257/s76a tests only. No src in any commit. The Lead's temporary studio.ts mutation is restored; current worktree has the uncommitted S254 repair and two untracked logs, not src changes.

TEST RUN

Full suite before repair: 39 files / 317 tests passed, exit 0. Targeted repaired S254/S255/S46a: 18/18 passed. Invariants 9/9 passed. Mutation: old S254 3/3 with s258-mutant; repaired 2 fail / 6 pass.

REQUIRED BEFORE ACCEPTANCE

1. Restore the deleted mounted-shell per-tab click-to-real-client integration (loop all five tabs; exact URL, method, body, 404 alert). Raise s46a budget to at least 6.
2. Restore the runtime-config invalid-save click/no-PUT integration and the real Load-to-diff-to-PUT-to-applied-snapshot text/editor assertions, or a client-level equivalent. Raise s76a budget to 11.
3. Decide S255 gaps explicitly: per-tab pointer click and per-tab idle raw; otherwise write reasons and do not claim full replacement.
4. Correct the batch artifact's "s46a measured 4" claim and do not verify the four inventory rows on a generic name.
5. Address S257 all-command emptiness and document or remove positional as-never casts (S251/S253/S255/S256/S257).
