# S142 I tried to reach the stage branch locally. The identity guard refused - correctly.

The packaged-runtime and extension slices are behind `if (packagedReleaseId)`, which a dev package never satisfies. So I built a **stage-shaped** artifact to try to execute them:

```
ROLE_MODEL_BUILD_CHANNEL=stage
RUN88_RELEASE_ID=sha256:27e4fbf1...        # this distribution's own manifest sha256
ROLE_MODEL_RELEASE_OUTPUT_ROOT=E:/rm-tmp/stage-test-release
-> role-model-stage.exe  sha256 e3181d50...
```

The identity value is real (the hash of the actual private distribution), not invented, and the output goes to a separate root so it cannot be mistaken for a promotable candidate.

## It got further than a dev package, and then the guard spoke

```
FAIL: health did not become ready on port 49452 (child exited 0)
  runtime backend initialization failed
  Error: Track B packaged startup writer context does not match manifest context
```

Two facts come out of that single line:

1. **The packaged branch is reachable** when a release id is present - the process reached `negotiatePackagedTrackBStartup`, which a dev-channel package never does. That is the first runtime evidence that S130's branch is entered at all.
2. **The identity guard refuses a locally synthesized stage pairing**: a stage package requires a distribution built for the stage writer context, and `build-runtime-distribution.mjs` produces the development context (rebuilding it with `ROLE_MODEL_BUILD_CHANNEL=stage` produced the same development distribution).

## Conclusion, and what I am not going to do

Verifying the packaged/extension slices at runtime needs a **real stage or production build from the release pipeline**, with the accepted-candidate context the pipeline supplies. I could keep synthesizing identities until something binds, but every step after this one would be constructing a fake accepted candidate - and the whole point of the guard that just fired is to prevent exactly that artifact from existing.

So S130/S133/S134 stay type-checked and guarded, not runtime-verified, and R27 stays blocked with a precise reason rather than a hopeful one.

## Cleanup

The stage-shaped build lives under `E:/rm-tmp/stage-test-release` only; the worktree's own `dist/release` still holds the dev candidate used by the packaged gate.