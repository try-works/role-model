Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `05 Manual QA`
Addendum: `05-manual-qa.upstream-gap.00-requirements.addendum-02`
Status: `LOCKED`
LockedAt: `2026-08-07T09:46:35Z`
LockHash: `1f46541378f2a108aa5f251e35f4c6276aa617f0df40e5373aa4adfc38ee2250`
Workflow version: `recursive-mode-audit-v2`
QA Execution Mode: `hybrid`
Inputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED) — `OOS2`, Extensibility `openai_base_url` / native picker merge
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-01.md` (DRAFT)
- User request (2026-08-05): use signed-in `openai_base_url` / merged-catalog pattern to **retain ChatGPT history**
- Evidence: DeepSeek-style `forced_login_method=api` + custom provider hid ChatGPT session group; user restored pre–role-model config
- Reference: https://github.com/duolahypercho/codex-router (signed-in `openai_base_url` + merged native catalog; native GPT → `https://chatgpt.com/backend-api/codex`)
Outputs:
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-02.md`
Scope note: Supersedes addendum-01’s “no `openai_base_url`” rule. Authorizes codex-router **signed-in** integration: root `openai_base_url` → local adapter, merged native+role-model catalog, keep ChatGPT auth (do not force API login), dispatch native GPT to ChatGPT Codex backend and role-model ids/aliases to the role-model runtime.

## TODO

- [x] Record history-loss root cause (API login session group split)
- [x] Authorize signed-in `openai_base_url` + merged catalog + native dispatch
- [x] Implement under strict TDD (config, catalog merge, forwarder dispatch)
- [x] Update docs/skill; do not write user Codex home until user asks
- [x] Fold into Phase 5 / human verify (history retained + GPT models + role-model route; operator sign-off 2026-08-07)

## Gap

Addendum-01’s DeepSeek-style custom provider + `forced_login_method=api` made role-model aliases visible but **split session history** and replaced the native GPT catalog. User required revert.

History retention requires staying on ChatGPT auth. codex-router’s signed-in path keeps ChatGPT login, sets root `openai_base_url` to the local router, and merges native GPT models with external models. The router forwards native GPT to ChatGPT’s Codex backend and external models to the selected provider.

## Amendment (authoritative; supersedes addendum-01 §1–2 / §4 where they conflict)

1. **Now in scope:** signed-in root `openai_base_url` pointing at the local adapter (`http://127.0.0.1:<adapterPort>/v1`), plus `model_catalog_json` absolute path to a **merged** catalog.
2. **Must not** set `forced_login_method = "api"` or `preferred_auth_method = "apikey"` in the managed block (those switch the ChatGPT session group and hide histories).
3. **Must not** set `model_provider = "role-model"` as the signed-in default; leave the built-in OpenAI/ChatGPT provider path and hijack via `openai_base_url` only (inert optional `[model_providers.role-model]` table allowed only if it does not become the active provider).
4. **Merged catalog:**
   - Include full native Codex models from captured/bundled native list (preserve GPT display names, priorities, `base_instructions`).
   - Add role-model picker targets (selected strategy + configured `type: "model"` ids) as additional `visibility: "list"` entries with canonical role-model slugs/display names (signed-in merge; not login-free slot-stealing by default).
   - Keep canonical role-model ids resolvable; DeepSeek-valid `truncation_policy.mode` + required template fields on every entry.
5. **Forwarder dispatch:**
   - If request `model` is a role-model discovery id or mapped via `native-aliases.json` → remap if needed → inject intent → proxy to role-model runtime.
   - Otherwise → proxy to ChatGPT Codex native Responses base (`CODEX_NATIVE_BASE_URL` default `https://chatgpt.com/backend-api/codex`) forwarding allow-listed Codex/ChatGPT auth headers from the inbound request.
6. **Remote Compact:** still no `/v1/responses/compact` implementation; return 404. Document that Compact v2 against the hijacked base URL is unsupported; local compaction path remains.
7. **Uninstall:** remove managed `openai_base_url` + `model_catalog_json` keys and restore prior unmarked values when snapshotted; never delete `auth.json` or session stores.
8. **Addendum-01** native-slug login-free overlay remains available as an optional future mode, but **signed-in merge is the default ship path** for Desktop history retention.

## Traceability

| ID | Effect |
| --- | --- |
| `OOS2` | Superseded for run 89: signed-in `openai_base_url` + merged catalog now in scope |
| Addendum-01 | Partially superseded (no-`openai_base_url` / API-login custom provider default replaced) |
| `R2` / config | Managed block writes `openai_base_url` + catalog; no API-login force |
| `R3` / forwarder | Dual upstream: ChatGPT native vs role-model |
| `R8` / docs | History-preserving install; ChatGPT vs API session note |
| `R11` | Desktop verify: histories visible + native GPT selectable + role-model route via adapter |

## Earlier Phase Reconciliation

- Do not edit locked Phase 0–4 artifacts.
- Effective requirements for remaining Phase 5 = locked `00-requirements.md` + addendum-01 + **this addendum-02** (02 wins on conflicts).

## Audit Context

Audit Execution Mode: self-audit
Subagent Capability Probe: available
Delegation Decision Basis: self-audit — user-directed architecture switch with measured history-loss evidence

## Audit

Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
