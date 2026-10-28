# s426 — Private packaged operator handshake repair

Status: verified-bounded (independent S429 PASS; private commit ac809d31; whole R32 remains open)
TDD Mode: strict
Inputs: S420 audit reports, original00-requirements/source-proposal/02-plan/00-worktree, owner E1/E2 decision. Patch basis public71151644/privatea86ea7a9; no baseline switch.

Expected write scope: PRIVATE scripts/track-b/private-layers.mjs packaged operator handshake and shared validation only; tests/track-b/run115-b9-operator-handshake.test.mjs plus affected existing handshake/operator tests. No private runtime-operations-server modifications unless stop/report; no public product edits.

Read S420 private audit and R32 original requirements. Strict behavioral RED before product edits. Operator boundary must reject incompatible protocol/descriptor versions and missing required operator capability before factory invocation, using real existing manifest contracts (not hard-coded invented capabilities). Preserve null/no-manifest semantics honestly; test invalid versions/capability skip factory; accepted evidence not ready until actual factory/process success, no ready:true after failure. Preserve digest verification authority at real factory. Run real-factory tests where existing harness permits. This is bounded boundary repair not full R32. No provider calls/processes on protected ports. Read private AGENTS/recursive spec/effect skill.

Coordination: only listed scopes; all peers share filesystem. Read current files before edit; prefer edit, no whole-monolith scripted rewrites or checkout/reset. No formatter on shared files. No commit. Before substantive work verify live deepseek-flash via list_agents; report mismatch. Evidence run logs s426-red/green.log; report actual counts, hashes, tsc/syntax, anti_slop_lint filesScanned>0. Keep existing operator3456/3457/3458/state untouched; os.tmpdir disposable roots. Independent review must be different member after freeze. No whole-feature COMPLETE.
