# S576 — S575 review remediation

1. `s540` runtime case now asserts the reference card structure explicitly: exactly 4 card sections (`cards: 4`) and no structural table/SVG claim (`skipStructure: true`), replacing the meaningless `>=0` limits.
2. `s76a` restored the pre-load invariant as its own test: while the automatic read is in flight the page offers no editor, no save and no confirm-save. The auto-load test remains.
3. `s380` state assertions are route-contained again: they read `[data-route="models"]` text, not `document.body`.
4. `s571/s574` evidence now states geometry is browser-measured (aside 224 wide, header 48, track 1216) and the unit scene asserts the class contract only; the honest-limits list is completed with candidates/decisions MetricStrip and observe-routing single chart.
5. `s71b` waits for the models table instead of only the heading and matches reference-cased headers case-insensitively.

Gates after fixes: full UI suite 76 files / 811 tests (s76a +1), tsc 0.
