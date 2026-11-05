# S638 - Benchmark progress/result honesty + real-credential testing + Connect fix (goal-5b900590)

## Final artifact
0.0.20-665-g187e89f7 (HEAD 187e89f7), sha256 ef5e0c6a4aabfc771f866f968ab3c179211e7367108599d6b128c1273faca309 - CHANGED vs 771063c4. verify-packaged-candidate PASS. UI suite 118 files / 1012 tests PASS, exit 0. Live on 127.0.0.1:3480.

## 1. Run progress/result parity (:3456) - 3a4669ba, e79621b8, d237ceac, 187e89f7
- Progress panel: reference phase wording (Phase 1 of 3 Recording responses / Phase 2 Judge grading / Phase 3 Head-to-head compare/Complete), percent bar, steps + endpoint/case context, live outcome when the host sends it.
- Terminal honesty: a completed run whose cases failed renders "0/N cases executed - N failed" with the first case rationale/actualPreview/judgeError; never a green completed state.
- Run history: View details -> GET /benchmark/runs/<id> (nested result unwrapped) -> status/outcome, per-endpoint scores, passed/failed counts and a per-case table (score, PASS/FAIL, rationale, actual preview, judge error).
- Outcome contract (task-125, 7f649f4d): host serves caseCounts {total,passed,failed} and outcome "passed"|"partial"|"failed"|null (null when total=0) on runner result, active progress, runs list and summary; UI shows OUTCOME column + PASSED n/total in history, "Outcome: partial" in progress, "completed - outcome partial - 10/24 cases passed - 14 failed" in detail, and "pending" (never passed) when nothing executed.

## 2. Real DeepSeek credentials, no fakes in review (05812aaf, 1e057775)
- Review root ui-review25 contains ONLY real deepseek.* endpoints (4 flash effort slots + v4-pro/v4.1 slots) and only the deepseek account; review.*/mock.* accounts and endpoints deleted, mock/review seeders moved to scripts/runtime/dev as opt-in dev scripts (not part of the default review seed).
- Real run 29cb3194-3ca4-4230-9c50-aee327275e0b: subjects deepseek-flash-low + high, judge deepseek-flash-max; live UI Phase 1..3 -> Complete 60/60, "Outcome: partial", "10/24 cases executed - 14 failed", both endpoints 42%; history OUTCOME=partial PASSED 10/24; detail headline "completed - outcome partial", 24 rows, 10 PASS / 14 FAIL.
- Credential scan on the packaged exe, release build/client and evidence tree: sk-key 0 hits, bearer-token 0 hits, api-key-assignment 3 false positives (header/form label), MOCK_API_KEY only as an identifier in historical docs (no value). No secret printed.

## 3. Connect: add models to a saved provider account (28a4aced, 7e63fcd9)
- Root cause: activationBatchId was "activation-<counter>", reused across different payloads; host binds one payload per batch id ("Activation batch activation-3 was already bound to a different payload").
- Fix: activationBatchId = "activation-<token>-<FNV-1a payload digest 8hex>"; host path POST /api/role-model/endpoints/batch appends endpoints for an existing account and is idempotent per batch id.
- Verified live: account allowedModels extended with deepseek-flash + deepseek-v4.1-flash + deepseek-v4-pro; batches 3792e475... (v4.1-flash) and f704b8b3... (v4-pro) committed with distinct ids, no collision.
- Tests: s638 3/3, s401 11/11, s404 9/9; fake host binds id->payload and accepts two consecutive saves; RED with old id.

## 4. Duplicate chart-series crash (63da0f7e)
- Root cause: ranking rows keyed by display label; endpoints sharing "Gpt 5.4" produced duplicate x positions and TanStack threw.
- Fix: dedupe ranking rows by unique key (endpoint/model id), suffix equal labels with the key, keep both series. Verified live on 665 where four deepseek-flash effort slots share a displayName: /requests 9 charts / 9 sr-only / 0 visible and /observe/routing 9 charts / 0 visible, no crash. s639 RED->GREEN 2/2.

## Evidence
- 1e057775 review-0.0.20-665-g187e89f7/ (identity, run JSONs, DOM JSONs, PNGs, secret-scan, connect batches, regressions, real-deepseek-investigation/README).
- 1c98dc21 real-DeepSeek evidence + purge note + scan; 05812aaf seeder move; t121/t123/t124/t126/t127 logs.

## Notes
- My own run 216af610 (posted while the build lane was mid-verification) left only responses in its artifact dir: an interrupted run record. The lane reproduced 269677f4 completing after 136s with outcome partial and full manifest; the runs list is empty while a run is active and lists terminal runs only - recorded as an observed contract quirk, not a crash.
- Residual: the reference's full :3456 benchmark panel layout may still differ in cosmetics; outcome/case-level content is now present and honest.
