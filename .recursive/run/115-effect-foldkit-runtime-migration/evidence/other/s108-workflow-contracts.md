# S108 The CI wiring does not break the repo's own workflow contracts

Adding two advisory steps to `build-binaries.yml` was the riskiest edit of this session - a release workflow change can break promotion. The repo has its own workflow tests, so I ran the two that cover it:

| Suite | Result |
|---|---|
| `scripts/ci-workflow.test.mjs` (CI scoping, lanes, promotion guard, Turbo/ignored-file rules) | **11 / 11** |
| `scripts/build-binaries-workflow.test.mjs` (stage/production identity, Track B pairing, archive secret rules, tag acceptance) | **16 / 16** |

Both exit 0 **after** the edit. So the workflow still satisfies every structural contract the repository asserts, and my two steps sit where they claim to.

## What this does and does not prove

Proven: the steps are syntactically plausible, correctly placed, and broke none of the repo's workflow invariants.

Not proven: that GitHub Actions accepts the file and that the steps behave on a real runner. There is no YAML parser in this workspace (`pyyaml` absent, no `yaml` package), so a dispatch run is still the first true validation - which is exactly why both steps ship **advisory** until `vars.R39_VERIFY_BLOCKING` is set.
