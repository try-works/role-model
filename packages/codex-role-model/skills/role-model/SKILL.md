---
name: role-model
description: Connect Codex to a local role-model runtime via the codex-role-model adapter.
---

# role-model (Codex)

Use the `@try-works/codex-role-model` CLI to point Codex at a local role-model runtime.

## Setup (signed-in — keeps ChatGPT history)

1. Start the role-model runtime (default `http://127.0.0.1:3456`).
2. Run `codex-role-model setup` (writes `openai_base_url` + merged catalog; does **not** force API login).
3. Run `codex-role-model start` (adapter on `http://127.0.0.1:3460/v1`).
4. Fully quit and reopen Codex so it reloads user-level config.
5. Native GPT models stay in the picker; role-model strategy/model ids are added in the merged catalog. Select a role-model id for routed turns; GPT models still go to ChatGPT via the adapter.

Never paste API keys or bearer tokens into chat.

## Important truths

- Provider keys are written only to **user-level** Codex config (`$CODEX_HOME/config.toml`). Project `.codex/config.toml` cannot set `model_providers` / `openai_base_url`.
- Default signed-in mode preserves the ChatGPT session group. Do not set `forced_login_method=api` unless you accept hidden ChatGPT histories.
- Codex hooks do **not** inject `role_model.intent`; the local adapter does on role-model-routed `POST /v1/responses`.
- Compaction is **Codex-managed**. This adapter does not implement `/v1/responses/compact`.

## Diagnostics

- `codex-role-model doctor`
- `codex-role-model status`
- `codex-role-model explain latest`
