# S166 Fresh D-vs-C parity at the current HEAD - re-made, not inherited

Last round I refused to carry the parity claim forward without re-measuring it. This is that measurement.

| Side | Version |
|---|---|
| **D** (pre-migration baseline build) | `0.0.20-1-g9b0ca8bd` |
| **C** (current clean-pair candidate) | `0.0.20-163-g6ed7ece9` |

Both started by `compare-release` itself, 162 commits apart:

```
same  /healthz - runtime/summary - models - endpoints - router/summary
      - operator/learning - operator/replay/jobs - operator/evaluation/jobs
environment-state  /telemetry/summary
{"same":8,"environment-state":1}   exit=0
```

**Zero `different` classifications.** The telemetry row is environment state by construction (a fresh host has no requests on either side).

## What this does and does not say

It says the nine compared surfaces of the current candidate match the pre-migration baseline after identity stripping. It does **not** say the two builds are identical - 162 commits separate them, including the UI port, the origin gate, the R27 scope work and R39 tooling, and `compare-release` deliberately strips `version`, `commit`, `executable_sha256` and friends so identity churn cannot masquerade as a difference or as parity.

It also does not re-establish the **R** leg. R is the live operator on :3456; the earlier triple used a staged copy of R run isolated, and I have not re-staged it this round. So the honest claim is now **D-vs-C: 8 same / 1 environment-state / 0 different**, with the R leg dated to its earlier evidence rather than re-measured.

## Why this matters for the objective

The objective asks for "actual packaged real-client R/D/C release parity". A parity claim that is older than the candidate it describes is not evidence, it is memory. This round turned it back into evidence for the D and C legs.