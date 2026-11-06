# S50a Studio must use the vendored llama-swap backend (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Owner correction: Studio's image/audio/rerank requests are served by the **vendored llama-swap**, not by the runtime's own `/v1` surface.

## What I measured before writing this

- The legacy client posts to SAME-ORIGIN `/v1/images/generations`, `/v1/audio/voices?model=`, `/v1/audio/speech`, `/v1/rerank` (and `/v1/reranking`, `/v1/messages`), per `apps/runtime-ui/app/lib/runtime-api.ts`.
- The host registers only `/v1/models`, `/v1/chat/completions`, `/v1/responses` in its request handler (`index.ts:18233/18253/18412`).
- The host manages llama-swap as a vendor process (`startLlamaSwapVendor`, `currentLlamaSwapVendor`) and, when it is not running, returns 'Llama-swap is not running. Enable llama_swap in runtime config before loading a model.'
- In the packaged dev artifact llama-swap is INACTIVE (no `llama_swap.models`), so `/v1/images/...` currently 404s; on the reference `:3456` the same paths return the SPA fallback.

## Required work

1. DETERMINE the real routing (do not guess): does the host proxy unknown `/v1/*` to the llama-swap process, or does llama-swap listen on its own port that the client must call? Read the vendor package (`packages/vendor-llama-swap`), `startLlamaSwapVendor`, and how the runtime passes `/v1` paths to it. Report the exact mechanism with file:line citations.
2. Implement Studio to use that mechanism: same-origin `/v1/*` if the host proxies, otherwise the correct llama-swap base URL (discovered from the runtime, not hardcoded). Each tab's dispatch must hit llama-swap for images/audio/rerank/advanced.
3. If the host does NOT route those paths, add the minimal routing so the documented Studio endpoints reach llama-swap, and make the inactive-vendor case return the documented 'Llama-swap is not running...' error (503/409 JSON) instead of a bare 404.
4. Prove it end-to-end with llama-swap ACTUALLY RUNNING: build/use the vendored binary, start it with a minimal config in a temp root, and show Studio's audio (and images if the model supports it) returning a real response - or, where a real model cannot be served here, show the request reaching llama-swap and its honest error.
5. Never POST to :3456, never touch operator state or operator ports.

## Files
`apps/runtime-ui-next/src/**`, host routing only if item 3 requires it, tests, fixtures; evidence `s50a-*`.

NO new dependency, no packaging, no installs, no commits, no subagents; temp state on E: and removed.

## Report
The routing mechanism with citations, what Studio now calls per tab, the host change if any, the end-to-end proof with llama-swap running (or the precise blocker), counts and typecheck.