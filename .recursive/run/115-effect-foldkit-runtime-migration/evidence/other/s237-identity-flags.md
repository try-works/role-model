# S237 Parity runs can now require the build they claim to compare

S236 found my parity records naming a candidate version that was two rebuilds stale. The gap: nothing in
the harness pinned the identity of the binaries under comparison.

## The flags

    --expect-left-version <version>
    --expect-right-version <version>

`compare-release.mjs` reads `runtime.version` from each side's `/healthz` and **exits 2** on a mismatch,
printing what it actually saw. It also prints `identity left=… right=…` on every run, so a record can
quote it.

## Both directions, measured

Wrong expectation:

    FAIL identity: left is 0.0.20-231-gd61c32dc, expected 0.0.20-999
    exit=2

Correct expectations:

    node scripts/runtime/compare-release.mjs … \
      --expect-left-version 0.0.20-231-gd61c32dc --expect-right-version 0.0.20

    {"additive-shape":2,"same":6,"environment-state":1}   exit=0

## Why this is the right shape of fix

The earlier failure was not a bad measurement, it was an unverifiable label. Pinning the label in the
tool means the next reader can re-run the exact command from the evidence and get a hard failure if the
binaries moved - instead of comparing two different builds under an old name.

## Still open

- the CI compare step does not pass these flags yet (the left side is whatever the workflow just built,
  so pinning is a per-workflow decision);
- the reproduction command in `s234` should be updated to include the flags - the versions in it are now
  asserted rather than asserted-by-prose.