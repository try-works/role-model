# S280 section B — native cross-review of S279 readback-flight (bounded)

Reviewer: **deepseek-flash** (verified live via `list_agents`: target `s5-health-wait`, model
`deepseek-flash`, status running — not inferred from inactive metadata). Reviewer is not the author of
S279. Mode: read-only; no product writes; the only write is this file.

## Reviewed bytes (current working tree; NOT the hashes in the S279 report)

| File | Bytes | Content lines | SHA-256 (current) |
|---|---|---|---|
| `src/readback-flight.ts` (new) | 7926 | 210 | D25F034F202CCC084966BFDC9AF2D204B7D4D62E22D41CFE1852FF4E122C3E81 |
| `src/readback.ts` (+48/-37) | 47000 | 1205 | 24F61600284BD2ED47DC98FDA0BBEE9150DCA4C042ADED47D3F47F2030B23A85 |
| `test/s279-readback-multiplicity.test.ts` (new) | 16117 | 368 | F60B528A3B219458986BF5A6310734F6A4A24858422851180E19F74A05DF6ED3 |
| `test/s26e-readback-routes.test.ts` (Lead-owned edit) | 17454 | 487 | 5403FB6A6EF76C02C7AC4DE69F22EB7FCA7A3960AA4A1E73C7EBAACFC380F7FA |

Bytes were hashed before and after the reading pass and did not change during it.

**STALE-HASH BLOCKER (do not final-PASS on the old report):** the S279 report describes an 18D084… helper of
189 lines. The current helper is **D25F034F…, 7926 bytes, 210 content lines** and already contains the
null-abort repair (below). s9 must freeze these exact hashes (or hand me a new diff) before this review is
final; any byte change to the helper/test invalidates the verdict.

## Null-abort repair — present in the current bytes (verified)

- `src/readback-flight.ts:57-60`: `abortReason = (signal) => signal.reason` with the explicit contract that a
  falsey reason (`null`/`0`/`false`/`""`) is delivered unchanged and never replaced by a new DOMException.
  There is no `??` fallback on the reason path (the only `??` uses are method/cache/accept/authorization key
  parts at :68-72 and `init?.signal ?? undefined` at :179).
- `src/readback-flight.ts:157-159, 168-171, 180` reject with that exact reason for pre-aborted and
  mid-flight aborts.
- `test/s279-readback-multiplicity.test.ts:213-227` pins identity for `null`, `0` and `false`
  (`expect(result.reason).toBe(reason)`).

So the Lead's observation applies to the stale 189-line version, not to the current bytes.

## Checklist verification (section B)

a. **Exact URL/query/header/auth/cache sharing.** Key = method + exact URL + cache + accept + authorization
   (`readback-flight.ts:65-74`); the readback client sets GET, `no-store`, `accept: application/json` and a
   conditional Bearer header (`readback.ts:984-996`), so query (in the URL) and auth are in the key. Covered by
   `s279:113-131` (one physical GET, exact surface) and `s279:281-299` (queries/ids/tokens/shells separated).
b. **No cross-shell sharing, no settled cache.** A transport is created per `createReadbackClients` owner
   (`readback.ts:1012-1019`); entries are deleted on settle (`readback-flight.ts:114-117`) and when the last
   waiter leaves (:105-112). Covered by `s279:281-299` (three owners, 7 calls) and `s279:269-279` (fresh GET
   after settle).
c. **Statuses / non-JSON / errors unchanged.** The client is untouched (`readback.ts:978-1008`), and the facade
   rebuilds status/statusText/headers/body text (:84-95). Covered by `s279:133-144` (503 + non-JSON per consumer)
   and `s279:146-158` (private parsed bodies).
d. **Alias projection unaffected.** Specs/pathFor/key projection are unchanged; the transport keys the final URL.
   Mounted evidence: `s279:325-367` (models + summary rails, authorization/accept asserted).
e. **Per-waiter abort independence; last abort reaches the wire.** `readback-flight.ts:155-176` (each waiter
   rejects with its own reason), `:105-112` (physical abort only when the set is empty). Covered by
   `s279:160-176` (one aborted, the other completes; wire not aborted) and `s279:178-196` (last abort closes the
   physical signal, asserted `oldCall.signal.aborted === true`).
