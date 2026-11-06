# S476 — independent review: S475 packaged QA invoke timeout

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only source/test; no edits, no commit, no provider/operator port use.

## Frozen bytes

- public `src/cli.ts` `F24BCDDFD85908AED8534B2F329DAB2102B6ABCEC42D764F283981621B66CE22` (595529 B)
- new test `test/s475-qa-invoke-timeout.test.ts` `759AB9B3B1C2323C3FDA8754A2E12C915137838E8B344518F3933957870869BB` (1052 B)

Both match. The S475 wiring is confined to the QA loop plus the exported helper; no runtime/vendor/private/HTTP change.

## PASS

- `runQaStartupInvoke` races the actual `runtime.invoke` against a timeout and rejects with `QA extension startup invoke timed out after <ms>: <extensionId>` (`cli.ts:3442-3461`). The message names the extension id.
- The deadline is the existing `extensionHostTiming().timeoutMs` (`cli.ts:12154`); no parallel/new policy knob was introduced.
- The timer is cleared in `finally` on both success and rejection; the success path returns the original receipt object unchanged (the loop stores `{...receipt, requestId}` as before).
- The helper is used only in the `qaExtensions` loop (`cli.ts:12164`); no other call site. A timeout propagates through `beforeReady` into `awaitCliExtensionRuntime`'s failed-bootstrap path, so readiness fails visibly instead of pending forever.
- No runtime/vendor/private edits; no HTTP/route change.

## Evidence

- RED1 helper-absent: `runQaStartupInvoke is not a function` — non-behavioral, correctly disclosed.
- RED2: the never-settling invoke test times out at its 250 ms test budget before the fix; behavioral hang, correctly disclosed separately.
- GREEN: 4 files / **13/13 passed** (s475 2, cli-startup-readiness 3, s120 ownership 3, run96-F166 5); host tsc 0 and UI tsc 0 in my run.
- Lint absolute: cli.ts **1037** = frozen baseline, new test **0**; no added-line finding/suppression claim.
- The timeout does not abort an underlying invoke at the worker/network layer; it rejects beforeReady and fails startup, which is the required bounded-readiness behavior. Close/shutdown ownership is unchanged.

## Bounded verdict: PASS

The packaged QA startup loop now has a bounded, existing-contract deadline that fails visibly with the extension id instead of blocking readiness forever. This is a bounded S475/bootstrap repair, not whole R27/R36 or packaged-candidate completion; packaged operator routes were not re-probed here.

No source/test/config file was modified; no commit.

