Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `00 Requirements - post-lock addendum 02`
Status: `LOCKED`
LockedAt: `2026-10-01T08:08:26Z`
LockHash: `4ff819ca78c2dd16e7d4c246a613bd58077bd7632c1d5bdc7a850c8930e887ac`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED, hash `ff9fe4a6`)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (`T1.2c`, `## Gaps Found`)
- `evidence/other/as-is/replay-catalog.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-catalog-lineage.addendum-02.md`
Scope note: Corrects the `R3` lineage premise after Phase 1 measured the pinned catalog.

## TODO

- [x] State what in the locked requirement was wrong
- [x] Provide evidence for why the amendment is needed
- [x] Specify the amended acceptance criteria
- [x] State the impact on traceability
- [x] Lock this addendum

## What was wrong

`R3` asserts that "`deepseek-v4-flash` is a deprecated alias served by `deepseek/deepseek-v4.1-flash`" and that
"the endpoint must be declared image-capable". At the pinned baseline:

- there is **no** `deepseek/deepseek-v4.1-flash` entry in the local catalog;
- `deepseek/deepseek-v4-flash` is `["text"]` (local override applied);
- the entry the runtime actually calls, `deepseek/deepseek-flash`, is **already** `["image","text"]`;
- the pinned upstream commit is `978733d4459d91bee9af1c0839e0636deebb7194` (`capturedAt` 2026-08-15), older than
  the `67dcd8c9` the requirement cites.

So the "flip flash to image" framing is wrong for this baseline: the served entry is already image-capable, and
the real defects are stale provenance, a missing lineage model (no v4.1 base entry), and an alias whose declared
modalities do not inherit its upstream base.

## Evidence

- `packages/catalog/data/normalized-catalog.json` (pinned `models.dev@978733d4`): `deepseek/deepseek-flash`
  `["image","text"]`; `deepseek/deepseek-v4-flash` `["text"]`; `deepseek/deepseek-v4-pro` `["text"]`; no
  `v4.1-flash` entry (controller extraction, 2026-10-01).
- `evidence/other/as-is/replay-catalog.md` (`T1.2c`): same rows plus the export path
  (`refresh.ts:309/:425` -> `catalog/src/index.ts:545-572`) and the overrides limitation
  (`ModelOverride` has no modalities field, `:93-96` vs `:557`/`:559`).

## Amended requirement text

`R3` acceptance criteria are amended to:

- Refresh the pinned upstream provenance to a commit that contains the `deepseek/deepseek-v4.1-flash` base and
  the deprecated `deepseek-v4-flash` alias (and record that commit in the vendor ledger).
- Model the lineage: a `deepseek/deepseek-v4.1-flash` base entry with its upstream modalities (text + image, no
  pdf) and `deepseek/deepseek-v4-flash` as a deprecated alias whose declared modalities equal its base's.
- Keep the runtime's actual entry, `deepseek/deepseek-flash`, declared with upstream-accurate modalities, and
  prove in a test that the endpoint the runtime selects carries the corrected metadata.
- `deepseek/deepseek-v4-pro` stays `["text"]`; no DeepSeek entry declares `pdf` (unchanged).
- The local overrides path gains the ability to set `modalities` so a future alias correction does not require a
  supplementary file (this also carries `R4`).

## Impact on traceability

- `R3` (amended premise), `R4` (override support is now explicit `R3` scope), `R5` (unchanged, re-verified).
- `SP3` scope: provenance refresh + lineage entry + alias inheritance + override modalities, instead of a single
  modality flip.

## Coverage Gate

- [x] The corrected premise is grounded in the pinned catalog rows (controller extraction) and the export path
- [x] Each amended criterion is observable (catalog export test, alias-inheritance test, override-modalities test)
- [x] `R4`/`R5` coverage is preserved; no criterion was removed

Coverage: PASS

## Approval Gate

- [x] The operator approved the run and instructed the controller to unlock and edit the requirements as needed
  (this thread, 2026-10-01); the correction aligns `R3` with the measured baseline

Approval: PASS
