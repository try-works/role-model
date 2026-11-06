# Final review verification — 0.0.20-665-g187e89f7

Build: clean detached review-src20; private distribution PASS; package-sea PASS;
verify-packaged-candidate PASS. exe sha256 ef5e0c6a... (changed vs 771063c4).
Host PID 32088, :3480, only real DeepSeek endpoints (no review.*/mock.*).
Suite: 118 files / 1012 tests PASS.

## Real DeepSeek run
runId 29cb3194-3ca4-4230-9c50-aee327275e0b
subjects deepseek-flash-low + deepseek-flash-high, judge deepseek-flash-max, quick.
Live UI samples: Phase 1 2% 1/60 -> ... -> Phase 3 60/60, terminal "Outcome: partial",
"10/24 cases executed — 14 failed", both endpoint scores 42%. Run history has OUTCOME=partial
and PASSED 10/24; detail headline "completed · outcome partial", 24 rows, 10 PASS/14 FAIL.

## Connect second model
Updated account allowedModels to add deepseek/deepseek-v4.1-flash and deepseek/deepseek-v4-pro.
POST /api/role-model/endpoints/batch twice with distinct activationBatchId values:
3792e475-b8f6-4439-a984-6b4a06bf92db -> v4.1-flash committed
f704b8b3-1e4f-4da3-9a43-6f3ae1d461a4 -> v4-pro committed
No "already bound to a different payload" error. Account has 3 allowed models; endpoints are all
deepseek.* only.

## Duplicate displayName
Four deepseek-flash effort slots share displayName "DeepSeek V4.1 Flash"; /requests and
/observe/routing both render 9 charts, 9 sr-only tables, 0 visible, no crash.

## Credential scan
node scripts/runtime/scan-credential-material.mjs <exe> <release build/client> <evidence tree>
sk-key 0; bearer-token 0; api-key-assignment 3 false positives (x-api-key header / form label);
MOCK_API_KEY appears only as an identifier in historical docs, no value.

## Lead run 216af610
Artifact dir exists with only responses (no manifest/result) => interrupted run record. Reproduced
269677f4 completed 136s later with outcome partial and full manifest/result; runs list is empty
while active and lists terminal runs only. See real-deepseek-investigation/README.md.
