# S480 — skip Run88 identity validation on development channel

Status: pending
TDD Mode: strict
Public basis ae7f8a3e; private b8733789.

Root cause (probe after S478): packaged dev exe now boots past markReady but runPackagedBackend throws "private distribution channel mismatch" immediately - cli.ts:11889-11901 calls validateRun88PrivateDistributionIdentity with identity.channel = packagedProfile?.channel ?? "development" against expected.channel hardcoded "stage" (kw-private-loader.ts:34-44). The S450 plan says development does NOT require the Run 88 identity (stage/prod do, with RUN88_RELEASE_ID). This stage-only gate runs unconditionally in the packaged branch.

Repair (PUBLIC src/cli.ts ONLY + test): invoke validateRun88PrivateDistributionIdentity only when a Run 88 release id is present (packagedReleaseId !== undefined, the stage/prod path); on development skip the identity check and proceed with the distribution the manifest already binds. Keep stage/prod behavior byte-identical (same expected channel stage + manifest sha + generation rules).

Strict RED first: a packaged-branch test (existing seams) with packagedReleaseId undefined and a development-channel distribution asserts runPackagedBackend proceeds without the channel-mismatch throw; today it throws. Then minimal wiring; host tsc + UI tsc + cli-startup-readiness/s478/s475/s120/run96 suites + nonempty lint; freeze hashes; independent review by s9b-eventlog; no commit. No whole R36-R39 claim.
