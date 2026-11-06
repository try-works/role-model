# S290/S291 refresh EventSource page-lifetime repair

Task-15 (completed rev3). Model: **deepseek-flash** (verified live). Scope: exactly
`src/refresh.ts`, `src/message.ts`, `src/update.ts`, new
`test/s290-refresh-page-lifetime.test.ts`. No CLI/children/commits/installs.

## What changed

- `src/message.ts`: new `RuntimePageRestored: EmptyFields` union case — a real page-lifecycle fact, not
  telemetry and not a revision.
- `src/update.ts`: `RuntimePageRestored: () => invalidateCurrentRoute(model)` — reuses the existing
  query-preserving invalidator (Index window + filters, Dashboard window id, …); leaves
  `refresh.lastAppliedRevision`, `resyncToken`, `status` and `message` untouched; no synthetic
  telemetry/revision; no staleness policy invented.
- `src/refresh.ts`: one `Effect.acquireRelease` owner for ONE EventSource (two listeners) with:
  - a per-generation active guard so a retired source can never publish after a reopen;
  - idempotent close; `pagehide` always releases the connection (the persisted BFCache page may be
    suspended indefinitely);
  - persisted `pageshow` reopens exactly once, attaches both listeners and only then emits
    `RuntimePageRestored` once; ordinary `pageshow` and repeated shows open nothing;
  - the finalizer disables, closes the current source and removes both page listeners, so a later
    `pageshow` cannot reopen;
  - partial attach failure closes/clears the new generation before propagating; a `pageshow`
    registration failure rolls back the `pagehide` listener and closes the source before propagating;
  - a factory failure during reopen is reported (bounded `console.error`) and does not escape the page
    callback, so a later persisted `pageshow` can retry; success still announces only once;
  - SSR/no-window fallback keeps the original source; no new protocol/coalescing; legacy revision
    parser untouched.

## Evidence

- Strict RED 1 (`evidence/logs/s290-red.log`): 5 failed | 4 passed — lifecycle absent.
- Strict RED 2 (`evidence/logs/s290-red-2.log`): 2 failed | 9 passed — missing emit/reducer handler.
- Strict RED 3 (`evidence/logs/s291-red.log`): 2 failed | 12 passed — factory-reopen throw escaped the
  page callback; pageshow-registration throw left the source open.
- GREEN (`evidence/logs/s290-green.log`): new 14 + S278 8 + s25b 9 = **31 passed**, exit 0.
- `tsc --noEmit` exit 0 (`evidence/logs/s290-tsc.log`).

## Frozen hashes

```
role-model-router/apps/runtime-ui-next/src/refresh.ts|8962|87CEFA2E512936D5844B1C9A1A45C9CBA39F2BF4C315E28247BD575027176710
role-model-router/apps/runtime-ui-next/src/message.ts|7745|43E9EB8136331FD037B3D4FB67E9065DEB94D650BC0E054D860D2D868D3FE300
role-model-router/apps/runtime-ui-next/src/update.ts|34188|301E7C7415903D3786632F60E7373160113524E40567B78A47BE587E3F56155C
role-model-router/apps/runtime-ui-next/test/s290-refresh-page-lifetime.test.ts|17012|15F53B872824796F182AF08D4011AF911FCE0A56D5F769CB0864B7A908D6587D
--- diff ---
2	0	role-model-router/apps/runtime-ui-next/src/message.ts
113	31	role-model-router/apps/runtime-ui-next/src/refresh.ts
3	0	role-model-router/apps/runtime-ui-next/src/update.ts
```

## Lint (actual findings)

- refresh.ts: findings — 38:no-runtime-typeof, 86:require-safety-comment-for-type-assertion, 87:no-runtime-typeof, 114:no-runtime-typeof, 176:no-unknown-parameters
- message.ts: clean
- update.ts: findings — 116:no-unsafe-dictionary-type, 118:require-safety-comment-for-type-assertion, 118:no-runtime-typeof, 118:no-known-value-widening, 118:require-safety-comment-for-type-assertion, 118:no-unsafe-dictionary-type, 119:no-known-value-widening, 485:require-safety-comment-for-type-assertion, 512:require-safety-comment-for-type-assertion, 521:no-conditional-empty-object-spread
- s290-refresh-page-lifetime.test.ts: findings — 131:no-unknown-returns

## Limits

Browser-proxy/socket claims are the Lead's real-browser runs; this repair proves the lifecycle contract
in-process only (no exact socket count, no CDP IDs). Factory-reopen failures are reported via
`console.error` (bounded observability, no typed failure state), and the retry is driven by the next
persisted `pageshow`. No store/provider/protocol changes; single owned RefreshSubscription preserved.
