# S188 Pair rebuilt at current HEAD: 10 gate checks + 20 rendered routes, 0 failures

After the backend changes (transaction split, schema contracts, R32 wiring, inventory refresh) the pair had to be regenerated before any release claim could rest on it.

```
private distribution : PASS, 13 extensions, sidecar 5c09f4ef1d74140c90895359efa25d57bfbac4cbf83cf3677d11ac338b4b4685
packaged candidate   : role-model-dev.exe  sha256 e3181d50…  version 0.0.20-188-gd362b404
```

## Gate, including the rendered audit

```
PASS health / models / telemetry / controller / learning / replay / evaluation
PASS ui css (58437 bytes, both theme blocks)
PASS ui bundle (2661513 bytes)
PASS ui theme boot (theme selected in CSS, no inline palette)
PASS ui shell
PASS 20/20 routes, focus visibility checked, 0 failures
```

## Two obstacles, both mine

1. **Packaging refused twice** - first because the public worktree was dirty (I wrote the S187 evidence file while the rebuild job was running), then because the *previous candidate was still listening on 6201*, holding `role-model-dev.exe` open: `EPERM: operation not permitted, unlink`. Stopping the process released the lock.
2. The private build had regenerated seven evidence JSONs again (the same churn reverted in S163). Reverted before building so the distribution is produced from a clean tree.

Both are ordering mistakes in my own workflow, not product defects - but the second one would have shipped a "dirty development build" marker if the guard had been weaker.

## What this re-establishes

- the candidate at this HEAD serves the current UI (theme boot check + 20 rendered routes);
- the backend extensions in this distribution are the ones with the transaction/schema work;
- the exe digest did **not** change (`e3181d50…`) because the public source did not - only the private sidecar did.

## Not re-measured

The cross-origin gate was proven against **this exact exe digest** earlier, so it stands. D-vs-C parity was measured at `0.0.20-163`; the version is now `0.0.20-188` (documentation-only public commits), so that comparison is one version old - a fresh one is cheap and belongs in the next round rather than in a claim here.