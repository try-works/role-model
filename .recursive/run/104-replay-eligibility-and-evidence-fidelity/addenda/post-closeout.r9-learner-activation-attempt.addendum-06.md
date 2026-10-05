# Post-closeout addendum 06 — learner activation attempt and the shadow-owner gate

## What was tried
To produce the endpoint "operational profile" the comparison builder requires, the operator activation surface
was driven directly:
- POST /api/role-model/operator/learning/mode  (mode = production | active | enabled | shadow)
  → 409 "profile and knowledge activation is not supported by the supervised shadow owner"

## Finding
The learning-mode activation is hard-refused in the packaged runtime: the operations server's `setMode` is
hard-coded to throw `profile and knowledge activation is not supported by the supervised shadow owner`
(runtime-operations-server.mjs). This runtime is a "supervised shadow owner", so the learner's production
activation (and therefore the production endpoint operational profile) cannot be enabled from the operator
surface on this channel.

## Conclusion
The "finalized comparison carrying effortComparability" requires the endpoint operational profile, which requires
the learner's production activation, which this development-channel runtime hard-refuses. R9's plumbing, R8's
drain, the route-package capture, and the queue are all verified live; the single remaining item is a
production-channel learner activation that this runtime does not expose.
