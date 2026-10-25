# Goal round 3: persistent dispatch prerequisite

Status: implementation not started; active artifact00 Requirements remains DRAFT with Coverage/Approval FAIL.
Goal: goal-2c0895f6-f136-46f9-be3c-e351ae24300b (500-round cap), round3.

## Concrete blocking condition

The owner requires EVERY teammate/subagent use LLM provider deepseek/model deepseek-flash.
The exposed spawn_teammate schema still accepts only name/description/prompt/context, not a route override.
Read-only source recheck this round confirmed DSH tool-agent-team/src/index.ts:193-215 dispatches via configured
spawn/fork transport, while subagent child-agent.ts:60-84 inherits the latest parent request-time provider/model.
Creation-option model in list_agents does not establish request-time routing. This controller's current route
is not the requested exact deepseek/deepseek-flash route, and no supported per-team override is exposed here.
The same condition was recorded at initial startup and goal rounds1,2,3. No authorized route change or user
response to the configuration question was supplied. No implementation child was spawned on another model.
Shared task1 remains in_progress, with requirements/setup reviews task2/task3 dependent on it.

## Checks repeated, not new inference

- get_goal confirms roundsStarted3, cap500, objective incomplete.
- list_agents returns lead only. No required teammate or active managed background job is waiting.
- Current public HEAD f0d50fab083e3fe8daf2474cd9fb08b51066c8e1 and private16021cc5f87f60f2d01338a29adf0002da5e8327.
- git diff against both immutable bases remains empty for tracked product files; status only run artifacts.
- Source-proposal SHA256 remains870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c.
- No rerun of already-green baselines, operator/provider/runtime access or configuration mutation this round.

## Unblock actions

1. Owner uses supported session/team configuration to ensure deepseek/deepseek-flash child routing, then asks
   to resume. If switching parent session to that route, verify requested LLM provider and model, not spawn transport.
   Alternatively expose supported per-team route selection while retaining the controller route.
2. Controller verifies effective configuration BEFORE dispatch, creates model-verified team reviewers, inspects
   actual results and closes task1 only with evidence. No unauthorized other-model preflight call.
3. Independent requirements/source review then proceeds. E1/E2 scope decisions remain unresolved under source§16:
   include redesigned global journal/checkpoint/privacy protocol and all-live durable job/reconnect protocol,
   or owner-approved named follow-ons. Do not silently defer or claim them implemented.
4. Recreate canonical00-worktree only after00 Requirements locks, from preserved setup evidence and current checks.

## Completion truth

Frozen setup and focused/full selected baseline evidence are preserved in rounds01/02 receipts. They are NOT
migration completion. No phase1/2/3 advancement or product implementation. Blocking the automatic goal prevents
wasting further rounds on the same inaccessible configuration; goal must be resumed by direct owner instruction
once resolved, not marked complete.
