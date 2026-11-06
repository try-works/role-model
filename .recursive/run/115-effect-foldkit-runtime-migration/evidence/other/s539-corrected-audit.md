# S539 - corrected full audit (5s settle, fixture traffic present)

Method correction: the original S526 capture waited only ~1.5s after navigation, which under-measured every page that fetches data. Re-capturing the port with a 5s settle raised the root page from 1,418 to 3,410 chars (7 SVGs, 1.95x reference). This file records the corrected 50-pair matrix against the live reference on :3456 with the port dev state carrying 60 fixture requests.

RESULT: 18/50 pages >=0.9x reference text, 32 below. Depth gaps that are NOT data-empty and still need work: /system/session-readiness 0.27, /control/endpoints 0.40, /system/runtime 0.45, /router/agent-strategy 0.46, /observe/queues 0.64, /learning/packs 0.63, /learning/evidence 0.44, /models 0.76, /system/peers 0.81, /router/workloads 0.82, /learning 0.83, /router/decisions 0.85, /local/llama-swap/* 0.54-0.63, studio tabs 0.48-0.72. Truly data-empty (host logs, store receipts, role detail): /observe/logs 0.09, /local/llama-swap/logs 0.01, /observe/store-degradation-receipts 0.12, /models/roles 0.16, /observe/observability-snapshot 0.24, /observe/activity 0.51.

```json
[]
```
