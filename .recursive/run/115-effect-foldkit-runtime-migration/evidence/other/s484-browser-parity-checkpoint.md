# S484 — browser parity harness validated on packaged candidate

Pair public 3299ad00 / private b8733789; exe sha d94d3c25e348df1b583c3b55d0857d9080f5a44e2d0765dd1ab6b3c3d563b775 (0.0.20-330-g3299ad00). CHROME_PATH + PARITY_SELFCHECK_TEMP_DRIVE=D: + default release path synced to the new package.

parity-selfcheck: PASSED harness - React deterministic (two runs identical sha 5eace5b8), Foldkit deterministic (b69dacdc), route "/" captured on the packaged exe. reactVsFoldkit classification "different" equal:false -> the Foldkit port still renders visibly different pixels vs the React baseline on that route; per R14/M4 those deltas require classification and owner approval (bounded approved deltas only) before visual parity acceptance.

parity-mutation: PASSED - one-class mutation (display:flex->block) applied to React static root, detected (mutatedDiffers true, noFalseMutation true), baselines deterministic.

compare-release: NOT RUN - no preserved v0.0.20 React release artifact present locally (searched D:/DEV/role-model; only run49 evidence names). Requires the preserved artifact and per R16 the same controlled fixtures.

Real-client R15/R16-live/R39 remain approval-gated and unrun. Visual-delta triage (Foldkit vs React route captures) is the next concrete parity work item.
