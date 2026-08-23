---
Type: domain
Status: CURRENT
Scope: CI-to-artifact commit provenance for promotable Stage and production runtime packages.
Owns-Paths: .github/workflows/build-binaries.yml; role-model-router/apps/runtime-host-bridge/src/runtime-version.ts
Watch-Paths: scripts/build-binaries-workflow.test.mjs; role-model-router/apps/runtime-host-bridge/test/
Source-Runs: 94-stage-manifest-commit-identity
Validated-At-Commit: working-tree Run 94 Phase 4
Last-Validated: 2026-08-23
Tags: release, stage, production, manifest, provenance, ci
---

# Release artifact provenance

Promotable Stage and production packages require one exact 40-hex Git commit
identity at every boundary. In a shallow CI branch build, `GITHUB_SHA` is the
authoritative fallback; synthetic values such as `runtime-derived` are valid
only for non-promotable local development and must be rejected by Stage
identity validation.

The commit equality is verified at package assembly (`manifest.commit` equals
the producing workflow SHA), packaged runtime startup, downloaded Stage
candidate consumption, and final acceptance. Do not rely solely on artifact
names, tag lookup, or a source-tree digest.

When this logic changes, keep explicit RED tests for the shallow-CI fallback,
invalid packaged manifest, producer mismatch, and Stage-candidate mismatch,
then rebuild a fresh candidate. A prior rejected candidate cannot be repaired
or promoted retroactively.
