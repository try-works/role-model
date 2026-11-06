# S236 The candidate identity in my own parity records was wrong

S234 and S235 recorded the dev candidate as `0.0.20-214`. Reading it from the packaged binary instead of
from memory:

    GET /healthz -> version = 0.0.20-231-gd61c32dc, commit = d61c32dc268d…

The package was rebuilt after the S223 type fix (commit `d61c32dc`), so the exe under test is **231**, not
214. Corrected in `FINAL-STATUS.md`, `s234-r-side-parity-0020.md` and `s235-additive-shape.md`.

## Why it matters even though the result does not change

The parity measurement compared the *production 0.0.20 package* with *whatever exe was on disk*. The
comparison output is what it is; the label attached to it was stale. A record that names the wrong
build is not reproducible by the next reader - they would check out 214 and get a different binary.

## The check that should have existed

`--expect-version`-style verification exists in the gate for models (`--expect-model`) but nothing pins
the **candidate identity** in a parity run. `compare-release` prints what it saw (it reports version
mismatches as channel/shape differences), but the evidence doc did not quote it.

Rule adopted for the rest of this run: a parity record must quote the `version` string from the binary it
compared, not the version I believe is current.

## State

| Record | Value |
|---|---|
| packaged candidate | `0.0.20-231-gd61c32dc`, commit `d61c32dc`, exe sha `e3181d50…` |
| production comparison target | released `0.0.20`, commit `945a8906`, channel `production` |
| result | 6 same, 2 additive-shape, 1 environment-state, 0 different |