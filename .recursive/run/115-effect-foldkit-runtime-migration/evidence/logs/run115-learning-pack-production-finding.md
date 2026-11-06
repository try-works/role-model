# Run 115 — how 0.0.20 produces learning packs from the replay queue

## Preserved 0.0.20 evidence
- track-b-runtime/extensions/knowledge-worker.mjs:62242-62293 builds a pack candidate from a
  finalized comparison candidate: packCandidates are read from the candidate, a packId is derived
  from the candidate/receipt/version/scope identity, and the resulting packCandidate is recorded.
- track-b-runtime/extensions/replay-core.mjs:2164-2216 requires candidate packages and projects the
  replay job; replay jobs are the source of the comparison.
- track-b-runtime/runtime-operations-server.mjs:79877-79880 exposes activateLearningPack /
  rollbackLearningPack as operator actions. Activation is an operator decision, not automatic.

So in 0.0.20 packs are NOT produced by the replay queue directly. The chain is:
auto replay job -> replay branches -> evaluation comparison finalized -> knowledge worker builds
packCandidates/validation records -> operator activates a pack.

## Current source (same behaviour)
- track-b-learning-pass.ts:1-20 documents the replay -> evaluation -> signals chain and says the pass
  turns already-durable finalized evidence into validation receipt/experience pack records; it never
  dispatches a provider call itself.
- track-b-runtime.ts:11095-11100 calls runTrackBLearningPass automatically after a finalized
  comparison.
- track-b-contract-emission.ts:127-150 builds ExperiencePackCandidateV1.
- cli.ts:6602 and track-b-learning-pass.ts:1920 emit the candidate; activation remains the
  operator route (activateLearningPack).

## Conclusion / missing arms
Once an auto-queued replay completes and its evaluation comparison is finalized, the learner pass
produces the pack candidate automatically; no additional arm is required by the replay queue.
Packs do depend on (a) a finalized comparison with the policy's holdout/decisive evidence and
(b) the learner derive/promote queues or sweep running; activation stays operator-driven.
The observed empty Learning packs page in earlier runs was because zero replay jobs were queued
(the finding in routing-alias-replay-learning-*.log), not because packs need another arm.
