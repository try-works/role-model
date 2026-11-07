# S677 - R32 private Layers + capture->queue->projection cross-repo proof (818 build)

Date: 2026-11-07. Build 0.0.20-818-g9ff48b98 (exe 19f0371f...), track-b manifest e1d678a8...,
13 extensions, managed keys provisioned.

## Cross-repo construction (provenance)
- Private distribution built from the private worktree at private HEAD b4688938 (the S671 P0/P1 fixes:
  drain claim/ack, archive-trim retention, close/flush, two-phase CAS, disposition CAS; plus projection
  generation/persist 223c82af and replay lease 423f439d):
  {"status":"PASS","extensionCount":13,"sidecarSha256":"73243d73..."}.
- Public package-sea staged that private distribution into the packaged release:
  track-b-runtime/ staged, manifest e1d678a8f8c59c68754a411423c1c6824313febae98eb460b94ce248d27acb9b.

## Live chain proof on the packaged exe
- Capture -> queue: the replay.dispatch queue processed real requests (queue status: completedRecent 13 at
  first check; replay budget advanced to 9 counterfactuals / 18 dispatches with limits 100/300).
- Queue -> projection/evidence: /api/role-model/operator/evaluation/jobs returns 12 real evaluation jobs
  whose cases carry evidenceRef artifacts (sample artifact:22a575aef7ee1b431a234d7e0016621ab47744a841be33db7911320a0299a527)
  for candidate deepseek.personal.deepseek-api-key.global.deepseek-v4-pro.
- Projection -> learning: knowledge worker available, 10 candidates / 10 indexed documents,
  fenceGeneration 35 (sqlite_fts5_bm25 backend).
- Durable evidence authority active: track-b auto-replay ticks report outcome ok (the managed-key
  binding resolves), i.e. the private Layers are live inside the packaged public exe.

## Bound
The proof is end-to-end at the API/readback level with real captures and real evaluation/learning data.
Individual graph node/edge IDs for one capture were not walked; the evidenceRef artifacts and the replay
budget/dispositions carry the linkage.
