# S140 The five scope slices did not change observable API behaviour

`compare-release` between the **pre-slice** package (`E:/rm-tmp/s97a`, `0.0.20-81-g17cbdd21`) and the **current** package (`1403f66f…`, `0.0.20-131-g13e0c927`), both started by the script:

```
same  /healthz · runtime/summary · models · endpoints · router/summary
      · operator/learning · operator/replay/jobs · operator/evaluation/jobs
environment-state  /telemetry/summary
{"same":8,"environment-state":1}   exit=0
```

## Why this is the right check for the rewiring

Five slices moved ownership of every host resource and rewrote the release path. The risk that matters is not "does it still compile" - the suite covers that - but **"did the runtime observably change"**. Eight of nine compared surfaces are byte-identical after identity stripping, and the ninth is telemetry, whose counters are environment state by construction (a fresh host has zero requests on both sides, and the classifier treats that family as environment-state rather than a difference).

That is a behaviour-preservation argument backed by a measurement of the shipped binaries, not by the diff.

## What it does not cover

- The packaged/extension slices are not exercised: the dev-channel package takes the `createBackend()` branch (S131).
- The comparison strips identity fields (version, commit, executable hash) by design, so it says nothing about identity correctness - that is what the manifest pin in the candidate gate is for.
- Nine endpoints are not the whole surface: mutating routes, operator gates and the client bundle are covered by their own evidence, not here.