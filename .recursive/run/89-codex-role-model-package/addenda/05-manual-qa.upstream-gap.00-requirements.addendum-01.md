Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `05 Manual QA`
Addendum: `05-manual-qa.upstream-gap.00-requirements.addendum-01`
Status: `LOCKED`
LockedAt: `2026-08-07T09:46:35Z`
LockHash: `01225ffd034ead57de1879684a055cb3f73b326c5ae7517e2785a036024d854b`
Workflow version: `recursive-mode-audit-v2`
QA Execution Mode: `hybrid`
Inputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED) — `OOS2`, `OOS13`, Fixed Decision #4, Extensibility row `openai_base_url` / native picker merge
- `/.recursive/run/89-codex-role-model-package/05-manual-qa.md` (DRAFT)
- User approval (2026-08-05): authorize login-free native-slug aliasing; picker must expose currently selected routing strategy alias + individual configured model ids
- Reference: https://github.com/duolahypercho/codex-router (`native-alias.mjs`, `buildLoginFreeCatalog`)
- Evidence: Codex Desktop empty picker; bundled native list slots via `codex debug models --bundled`; openai/codex#19694
Outputs:
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-01.md`
Scope note: Phase 5 upstream-gap amendment authorizing a **narrow** Desktop picker workaround: republish selected strategy + configured model ids under allowlisted native GPT slugs in `model_catalog_json`, remap in the adapter, **without** root `openai_base_url` hijack.

## TODO

- [x] Record Desktop picker root cause vs locked `OOS2` / extensibility table
- [x] Capture user-approved amendment (selected strategy + configured model ids)
- [x] Implement under strict TDD in package (catalog + native-aliases + forwarder remap + absolute catalog path + visibility `list`/`hide`)
- [x] Refresh live catalog; document restart; verify catalog shape for Desktop
- [x] Fold into Phase 5 receipt / human sign-off path (operator sign-off 2026-08-07)

## Gap

Locked `00-requirements.md` marks `OOS2` as root `openai_base_url` hijack / native GPT catalog merge, and the extensibility table requires an explicit new run or addendum before native picker merge (Remote Compact v2 risk).

Phase 5 Desktop observation: ChatGPT/Codex Desktop model menu only lists server-allowlisted native GPT slugs with `visibility: "list"`. Custom provider catalog entries using role-model alias/model slugs (and our golden `visibility: "listable"`) do not appear — matching codex-router login-free rationale and openai/codex#19694.

CLI live routing already works with canonical alias ids. Desktop picker emptiness blocks the preferred Desktop half of hybrid QA.

## Amendment (authoritative for remaining Phase 5 work)

1. **Still forbidden:** writing root `openai_base_url` (full codex-router hijack path remains out of scope).
2. **Now in scope for run 89:** login-free-style **catalog native-slug republish** under DeepSeek-style `model_providers.role-model`:
   - Capture/use native list slots (`visibility: "list"`) from Codex bundled/native catalog.
   - Assign picker-facing entries in priority order:
     1. currently selected routing strategy alias (`config.toml` `model` / alias-store / setup default),
     2. individual configured discovery models (`type: "model"`),
     3. stop at available native list slot count (do not invent extra strategy fillers).
   - Listed entries keep native `slug` + priority; `display_name` (and description when present) show the role-model id.
   - Canonical role-model ids remain in the catalog with `visibility: "hide"` so CLI/`-m` and doctor keep resolving them.
   - Persist `native-aliases.json` (`version: 1`, `aliases: { nativeSlug: externalId }`).
   - Forwarder remaps request `model` native → external before intent inject / upstream proxy.
   - `model_catalog_json` uses an **absolute** path; catalog visibility uses Codex `list` / `hide` (not `listable`).
3. **`OOS13` clarification:** native GPT slugs are **transport picker aliases only**. They are remapped before upstream and must not become valid canonical discovery ids under provider `role-model` for doctor/guidance.
4. **Remote Compact risk:** unchanged — no `openai_base_url`, `supports_websockets` stays false, no `/v1/responses/compact`. Re-evaluate only if a later run adopts root URL hijack.
5. **Docs/skill:** Desktop picker expectation updates from “Custom only / filtered” to “native-slug aliased selected strategy + configured models; restart Codex after refresh-catalog”.

## Traceability

| ID | Effect |
| --- | --- |
| `OOS2` | Narrowly superseded for **catalog native-slug republish + remap only**; root `openai_base_url` remains OOS |
| `OOS13` | Clarified: native slugs are remapped transport aliases, not canonical role-model ids |
| `R2` / catalog | Catalog schema + visibility + absolute path |
| `R3` / forwarder | Native→external remap on `/v1/responses` |
| `R8` / docs | Desktop picker UX text |
| `R11` | Desktop preferred matrix can use aliased picker entries |

## Earlier Phase Reconciliation

- Do not edit locked Phase 0–4 artifacts.
- Phase 5 treats this addendum as effective requirements input for the Desktop picker fix.
- Implementation remains strict TDD with RED/GREEN evidence under `evidence/logs/phase5/`.

## Audit Context

Audit Execution Mode: self-audit
Subagent Capability Probe: available
Delegation Decision Basis: self-audit — short requirements amendment from user approval + measured Desktop/codex-router evidence; no separate auditor needed before implementation

## Audit

Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
