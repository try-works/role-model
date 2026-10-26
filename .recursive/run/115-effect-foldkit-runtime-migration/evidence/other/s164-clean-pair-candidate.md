# S164 Clean pair produces a working candidate - gate and origin control re-proven at HEAD

After cleaning both trees (S163) I generated the pair and packaged from it, with no dirty allowances:

```
private distribution: PASS, 13 extensions, sidecar a3235d30...
packaged exe          : role-model-dev.exe  sha256 e3181d507a6ccd757407024dda25b1813329dd6e7895ae5d4e52b4f84c63e7a7
```

## Packaged candidate gate

```
version=healthy 0.0.20-163-g6ed7ece9
PASS health / models (3) / telemetry (0) / controller / learning / replay jobs (0) / evaluation jobs (0) / ui shell (1960 bytes)
exit=0
```

## Cross-origin write gate, re-proven on this binary

| Request | Result |
|---|---|
| `PATCH /api/role-model/controller`, `Origin: https://evil.example` | **403**, no ACAO |
| `PATCH`, no `Origin` | **200** |
| `GET`, foreign `Origin` | **200**, ACAO `*` |

## An ordering constraint worth recording

Packaging failed first with `Track B runtime distribution public source tree does not match this package`, because the distribution binds the **public source tree** and my last public commit (a docs commit) had moved it. Even a `.md` change invalidates the pair.

The working sequence is therefore:

1. commit everything in the public tree (clean),
2. build the private distribution against that exact tree,
3. package,
4. run the gate.

Any public commit between (1) and (3) restarts the cycle. This is why a release build cannot be resumed across a review comment that edits a file.

## What this establishes

At this HEAD, the clean pair builds a candidate that starts, serves all eight checked surfaces, and enforces the cross-origin write control. It does **not** establish anything about the stage-only packaged-runtime branch (still unreachable without a real Run 88 identity), nor replace the full host suite.