# Foldcn gap ledger (R7)

Decision: **Foldcn is not vendored and not used** by this repository. There is no Foldcn source tree,
notice, package dependency or import in `role-model-router/` (verified by the exact-token scan in
`packages/ui/src/rm3-provenance.test.ts` and by the absence of any Foldcn path under `vendor/`).

The **Crease-first** rule applies: the only vendored component source is
`vendor/crease` at commit `bb447e363e9c717bf11ebb10b2259f053bff6f71` (MIT, 2026-10-22), retained
verbatim with `PROVENANCE.md`, `VENDORED.json` and `LICENSE`. First-party RM3 adaptations are mapped
in `RM3-ADAPTED-SOURCES.md`, kept outside the untouched vendor snapshot.

If Foldcn is ever adopted, this ledger must be replaced by a pinned source/notice entry (upstream URL,
commit/tag, content digest, licence, owner) before any first-party adaptation is committed. Until then
the honest disposition is "not used", not an inferred or partially copied source.

Owner: RM3 frontend maintainers. Reviewed against the Crease-first rule in run 115 S650 repair.
