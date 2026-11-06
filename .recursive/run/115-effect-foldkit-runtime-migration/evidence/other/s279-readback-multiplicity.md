# S279 — R12 readback alias in-flight sharing (FROZEN native report)

- Author: native teammate `s9-private-readonly` (owner-designated s9), actual model **deepseek-flash** per `list_agents`; task-10 claimed revision 1 → 2.
- Baseline public HEAD `1cf15b85` / private `0c5216b6`; canonical baseline locked unchanged. No CLI launch, children, commits, full suite, packaging/provider/operator actions.
- **Freeze status: FROZEN after the falsey-abort-reason repair.** The previous version of this report (helper `18D084…`, 189 lines, 11 tests) described pre-repair bytes and is explicitly superseded; it must not be cited. Current hashes below are authoritative and match s5's section-B review request.

## Frozen hashes (SHA-256, bytes)

| File | SHA-256 | Bytes |
|---|---|---|
| `src/readback.ts` | `24F61600284BD2ED47DC98FDA0BBEE9150DCA4C042ADED47D3F47F2030B23A85` | 47000 |
| `src/readback-flight.ts` (NEW) | `D25F034F202CCC084966BFDC9AF2D204B7D4D62E22D41CFE1852FF4E122C3E81` | 7926 |
| `test/s279-readback-multiplicity.test.ts` (NEW) | `F60B528A3B219458986BF5A6310734F6A4A24858422851180E19F74A05DF6ED3` | 16117 |
| `test/s26e-readback-routes.test.ts` (Lead-owned hunks; not mine) | `5403FB6A6EF76C02C7AC4DE69F22EB7FCA7A3960AA4A1E73C7EBAACFC380F7FA` | 17454 |

Line counts vary with tooling (Lead 208 / s5 210 content lines for the helper); bytes + hash above are the authoritative freeze identity.

## Diff shape

- `src/readback.ts` (+48/−37): only `createReadbackClients` — one owner-local transport from `options.fetchImpl ?? fetch`; all shared readers built from `{...options, fetchImpl: transport.fetch}`. No spec/parser/endpoint change. Standalone `createReadbackClient` untouched.
- `src/readback-flight.ts` (NEW): in-flight-only waiter coordination keyed by `METHOD + exact URL incl id/query + cache + accept + authorization`. No settled cache, no global map, no cross-shell sharing.
- `test/s279-readback-multiplicity.test.ts` (NEW, **12 tests**): deterministic gated fetch, real `createReadbackClients`, one real `mountShell` production config at `/models`, no module mocks, no positive-path sleeps.

## RED → GREEN

- RED `evidence/logs/s279-red.log` (pre-patch): **9 tests, 6 failed | 3 passed** — aliases issued 2 GETs; mounted `/models` issued 2 `/api/role-model/models` and 2 `/api/role-model/runtime/summary`.
- GREEN `evidence/logs/s279-green.log`: **12 tests, 12 passed**, exit 0 on the frozen bytes (including the explicit `abort(null)/0/false` identity tests at test lines ~213-227).

## Tests cover

One GET per alias pair with exact URL/method/cache/accept/authorization; status/non-JSON unchanged; private parsed body per consumer; abort-one-leaves-other; abort-all reaches the physical fetch and a late old completion cannot delete/poison a replacement; settled retry fresh; distinct query/id/token/shell separated; standalone signal identity pinned; synchronous fetch throw cleans up + retries; async fetch failure rejects all current waiters with the same reason identity + retries; **explicit falsey abort reasons preserved via `signal.reason` directly** (no `??` substitution).

## Targeted regressions

- `s269-canonical-url`, `s26h-stale-clear`, `s25b-refresh-owner-gap`: **103/103 passed** (`s279-regression.log`).
- `tsc --noEmit -p tsconfig.json`: **exit 0**.
- `s26e-readback-routes` (Lead-owned two-event/signal hunks, hash `5403FB…`): **49/49 passed** (`s279-s26e-known.log`) — no stale green; current oracle green.
- No full suite/packaging/SEA.

## Contract

Owner-local in-flight only; settle/failure/last-abort deletes the slot; identity-guarded finalizer so an old aborted flight cannot remove a replacement; each waiter rejects with exactly `AbortSignal.reason` (default native AbortError, explicit falsey preserved), one waiter abort leaves others and the physical fetch alone, last abort aborts the owned controller; physical fetch receives the owned signal (Lead's s26e coordination), standalone client keeps exact caller signal identity; body read once, fresh `Response` per waiter (raw text/status/headers only; no url/type/redirected claim), 204/205/304 null body, 1xx/0/opaque fails explicitly; failures clear the slot and retry is fresh; Effect-first rationale documented in the helper header (bounded waiter set, real signals, `typeof fetch` facade, no queue/retry framework).

## anti_slop_lint disposition

- New test: clean (0).
- `src/readback-flight.ts`: **6 findings**, all the intentional external rejection boundary — `44:no-unknown-parameters`, `60:no-unknown-returns`, `105:no-unknown-parameters`, `130:no-unknown-parameters`, `202:no-unknown-parameters`, `204:no-unknown-parameters`. Reasons are preserved by identity (arbitrary/falsey values; no normalization); the exception is documented in the helper header. No suppression.
- `src/readback.ts` changed region: `1022:no-known-value-widening` on the returned reader record — same object-literal shape the pre-change return used; no new pattern/value change. Other `readback.ts` findings are pre-existing parser code.

## Acknowledged bounded gaps (s5 section-B review)

- No executed unhandled-rejection/listener-leak assertion.
- `buildResponse` 1xx/0/opaque-status failure path is implemented but untested (same-origin GETs do not produce them).
- s26e was Lead-owned and is now green at the Lead hash; no weaking of the fetch/abort proof.

## Limits

Bounded slice only; no full suite, packaging/SEA, live browser or client-trace verification. Files owned by others (`init/update/message/refresh/view`, existing s26e) were not modified by me; no commits.

