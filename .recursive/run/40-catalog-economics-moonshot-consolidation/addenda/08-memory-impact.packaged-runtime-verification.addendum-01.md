Run: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
Phase: `08 Memory Impact`
Status: `APPROVED`
Addendum: `01`
Inputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/addenda/05-manual-qa.packaged-runtime-verification.addendum-01.md`
Outputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/addenda/08-memory-impact.packaged-runtime-verification.addendum-01.md`
Scope note: Durable workflow lessons from post-closeout SP9 verification.

## Lessons captured

1. **Unit tests ≠ packaged proof** — catalog overlay can be correct while router-core freshness decay still skews live cost strategy; always run Tier 3 operator probe on `:3456` after SEA rebuild.
2. **Catalog cost is not observed cost** — `decayToNeutral()` applies to latency/reliability telemetry metrics, not catalog-derived rate tables (R7).
3. **Worktree-only discipline** — product code on `recursive/40-catalog-economics-moonshot-consolidation` in `.worktrees/`; `main` stays at `42dffbb` until PR merge.
4. **Windows launch quoting** — `--runtime-state-root` paths with spaces must be quoted when using `Start-Process -ArgumentList`.

## Addendum chain (authoritative post-closeout inputs)

| Addendum | Purpose |
| --- | --- |
| `00-worktree.isolation-attestation.addendum-01.md` | Main vs worktree attestation |
| `01.5-root-cause.catalog-cost-freshness-decay.addendum-01.md` | Live drill failure RCA |
| `02-to-be-plan.packaged-runtime-verification.addendum-01.md` | SP9 plan |
| `03-implementation-summary.packaged-runtime-verification.addendum-01.md` | SP9 delivery |
| `04-test-summary.packaged-runtime-verification.addendum-01.md` | Automated + drill evidence |
| `05-manual-qa.packaged-runtime-verification.addendum-01.md` | Scenario 7 PASS |

## Coverage Gate

- [x] Workflow lessons recorded for future runs

## Approval Gate

- [x] Supplements locked `08-memory-impact.md` without rewrite
