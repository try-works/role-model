# S588 - post-audit gate re-verification and compare-release (2026-10-31)

## Trigger
Independent gate audit (S587) found stale packaging claims: the packaged-candidate manifest was absent (failed packaging removed it), verify-packaged-candidate was NOT RUN on the current build, the 20/20 audit and dialog PASS were from an older build, and compare-release had never run against the current artifact. This closes those gaps.

## Sequence
1. Committed the three audit reports (S585/S586/S587).
2. Rebuilt the private track-B distribution against the new public HEAD (every public commit invalidates the paired distribution).
3. validate-packaging PASS (clean public tree).
4. verify-packaged-candidate PASS: version healthy 0.0.20-439-g683bdda2.
5. audit-rendered-ui 20/20, dialog a11y PASS on the 439 artifact.
6. compare-release against the preserved production 0.0.20:
   - identity: left=0.0.20, right=0.0.20-439-g683bdda2
   - 6 same, 2 additive-shape, 1 environment-state, 0 different
   - additive-shape surfaces: /healthz and /api/role-model/runtime/summary (left 0.0.20 lacks runtime.release_id / runtime.private_distribution_sha256)
   - environment-state: /api/role-model/telemetry/summary
   - verdict: no semantic divergence from the released 0.0.20.

## Remaining owner-gated (unchanged)
R15 live real-client provider; R16 like-for-like seeding approval; R39-live CI dispatch and blocking toggle; stage/prod Run88 identity; pixel-level visual-delta sign-off. E1/E2 remain accepted owner deferrals.

## Corrections to earlier evidence
- S581's claim that compare-release could not run because the preserved artifact was unavailable is stale: D:/role-model-router/0.0.20 exists and the compare now ran.
- The 20/20 audit and dialog PASS in S581 belonged to an earlier build; they are re-proven here on the current artifact.
