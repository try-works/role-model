# S173 Cross-channel refusal now covers URL sides - and a tangle of my own edits along the way

The last open hole from the review: *"cross-channel refusal only works for exe/exe with manifest beside the exe (URL/exe bypass)"*.

## Fix

The comparison now resolves a channel for whichever side is a **URL** by asking that side directly (`/healthz` -> `runtime.channel`), and refuses before comparing:

```
NOT RUN: channels differ (production vs development); pass --allow-cross-channel if that is deliberate   exit 2
```

Verified three ways:

| Case | Result |
|---|---|
| staged **production** URL vs development exe | refused, exit 2 |
| development URL pair, one side reporting production | refused, exit 2 (test) |
| same-channel D vs C | `{"same":7,"environment-state":2}`, exit 0 |

## The comparison in URL mode found a real channel difference

With `--allow-cross-channel`, production vs development reports **shape-delta**, not "different":

```
shape-delta keys /healthz: -runtime.release_id, -runtime.private_distribution_sha256
shape-delta keys /api/role-model/runtime/summary: -runtime.release_id, -runtime.private_distribution_sha256
{"shape-delta":2,"same":6,"environment-state":1}
```

Those two keys exist only in the production package. That is exactly what a cross-channel comparison should surface, and exactly why it must not be counted as parity evidence.

## My own mess in this round, recorded

1. I inserted the URL-channel block **before `readJson` was defined** - `ReferenceError` at runtime, caught only by running it.
2. My string replacement then produced a malformed ternary (`: undefined : undefined`) - caught by `node --check`.
3. Patch removal left a **stray `}`** - caught by `node --check` again.
4. The refusal originally ended with `throw`, so a refusal printed an uncaught stack trace; and the post-fetch `process.exit` risk resurfaced. Fixed by disabling keep-alive (`connection: close`) on comparison fetches and exiting with `process.exit(2)` after killing the children.

Four defects in one edit sequence, three of them mine rather than the code's. The pattern is consistent across this run: my edits to a 200-line script fail more often than the script does.

## Tests

`r39-scripts.test.ts`: **18/18**, now covering same, environment-state, value-diff, shape-delta-by-channel, same-port refusal, cross-channel refusal for both exe/exe and URL/URL, no forced scope id, and the health-cleanup path.