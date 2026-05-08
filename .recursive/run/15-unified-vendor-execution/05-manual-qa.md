Run: `/.recursive/run/15-unified-vendor-execution/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-08T00:07:16Z`
LockHash: `6b2fa1dd734871ba3586e4a38b82bf6fc2ed836a95efb1ec3d2f364fec2f9733`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/15-unified-vendor-execution/03-implementation-summary.md`
- `/.recursive/run/15-unified-vendor-execution/04-test-summary.md`
Outputs:
- `/.recursive/run/15-unified-vendor-execution/05-manual-qa.md`
Scope note: This artifact records the final agent-operated QA pass for the real-vendor closeout. The focus is the live bridge behavior an operator would observe: browser-visible health, real local and remote execution through the bridge, and the final recovery notes needed to explain the last live-only failure encountered during SP5.

## TODO

- [x] Re-read the implementation and test receipts
- [x] Exercise the live bridge in the browser
- [x] Exercise at least one real llama-swap-backed request path
- [x] Exercise at least one real LiteLLM-backed request path
- [x] Record the final live-only recovery notes honestly
- [x] Record outcomes and gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `main agent`
- Operator: `main agent`
- Environment: `local worktree at D:\DEV\role-model\.worktrees\15-unified-vendor-execution`
- Tools Used: `powershell`, `browser-use`, live bridge probes, session probe scripts

## QA Scenarios and Results

1. **Live bridge health and browser contract**
   - Steps:
      - start the live bridge on `http://127.0.0.1:8893`
      - open `/healthz` in `browser-use`
      - capture a screenshot and run the browser-side same-origin probe
    - Result: PASS
    - Notes:
      - the browser proof shows `status: "healthy"`, `executionMode: "hybrid"`, populated `vendors`, and `inactiveVendors: []`
      - the browser proof also confirms same-origin browser access to `/v1/models` and the routed `/v1/*` bridge surface

2. **Real llama-swap-backed local execution**
   - Steps:
      - send live `POST /v1/chat/completions` and `POST /v1/responses` requests to the bridge with model `local/llama-3.1-8b-instruct`
      - confirm the browser-side probe returns `local llama summary`
    - Result: PASS
    - Notes:
      - the final live local bridge path returned real content and usage data through the managed llama-swap vendor
      - one earlier closeout attempt failed because a stale external listener occupied port `5800`; after clearing that stale listener, the live local vendor path recovered and the refreshed browser receipt captured the correct local response

3. **Real LiteLLM-backed remote execution**
   - Steps:
      - send live `POST /v1/responses` and `POST /v1/chat/completions` requests to the bridge with model `openai/gpt-4.1-mini-fast`
      - confirm browser-side streamed chat also completes with `[DONE]`
    - Result: PASS
    - Notes:
      - the final live remote bridge path returned real content and usage data through the managed LiteLLM vendor
      - the bridge now forwards `x-role-model-cost-usd: 0.0042` on the real remote `/v1/responses` and `/v1/chat/completions` paths
      - the live repair here was vendor-owned: LiteLLM exposed cost in `x-litellm-response-cost`, so the managed vendor runtime now harvests that header when the proxy strips `_hidden_params`

4. **Real routing probe**
   - Steps:
      - run the session routing probe against the live run-15 registry and vendor stack
      - verify a local-preference chat routes to the llama-swap endpoint
      - verify a tool-capable chat routes to the LiteLLM-backed endpoint
    - Result: PASS
    - Notes:
     - the saved routing probe shows role/task capability selection between the local and remote endpoints
     - this complements the browser proof by showing the live routing core chose the expected vendor path before execution

## Traceability

- `R1` -> the agent-operated QA run exercised the unified-config-derived `hybrid` bridge state exposed by `/healthz`
- `R2` -> the recovered local cold-start and repeated live bridge probes depended on the repaired process-supervisor lifecycle and shutdown behavior
- `R3` -> the live local/remote probes and browser receipts exercised the shared vendor abstraction surfaces that the bridge dispatches through
- `R4` -> real llama-swap-backed local execution through `/v1/responses` and `/v1/chat/completions`
- `R5` -> real LiteLLM-backed remote execution plus live `x-role-model-cost-usd` verification
- `R6` -> browser-visible `/healthz`, routed bridge behavior, and same-origin `/v1/*` access through the live hybrid bridge
- `R7` -> manual QA consumed the same packaged/runtime-ready host path and asset/provisioning baseline validated earlier in Phase 4, confirming the live operator-facing surface still matched the packaged-runtime contract
- `R8` -> agent-operated live QA proof of local/remote routing behavior, browser-backed execution, and honest recording of the recovered port-`5800` operational issue

## Evidence and Artifacts

- `/.recursive/run/15-unified-vendor-execution/evidence/browser/run15-real-vendor-healthz.png`
- `/.recursive/run/15-unified-vendor-execution/evidence/browser/run15-real-vendor-browser-probe.json`
- `/.recursive/run/15-unified-vendor-execution/04-test-summary.md`
- `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\files\run15-real-vendors\inspect-live-capture-output-pass1.json`
- `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\files\run15-real-vendors\inspect-live-capture-output-pass2.json`
- `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\files\run15-real-vendors\probe-live-routing-output.json`

## User Sign-Off

- QA mode is `agent-operated`; no human sign-off was requested for this phase.
- Agent sign-off: PASS

## Coverage Gate

- `R4`: covered by the real llama-swap-backed local bridge execution and browser receipt
- `R5`: covered by the real LiteLLM-backed remote bridge execution, streamed browser probe, and live cost-header verification
- `R6`: covered by the live hybrid `/healthz` contract and routed bridge execution
- `R8`: covered by the combined live browser proof, direct live probes, and routing probe artifacts

Coverage: PASS

## Approval Gate

- [x] Manual QA confirms the live hybrid bridge exposes the expected operator-visible contract
- [x] Manual QA confirms at least one real llama-swap-backed request path and one real LiteLLM-backed request path
- [x] Manual QA and browser receipts now reflect the final live state honestly, including the recovered local startup collision

Approval: PASS
