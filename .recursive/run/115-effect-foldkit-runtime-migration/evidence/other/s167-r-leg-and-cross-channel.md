# S167 The R leg broke compare-release, and the fix is a refusal rather than a number

I tried to re-measure the R leg by staging the operator install and comparing it with the candidate. Three defects surfaced, two of them in my own tool.

## Staging R is sound

Copied `D:/role-model-router/0.0.20` (159 files, 127 MB) to `E:/rm-tmp/r-staging-r144` and hashed every file on both sides:

```
differing entries = 0
```

The staged copy starts on an ephemeral port and answers `/healthz` in **8 s**. The live operator on `:3456` was never started, stopped or pointed at anything.

## Defect 1 - `compare-release` forced a development scope id

Both spawn paths passed `--scope-id standalone-runtime-dev`. A production-channel package carries its own scope in the profile and **refused to start** under that override, so the tool reported `NOT RUN: --left-exe did not become healthy` against a binary that ran fine by hand.

Fixed by not forcing either: the profile owns the scope. Raising the readiness budget (now 120 s, `R39_READY_TIMEOUT_MS`) was also needed - 30 s was too short for a cold sidecar start.

## Defect 2 - the comparison then measured the channel, not the migration

With both sides healthy, R (production) vs C (development) reported:

```
different /healthz
different /api/role-model/runtime/summary
{"different":2,"same":6,"environment-state":1}   exit=1
```

Those two surfaces carry channel/scope fields, so the result measures `production` vs `development`, not migration parity. **I was one step from recording that as an R-leg regression.**

The tool now refuses a cross-channel comparison:

```
NOT RUN: channels differ (production vs development); pass --allow-cross-channel if that is deliberate
exit=2
```

## Defect 3 - my import insertion failed silently, again

The refusal did not fire the first time: `readFileSync` was undefined inside `channelOf`, the `try/catch` swallowed it, and both channels resolved to `undefined`. Third instance this session of an import edit that looked applied. The behavioural test caught it; the syntax check did not.

## Verified after the fixes

| Case | Result |
|---|---|
| cross-channel (R vs C) | **NOT RUN**, exit 2 |
| same-channel (D vs C) | `{"same":8,"environment-state":1}`, exit 0 |
| `test/r39-scripts.test.ts` | **13/13** (2 new: cross-channel refusal, no forced scope id) |

## What this means for the R leg

R parity **cannot be re-measured with a development candidate** - not because the tool is stubborn, but because a production package and a development package answer differently on channel-carrying surfaces by design. Re-measuring R needs a production-channel candidate, which needs a real Run 88 identity.

So the honest R status is unchanged from S166 ("dated to earlier evidence"), and it is now **enforced** that I cannot quietly produce a misleading R-vs-C number instead.