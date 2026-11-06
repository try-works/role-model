# S640 - Routing alias naming consistency + final 676 artifact (goal-6b4e12b5)

## Final artifact
0.0.20-676-g29dfe8ea (source HEAD 29dfe8ea, includes alias fix 8721b900 and the DeepSeek structured-output fix 26f21e01), sha256 72c9b1ad2f34593fa6dd2fcced4b6b78998fe0011a86561308b70c8ea26dce2f - CHANGED vs 45d045f1. verify-packaged-candidate PASS. UI suite 119 files / 1014 tests PASS. Health healthy. Root ui-review27 contains only real DeepSeek endpoints; no review.*/mock.*.

## Root cause (owner: "one page says remote-only another says remote_only")
router-family-view.ts:237 rendered "Current active alias" as activeAlias + "." + executionMode, i.e. strategy + the API execution-mode token (remote_only), producing baseline.remote_only. Every real alias id uses the hyphenated suffix mapping in unified-runtime-config.ts (primaryRoutingAliasExecutionSuffixes: decision-only / local-only / remote-only / hybrid), so the inventory has baseline.remote-only; the fabricated id resolved to no pool (chat request returned 400 no_eligible_target). Two distinct concepts - execution MODE token (remote_only) vs alias ID slug (remote-only) - were conflated.

## Fix (8721b900, 29dfe8ea)
- Overview prefers the router readback profile row labelled alias/activeAlias when present.
- Otherwise it resolves the persisted strategy + execution mode against the runtime-config alias inventory using the documented hyphenated suffixes (exact alias-id match only).
- Never concatenates the execution-mode token into an alias id; no inventory match shows the strategy id as an unresolved alias.
- Added a separate "Execution mode" stat so the mode is labelled as a mode, not part of the alias.
- Tests: s641 regression (executionMode remote_only + inventory baseline.remote-only renders baseline.remote-only, never baseline.remote_only; readback alias row wins), RED t130-alias-red.log -> GREEN 2/2; s530 still green; tsc 0; full suite 119/1014; S247 4/4.

## Verification on 676 (adb9049e)
1) /router Overview: CURRENT ACTIVE ALIAS = baseline.remote-only (hyphen), separate EXECUTION MODE = remote_only; inventory ids hyphenated; DOM contains no fabricated strategy.execution_mode alias. Lead check confirmed the same via DOM text.
2) Real routing alias request: POST /v1/chat/completions model baseline.remote-only with json_schema response_format -> 200, routed to deepseek/deepseek-flash, valid JSON; telemetry req-b7c1a381... requested baseline.remote-only -> selected deepseek/deepseek-flash, success.
3) Real benchmark: runId 4c970a25-8a08-49a6-b3cf-47895bdf91d4 (deepseek-flash-low + high subjects, max judge) -> completed, outcome PARTIAL, 22/24 passed (low 0.7042 11/12, high 0.7750 11/12). Both failures are grounded_truth_mismatch on h08-multi-turn-tool-refine - genuine benchmark misses, not transport errors. UI history OUTCOME=partial PASSED 22/24; detail 24 rows, 22 PASS / 2 FAIL.
4) Regressions: /requests 9 charts (9 sr-only, 0 visible), /observe/routing 9 charts, /observe/queues renders Queues, sidebar rail models present.

## Secret scan
2737 files (exe + release client + evidence): sk-key 0, bearer-token 0; api-key-assignment 3 false positives (x-api-key header/form label); MOCK_API_KEY identifier only in historical docs, no value.

## Evidence
- adb9049e review-0.0.20-676-g29dfe8ea/ (identity, alias DOM+PNG, alias request transcript, benchmark run JSON, UI detail, regressions, secret scan).
- 8721b900 + 29dfe8ea (alias fix + packaged evidence); s639 closeout covers the DeepSeek structured-output fix.
