# S189 Fresh D-vs-C parity at 0.0.20-188

The last parity measurement was at `0.0.20-163`; the candidate is now `0.0.20-188-gd362b404` (documentation-only public commits since). Re-measured rather than carried forward.

| Side | Version |
|---|---|
| **D** (pre-migration baseline) | `0.0.20-1-g9b0ca8bd` |
| **C** (current candidate) | `0.0.20-188-gd362b404` |

```
same  /healthz - models - endpoints - router/summary - operator/learning
      - operator/replay/jobs - operator/evaluation/jobs
environment-state  /runtime/summary - /telemetry/summary
{"same":7,"environment-state":2}   exit=0
```

**Zero `different` classifications.**

## The two environment-state rows, itemised

The tool prints the exact differing leaves instead of hiding them behind a classification:

```
runtime/summary:
  processMetrics.rssBytes                 145448960 -> 145223680
  unifiedConfig.path                      …compare-left-t5FV48… -> …compare-right-tF3uHq…
  operatorIntent.path                     …compare-left-t5FV48… -> …compare-right-tF3uHq…
  configuredMembershipReconciliation.reconciledAt   34.036Z -> 32.659Z
telemetry/summary:  both sides empty (fresh hosts, no traffic)
```

Every one of those is per-run state. None of them is a migration difference, and none is *classified* away without being printed.

## What is still dated

The **R** leg. R is the live operator at `:3456`; a production-channel package and this development candidate legitimately differ on channel-carrying surfaces, and `compare-release` refuses that comparison unless `--allow-cross-channel` is passed. Re-measuring R requires a production-channel candidate, which needs a Run 88 identity.

So the standing claim is: **D-vs-C measured today at 0.0.20-188, 0 differences; R dated.**