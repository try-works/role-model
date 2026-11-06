# S534 - port providers, studio, system and local families to structural parity

Status: pending
TDD Mode: strict per page + structure gate (as S529/S530)
Public basis 259c7d4b.

Reference sources: role-model-router/apps/runtime-ui/app/routes (providers, studio*, system*, local*, llama-swap*, connect*, endpoints*), components/local-model-role-picker.tsx, llama-swap-setup-modal.tsx, device-authorization-modal.tsx, page-primitives.tsx; audit keys _app_control_providers, _app_studio_*, _app_system_*, _app_local_* in gaps-a.md and gaps-c.md.

Pages: /control/providers (Remote providers, Choose provider and models, Configured provider connections; reuse the existing device-auth dialog), /studio with tabs chat|images|audio|rerank|advanced (each workspace with its own labels: Chat workspace/Request/Result workspace, Image request modes, Audio mode and request, Rerank request/Ranked results, Advanced workspace), /system/extensions (Extension boundary, Replay automation, Contribution posture, Recommendation ledger, Extension inventory), /system/operator, /system/peers, /system/storage-retention, /local/choose, /local/peers, /local/logs, /local/swap, /local/llama-swap/models, /local/llama-swap/policy.

Reuse charts.ts and the observe table helper where applicable; honest empty rows; selects with AriaLabel; keep the device-auth dialog tests s397/s425/s499 green.

Strict RED per page. Structure gate per page: reference titles present, table>=1 where reference has tables, SVG>=1 where charts. Suites + UI tsc 0 + s247 3/3 + nonempty lint zero added-line; freeze hashes; independent review; no commit. No other families.