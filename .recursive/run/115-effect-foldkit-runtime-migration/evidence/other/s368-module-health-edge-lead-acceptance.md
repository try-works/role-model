# S368 — B1 calibrated module-health edge Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS after one HOLD round (lint) — evidence/other/s367-module-health-edge-review.md sha256 `1BEF11E5E02883592F99808D1DDEA199F9916C9A1969E9CF9E0568065FAC20E9`.
- Committed bytes verified by Lead: index.ts `B527BD0ACB9BDECA94EA30DCECF5DB2383A0E16DAC6A28819D2F0A0F208EAD7E` (1370797 B), s366 test `AB8E1553EEE6914CFECB7417B82D529A934264B22E4C5155D8D6C1F897C3A478` (3810 B), s10b test `59FB73D6210F806962EDCD87FEDBEC0CDFD133999CABA225536CF0A0D53C1C12` (4518 B).
- What landed: the transport report edge classifies through recordCause (Fail/Die/Interrupt preserved; plain error → Cause.fail; coarse recordError edge removed); client-caused 4xx escapes excluded from module-failure counts; the calibration gate requires enabled AND approved calibration (no silent default-on); exactly-once listener reporting. 24/24, tsc 0, tests lint-clean.
- This closes S365 gap 1 (calibrated Cause/error edge). Gaps 2 (production query source) and 3 (real defect readback) remain named follow-ons (S365b/S365c).
