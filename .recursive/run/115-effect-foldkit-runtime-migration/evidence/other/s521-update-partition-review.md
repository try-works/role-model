# S521 independent review — S520 update-dispatch partition

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hash verified

- `src/update.ts` = `E83D71EFE38CA70A530101FA5AA24B65FFDFC7A3C2B49E342FC798B2B62FC767`, 80235 B (match).

## Verdict: bounded PASS (with one accuracy correction)

## Handler partition

- Six ordered groups with the exact counts: `shellHandlers` **12**, `remainingHandlers` **47**, `deviceAuthHandlers` **13**, `requestsRankingHandlers` **6**, `learningRankingHandlers` **3**, `endpointActivationHandlers` **7** = **88**.
- 88 keys are unique (no duplicate tag), so `Message.match` resolves each message to exactly one handler and first-match precedence is unchanged even though the groups are concatenated rather than globally first-appearance ordered.
- Parent `createUpdate` remains the composition root: the groups are spread into `handlers` and passed to one `Message.match` (`update.ts:1501-1509`); command dependencies are still closure parameters.
- Handler bodies are moved verbatim with added `Extract<Message, {_tag}>` annotations; no command/state logic rewritten. No test edits (`git status` shows only `src/update.ts`).

## Accuracy correction (non-blocking)

- **Global first-appearance order is not preserved.** The concatenation is shell → remaining → deviceAuth → requestsRanking → learningRanking → endpointActivation, while the old object interleaved those tags. I verified each group’s internal sequence matches the old relative order (shell 12, remaining 47, device 13, requests 6, learning 3, endpoint 7), and all 88 tags are unique, so behavior is unaffected. If “original first-appearance order” was intended literally across the whole object, the claim is inaccurate; if it means per-group order plus no duplicate precedence, it holds.

## Compensation evidence

- 7 unchanged suites: **61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- Packaged `audit-rendered-ui` (`s520-audit.log`): **20/20 routes PASS**, failures 0 (final6 exe + rebuilt static + fixture root + fresh state).
- anti-slop effect:true `update.ts`: **10 findings = HEAD baseline**, zero added-line.
- `s520-green.log` records pragmatic RED=N/A rationale.

## Non-blocking notes

- The 47-handler `remainingHandlers` group is still large; the S512 design’s family split is only partially realized (requests/learning/device/endpoint extracted; controller/readbacks/overview/runtime/studio/provider/local-policy/chart remain together). That is within this slice’s stated scope but not full per-family partitioning.
- No whole Workspace claim; cleanup slice and final sealed rebuild remain future work.

