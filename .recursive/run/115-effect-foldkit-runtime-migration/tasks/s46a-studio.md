# S46a Studio surface: five workspace tabs with honest dispatch (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Studio is the last missing reference section. The reference (0.0.20 at :3456/app) implements it as five tabs; I captured the Images tab: `evidence/reference/reference-studio-images.png`.

## What the reference shows (measured)

- Studio has tabs **Chat / Images / Audio / Rerank / Advanced APIs**.
- Images: 'Image request modes' (Mode = OpenAI-style generation, Model picker, Prompt, Size 1024x1024), a **Run image request** button, and an **Image result stage** with GENERATED IMAGES plus a RAW RESPONSE pane showing `{"status":"No image request yet"}` before any run.
- Chat: 'Chat workspace' with model picker, request composer, results.

## Important measured fact

The reference runtime ALSO returns 200 text/html for `/v1/images/generations`, `/v1/audio/*`, `/v1/rerank`, `/v1/messages` - those endpoints do not exist in 0.0.20 either; the SPA fallback answered. Our packaged build now returns **404 JSON** for them (scoped fallback), which is the honest behaviour. So Studio must NOT claim those capabilities work: it dispatches and surfaces what the host returns.

## Required work

1. `/studio` route with the five tabs, each a real workspace: form fields that match the reference for that tab (mode/model/prompt/size for Images; model/prompt for Chat/Audio/Rerank; raw JSON body for Advanced APIs), and a RAW RESPONSE pane that stays visible with the last response or the explicit idle text (`No image request yet`-style per tab).
2. Dispatch: one command per tab, exact method/path/body asserted in tests (Chat POST `/v1/chat/completions`; Images POST `/v1/images/generations`; Audio POST `/v1/audio/speech`; Rerank POST `/v1/rerank`; Advanced POST `/v1/messages` or `/v1/embeddings` per mode).
3. Honest results: a 404/400 from the host renders the raw body and an error state - never a fabricated success or an invented image. A non-JSON body is surfaced as text, not parsed into fake data.
4. Chat must work end-to-end against a real host when one answers (the packaged runtime returns 400 without a configured provider - display it); if a fixture-backed upstream is available in tests, capture a real 200 and assert the rendered text.
5. States per tab: idle (raw response placeholder), loading (aria-busy, disabled submit), success, error (role=alert + raw body). Include a test that the submit button cannot double-dispatch.
6. Inventory: the studio rows flip to verified with named proofs, or stay absent with the reason. Record that the four non-chat endpoints are absent in the REFERENCE too.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s46a-*` with RED logs.

NO host changes (the 404s are correct), no recharts/ECharts, no new dependency, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only, never POST to 3456.

## Report
The tabs and their forms, the dispatch table (method/path/body), how a 404/400 renders, the chat end-to-end result, the fixtures, REDs, counts and typecheck.