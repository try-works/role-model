# S255 F152 is not a run115 regression: taxonomy prerequisite + a private caller that predates the public contract

Investigated by a delegated agent, then re-verified by its own runs. Fresh diagnostic rebuild, 4 pass / 1 fail (43.3 s).

## Layer 1 - taxonomy prerequisite (harness)

Without `ROLE_MODEL_TAXONOMY_DATA_ROOT`, both cases die at import: `runtime-shadow-pipeline.mjs:420` cannot read
the taxonomy manifest from the private cwd. `scripts/track-b/taxonomy-data-root.mjs:16-29` honours an explicit
root then `PUBLIC_WORKTREE`; the public resolver (`taxonomy/index.ts:155-198`) honours an explicit root,
`--repo-root`/`ROLE_MODEL_REPO_ROOT` and exec/cwd fallbacks - **not** `PUBLIC_WORKTREE`.

`ensureTaxonomyDataRoot` (19861b94, 2026-10-05, #125) was adopted by the build/conformance consumers and other
tests, **not by F152**. Least-invasive fix: call the existing helper from the F152 test. No env hardcoding, no
public resolver change.

## Layer 2 - a pre-existing contract drift (private)

With the root set, the unresolved-ref case passes unchanged and the GREEN case fails at
`runtime-shadow-pipeline.mjs:853` with `readback=transferState,resultHash,byteLength` - **before and after a fresh
rebuild** (adapter 10:16:43, manifest 10:16:51, publicCommit f3419212 / privateCommit 263f0260). Not a stale dist.

| Fact | Value |
|---|---|
| Private forwarding lines blame | `20b0ba34`, **2026-09-10** |
| Private `git log -S contractStateRoot` | **empty** |
| Public externalized-output support | `44b12d97`, 2026-09-13 |
| Public comparison readback passes the root | `edba7c7e`, 2026-09-18 |
| Public propagates it from post-observation | `7c67246b`, 2026-09-21 |

So the private forwarding **predates every public change that introduced and propagated `contractStateRoot`**.
The decoder did not "newly gain" the field on 2026-09-21 from the private file's perspective - the private caller
was written before the field existed anywhere and was never updated.

## The proposal (NOT implemented)

At `runtime-shadow-pipeline.mjs:898-900` forward `contractStateRoot: stateRoot` **after** `...input`, so the
host-owned root wins. The root already exists at `:440` and the journal uses it at `:445`; the public host derives
`workers/<id>` from the journal dirname and the worker persists `durable-output.sqlite` there. The public field is
optional for inline records but **required** for an externalized output, which is exactly the failing case.

Not implemented here: it is a one-line change to the private production path that needs its own TDD cycle (RED on
the F152 GREEN case, then GREEN) and an independent review - not a side effect of a test investigation.

## What this means for the run

The F152 failure is **not** fallout from the run115 migration. It is a harness prerequisite plus a private caller
that has been behind the public contract since before the migration started. Recording it as a run115 defect would
have been the third misattribution of this kind (S246, S248), which is why the delegated agent was required to
name which side moved and to prove it with history.