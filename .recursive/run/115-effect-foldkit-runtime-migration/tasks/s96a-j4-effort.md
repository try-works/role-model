# S96a R17 J4 honoring: exercise an effort-capable endpoint against a mock (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
J4 has only ever been proven on its honesty half, because every endpoint in the fixture config declares no effort capability. The runtime DOES know effort levels - `OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX` at `index.ts:611+` publishes them for the `chatgpt/gpt-*` rows - so an effort-capable endpoint can be declared against a MOCK upstream.

## Method

1. Copy `testdata/router-runtime/fixtures` to a TEMP directory on E: (do not edit the repo fixture).
2. In the temp copy, declare one endpoint whose model is an effort-capable catalog row (e.g. `chatgpt/gpt-6.1-sol`, levels low/medium/high/xhigh/max) and whose upstream points at YOUR mock server.
3. Start the newest packaged executable with `--fixture-root <temp copy>` on an ephemeral port, fresh temp state.
4. Confirm the endpoint now advertises `reasoningEffortLevels` in `/api/role-model/endpoints` (if it still does not, the config path for effort is different - report exactly what you changed and what the host published, and stop).
5. Send `POST /v1/chat/completions` with `reasoning_effort: "high"` (or the documented field). Assert: 200, the mock received the request with the effort carried through in whatever form the provider contract uses, and the telemetry/decision readback records the effort (`reasoningEffort: high`, `effortSource` not `none`).
6. Also send an INVALID level (e.g. `ultra` when not published) and assert the host refuses it clearly rather than silently downgrading.
7. Classify honestly: PASS only if effort is carried end-to-end to the mock and recorded in readback.

## Evidence

`evidence/journeys/s96a/` script + logs, the temp fixture diff (the exact fields you changed), the mock's received payload, and `s96a-tdd.json` per assertion. Never POST to :3456; ephemeral ports and temp state only.

NO packaging, no installs, no commits, no subagents, no edits to the repo fixture.

## Report
The config fields that make an endpoint effort-capable, the level list published, the forwarded payload, the readback values, the invalid-level behaviour, and the honest classification.