f. **Slot cleanup on success/failure/cancel.** `settle`/removeWaiter` delete with identity guards
   (`readback-flight.ts:105-128`). Covered by `s279:229-243` (synchronously throwing fetch → reject → retry),
   `s279:245-267` (async failure → all waiters reject → retry), `s279:178-211` (cancel), `s279:269-279` (success).
g. **Old completion cannot poison a replacement.** `complete` early-returns when the flight closed
   (`readback-flight.ts:133-136`) and map writes are identity-guarded (:107, :117). Covered by
   `s279:178-211` (release the aborted old call after a replacement exists; call count and the replacement's
   result stay correct).
h. **No unhandled rejection / listener leak.** Static: the wire promise always has a rejection handler
   (:200-205), `complete(...).catch(...)` handles body/rebuild failures, abort listeners are `once` and removed
   by `safeDetach` on settle/remove (:120-121, :173-174). **GAP:** the S279 suite has no executed
   unhandled-rejection or listener-count assertion, so this is verified by reading, not by a failing test.
i. **Mutation sensitivity.** The tests would fail if: the key omitted the URL/query (call count 4 at `s279:288`),
   one abort rejected both or aborted the wire (`s279:160-176`), the last abort did not abort the wire
   (`s279:191`), an old settle deleted the replacement (`s279:198-208`), or there were a settled-response cache
   (`s279:269-279`).
j. **Existing s26e assertion — Lead-owned semantic update, not silent.** Shared readers now receive an
   owner-controlled signal, so `s26e:360-368` (Lead hunk) asserts `signal instanceof AbortSignal` and
   `aborted === false` with an explicit comment; exact caller identity is still proven for the standalone client
   by `s279:301-310` (`expect(calls[0]?.signal).toBe(controller.signal)`). The subscription-list assertion the
   Lead fixed is now the exact sorted two-key list (`s26e:479`), not weakened. The Lead's combined run confirms
   those 24 failures were only that stale key list (`E:/rm-tmp/s280-lead-r12.log:15230-15300`).

## Bounded issues / gaps (report, not normalized away)

1. **Stale frozen hash in the S279 report** (18D084/189 lines) vs current D25F034F/210 lines — must be re-frozen
   by s9; this review is not final against the old hash.
2. **Unhandled-rejection/listener-leak is static-only** (no executed assertion in `s279`); a small
   `process.on("unhandledRejection")` assertion or listener-count check would close it.
3. **`buildResponse` 1xx/opaque-status failure path is untested** (documented in `readback-flight.ts:30-35`);
   same-origin readback GETs do not produce 1xx, so this is bounded, not a defect.
4. **Key scope is facade-specific**: method/URL/cache/accept/authorization only; no body/other-header merge
   (`readback-flight.ts:65-74, 30-35`). Exact for the readback client (its only consumer), but not a generic
   fetch-sharing claim.
5. **Platform note**: the helper depends on `AbortSignal.reason`; the identity of falsey reasons holds only on
   runtimes that implement it (Node 24/happy-dom here).
6. Incidental: `readback.ts` gains a trailing newline at EOF (cosmetic, no semantic change).

## Verdict: BOUNDED PASS (freeze confirmed by s9 this turn)

The implementation and tests satisfy section B for the current hashes, and s9 has now confirmed the freeze on
exactly these bytes: `readback.ts` 24F61600…B23A85 (47000 B), `readback-flight.ts` D25F034F…22C3E81 (7926 B),
`s279-readback-multiplicity.test.ts` F60B528A…6ED3 (16117 B, 12 tests), `s26e-readback-routes.test.ts`
5403FB6A…380F7FA (17454 B, Lead-owned; s9 reports the current oracle 49/49). I re-hashed all four after the
confirmation and they are unchanged from my review, so no hunk needs a re-check. s9's updated report
`evidence/other/s279-readback-multiplicity.md` (sha256 9C9BC35663B7904780295BEA9AE807B978B253859870560D487619AA342E1993)
now carries the explicit stale-hash disposition (18D084…/189 superseded), owns the six unknown-boundary lint
findings (helper lines 44/60/105/130/202/204), and lists the two bounded gaps below. No further S279 product
edits are planned.

The two bounded gaps remain open by design and are NOT blockers for this bounded PASS: (1) unhandled-rejection /
listener-leak is verified statically, not by an executed assertion; (2) the `buildResponse` 1xx/opaque-status
failure path is untested (same-origin readback GETs do not produce 1xx).

## Limits

Read-only static review plus the S279 tests as supplied; I did not run the suite in this review (the Lead's
combined 179-test run is the executed evidence: 155 passed, the 24 failures being the now-fixed s26e key list).
No packaging, browser/client-trace, provider/operator or full-suite evidence. This is not full R12 acceptance.
