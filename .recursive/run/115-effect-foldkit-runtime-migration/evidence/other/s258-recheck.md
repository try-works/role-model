S258 recheck - working-tree coverage repairs

Read-only recheck of the Lead's uncommitted repairs after the original review. I did not modify either tree. I did not repeat the full suite. Targeted repaired files: 6 vitest files / 33 tests passed (s46a 5, s76a 6, s254 8, s255 7, s256 5, s257 2). Inventory and budget inspected directly.

VERDICTS

1. Coverage loss: PASS for the restored assertions. The old s46a pointer test and the exact all-tab mounted-shell dispatch test are back; s76a is restored exactly to f3419212 (6 tests, including invalid click/no PUT and real diff/applied readback). S254 is repaired to exact builder and client serialization. Residual scope limits are stated below, not hidden.
2. Weakening: PASS-with-caveats. The main weak forms are now backed by integration. S257 still counts only the save factory rather than all commands, and the positional as-never/as-unknown casts remain (overall acceptance is rightly still pending type-safety harness cleanup).
3. Budget honesty: entries PASS, total claim WRONG. All ten entries match my measured comment-stripped call-site count, but s46a 6 + s76a 11 gives a total of 27, not 26. The current BUDGET sums to 27 and the budget test passes at 27/27. Correct the Lead's 26 statement and the batch artifact.
4. Inventory correctness: PASS-with-caveats. All four rows now name the restored s46a test whose name exists verbatim, and the broad rows are honestly downgraded wired (counts 33 verified / 4 wired). Audio voices/transcriptions, rerank /v1/reranking, and advanced messages/count_tokens/embeddings remain open/unverified as stated. Images is verified only at the fixture/UI level for its sole generation endpoint; the test uses a 404 fixture, so this is not live-capability proof. Actual agent route identity is deepseek-official/deepseek-flash; the fixture default moonshot/kimi-k2.5 is a fixture default, not routing evidence.
5. Test-only: PASS. The four commits and the working-tree repairs touch tests, budget metadata, and inventory only; no src/**. Current status has the uncommitted test/inventory repairs and untracked review/log files, no src change.

COVERAGE RECHECK

s46a: old "renders five tabs with per-tab idle raw text and fields" restored. New "dispatches each tab with the exact method, path and body" is stronger than the deleted test: it clicks each tab, waits the form, clicks Run, waits the 404 alert, asserts calls length index+1, exact path, POST, and exact parsed body. A duplicate request fails length; old used .at(-1) and could miss it. This closes the main integration blocker.

s76a: restored to the f3419212 content: before-Load no editor/no save/no PUT; invalid JSON click/no PUT/text kept; stale-confirm guard; exact real diff text "changed: b", exact PUT body, applied editor "b":99 and notice "Applied snapshot from server"; 409. Budget 11. This closes the runtime-config coverage blockers.

S254: repaired exact five literal StudioRequest payloads and five createStudioClient checks (URL, method, exact JSON body, headers, signal, status, raw text). It is still a builder/client test, but that is now supplementary rather than a substitute for the restored mounted-shell dispatch. Good.

S255/S256/S257: unchanged from the batch. S255 covers scene rendering, S256 the runtime-config render states, S257 the update rule plus a valid control. Their limitations are acceptable now that the deleted integration tests are restored: S257 still does not assert next.commands is empty; S256 synthesizes editor states; S255 state-injects tabs.

BUDGET RECHECK

| File | measured | budget |
|---|---:|---:|
| diagnostics.test.ts | 1 | 1 |
| mount.test.ts | 1 | 1 |
| routes.test.ts | 1 | 1 |
| s25b-refresh-owner-gap.test.ts | 1 | 1 |
| s26b-wave1.test.ts | 3 | 3 |
| s26k-control.test.ts | 1 | 1 |
| s40b-overview.test.ts | 1 | 1 |
| s46a-studio.test.ts | 6 | 6 |
| s73a-controller.test.ts | 1 | 1 |
| s76a-runtime-config.test.ts | 11 | 11 |
| total | 27 | 27 |

The batch artifact and Lead's "budget26" are arithmetically wrong. 22 + 3 (s46a 3->6) + 2 (s76a 9->11) = 27. The invariant passes because measured and budget both 27; record 27.

INVENTORY RECHECK

- route:studio-advanced, route:studio-audio, route:studio-rerank: status wired, proof s46a, proofTestName "dispatches each tab with the exact method, path and body", note says mounted-shell fixture verifies one request per tab and honest 404, not live capability; listed broad endpoints remain unverified. Honest.
- route:studio-images: status verified, sole endpoint /v1/images/generations, same mounted-shell proof. The fixture is 404, so this is UI request-shape proof, not live capability. The copied note says "Broad rows are wired, not fully verified" on the verified images row too; clarify that note for this row.
- All four rows now actually point at a mounted-shell test, not merely a name in s254. This is a real improvement.
- Still open: the host-endpoint capability claims above; the actual agent route (deepseek-official/deepseek-flash) is not exercised by the test, whose fixture defaults to moonshot. Treat that as fixture-level proof only; do not call the moonshot default agent routing.
- The proof does not verify the route's live/configured model; S207 covers catalogue substitution separately. No acceptance of live endpoint capability.

TYPE-SAFETY FOLLOW-ON (OPEN)

S251/S253/S255/S256/S257 still use positional undefined as never and as unknown as casts for createUpdate/Model/scene. They hide signature and dependency-slot drift. Overall acceptance remains pending this cleanup, as the Lead says. The restored tests reduce behavioral risk but do not restore compile-time checking.

REMAINING OPEN ITEMS

1. Correct budget total 26 -> 27 in the batch/Lead record.
2. Inventory broad endpoint claims remain open; images note should not imply broad rows wired; actual deepseek route remains fixture-uncovered.
3. Type assertions follow-on unresolved.
4. S257 all-command emptiness is a residual rule-test gap (the restored s76a no-PUT integration covers the client side).
5. No full-suite re-run was performed by me; targeted 33/33 passed. The Lead reports 322/322 + 20 invariants. I do not treat either run as acceptance of the open items.

No further blockers to the restored coverage itself. Acceptance remains pending budget record correction, inventory endpoint/route honesty, and type-safety harness cleanup.
