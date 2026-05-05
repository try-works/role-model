Type: `pattern`
Status: `CURRENT`
Scope: `How to keep local validation exports separate from durable tracked handoff artifacts when runtime-output or similar paths are ignored by repo policy.`
Owns-Paths:
- `/runtime-output/`
- `/role-model-router/packages/**/data/`
Watch-Paths:
- `/.gitignore`
- `/package.json`
- `/role-model-router/packages/**/src/cli.ts`
Source-Runs:
- `05-router-runtime-catalog-foundation`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-05-05T02:40:00Z`
Tags:
- `skills`
- `validation`
- `handoff`
- `artifacts`

# Ignored Validation Output Vs Tracked Handoff

Some runs need both:

- a local export or validation path that writes into runtime-output-style folders, and
- a durable tracked artifact path that later runs can consume from the repository history.

## Rule

If the local validation output path is ignored by repo policy, do not rely on that path alone for the durable run handoff.

- keep the ignored path for live validation if it is the right operational surface,
- promote the final stable artifacts into a tracked repo-owned location such as a package `data/` folder when later runs need a durable handoff,
- record the distinction explicitly in the implementation and validation receipts so later work does not mistake ignored runtime output for committed source-of-truth data.

## Why

Ignored validation output is good for local execution, but it disappears from normal Git history and cannot serve as a durable handoff artifact for later recursive runs.

## Checklist

- confirm whether the planned validation output path is ignored
- keep the validation command pointed at the operational path if that is still the right runtime surface
- add a tracked copy or tracked derivation path for artifacts later runs must consume
- document the split in late-phase receipts and state/decisions updates
