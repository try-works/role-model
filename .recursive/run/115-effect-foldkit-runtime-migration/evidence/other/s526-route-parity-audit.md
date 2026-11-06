# S526 — route-by-route visual/content parity audit (Foldkit port vs reference React :3456)

Method: for 50 reference pages, captured rendered innerText + heading/link/control counts from BOTH the reference (http://127.0.0.1:3456, React 0.0.20, live telemetry) and the port (http://127.0.0.1:51970, Foldkit final7), then three independent deepseek-flash auditors compared structure and quoted labels. Data caveat honoured: an honest empty state is not a stub; missing structural blocks are.

RESULT: 44 STUB, 11 PARTIAL, 0 CLOSE across 50 page pairs. The port renders readback/JSON surfaces where the reference renders purpose-built pages with charts, tables, filters and actions.

## Group A (learning / local / models)

# Foldkit UI port audit vs reference React 0.0.20 — routes A

Read-only comparison of D:/DEV/rm-clean/audit/ref/<KEY>.json (React on :3456) and D:/DEV/rm-clean/audit/fold/<KEY>.json (Foldkit on :51970). All labels below are quoted from the reference JSON unless explicitly marked as the port label. No source was edited.

## _app_learning (reference /app/learning, port /learning)

- Reference: /app/learning, textLen 797. Port: /learning, textLen 872. Ratio: 872 / 797 = 109.4%.
- VERDICT: PARTIAL. The port is longer than the reference but its content is a different readback surface, not the reference Learning overview.
- Missing sections: "Learning overview"; "Live replay & evaluation"; "Recent decisions"; the reference sub-blocks "What the learning loop is doing right now, read from durable state.", "Operator token", "scope not set · last 60m · reading loading", "The newest replay decisions among the last 0 observations".
- Missing controls: Reference counts are buttons 27, inputs 1, svgs 2; port counts are buttons 1, inputs 0, svgs 0. Missing the "Operator token" input and the section actions behind 27 buttons; no live replay/evaluation read state control, no recent-decisions rows.
- Wrong/renamed labels: "Learning overview" is replaced by "Knowledge worker"; "Live replay & evaluation" is split into "Replay jobs" and "Evaluation jobs"; "Recent decisions" has no port counterpart; port also adds "Endpoint ladder ranking", which is not a reference label here.
- One-line fix: Render the real Learning overview with Live replay & evaluation scope/read controls and a Recent decisions table, including the Operator token input.

## _app_learning_configuration (reference /app/learning/configuration, port /learning/configuration)

- Reference: /app/learning/configuration, textLen 569. Port: /learning/configuration, textLen 788. Ratio: 788 / 569 = 138.5%.
- VERDICT: PARTIAL. The port exposes a raw policy JSON readback instead of the activation-parameter editor.
- Missing sections: "Every activation parameter with its current value, unit, default and allowed range. Bounds are enforced here and again on the server."; "Operator token"; "Operator identity"; "Loading learning state…".
- Missing controls: Reference counts are buttons 27, inputs 2, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the operator-token and operator-identity inputs plus the per-parameter edit/save controls behind 27 buttons.
- Wrong/renamed labels: Reference labels "Operator token" and "Operator identity" are absent; the port shows raw fields such as "policyVersion", "schemaVersion" and "digest" rather than parameter, current value, unit, default and allowed range.
- One-line fix: Replace the raw JSON block with a parameter form/table carrying current value, unit, default and allowed range, plus the operator token/identity controls.

## _app_learning_decisions (reference /app/learning/decisions, port /learning/decisions)

- Reference: /app/learning/decisions, textLen 639. Port: /learning/decisions, textLen 394. Ratio: 394 / 639 = 61.7%.
- VERDICT: STUB. The length is over 30%, but the reference receipt UI and all filters are absent; the port is a raw empty readback.
- Missing sections: "Decision receipts"; "Every adjudicated decision with its evidence in columns, and the receipt chain each one produced."; "Role all roles"; "Task all tasks"; "Outcome all outcomes"; "Advisory state all fresh stale unavailable"; "Observation origin live shadow all"; "Operator token".
- Missing controls: Reference counts are buttons 30, inputs 3, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the three filter inputs (Role, Task, Outcome), the Advisory state and Observation origin selectors, and the receipt/evidence row actions.
- Wrong/renamed labels: "Decision receipts" is replaced by "Learning decisions"; the five filter labels are absent; the port prints "advisory-decisions.v1" JSON rather than a receipt chain.
- One-line fix: Build the Decision receipts table with evidence columns, Role/Task/Outcome/Advisory state/Observation origin filters, and receipt-chain actions.

## _app_learning_evidence (reference /app/learning/evidence, port /learning/evidence)

- Reference: /app/learning/evidence, textLen 1375. Port: /learning/evidence, textLen 360. Ratio: 360 / 1375 = 26.2%.
- VERDICT: STUB. Below 30% and the cohort evidence/guardrail content is missing.
- Missing sections: "Cohort evidence"; "Evidence"; "Evidence loss by reason"; reference metric sub-blocks "PAIRED HOLDOUT TASKS", "BASELINE SAMPLES", "ADVISORY SAMPLES", "APPLIED SHARE", "QUALITY DELTA", "COST MULTIPLIER", "LATENCY P95 DELTA (MS)", "ERROR-RATE DELTA (PP)", "QUALITY CI", "GUARDRAIL BOUND", "OBSERVED VERDICT"; "Evidence loss by reason".
- Missing controls: Reference counts are buttons 27, inputs 2, svgs 1, tables 1; port counts are buttons 1, inputs 0, svgs 0, tables 0. Missing the evidence table, the table/guardrail actions and the operator-token input.
- Wrong/renamed labels: The reference headings "Cohort evidence" and "Evidence loss by reason" are replaced by three "Learning evidence" headings; the port shows "no-measurement" JSON and the reason "no finalized comparison group with scored members is available yet" instead of the guardrail verdict block.
- One-line fix: Build the cohort evidence panel (paired-holdout metrics and guardrail verdicts), the evidence-loss-by-reason table, and the operator-token control.

## _app_learning_history (reference /app/learning/history, port /learning/history)

- Reference: /app/learning/history, textLen 503. Port: /learning/history, textLen 776. Ratio: 776 / 503 = 154.3%.
- VERDICT: PARTIAL. The port is longer only because it prints raw bucket JSON; the reference learning-history surface is not rendered.
- Missing sections: "What the replay, evaluation and learning loop did over the window, read from durable state."; "Operator token"; "Loading learning state…".
- Missing controls: Reference counts are buttons 27, inputs 1, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the operator-token input and the history actions behind 27 buttons.
- Wrong/renamed labels: The port repeats "Learning history" three times and prints a "learning-history.v1" bucket payload; the reference label "Operator token" is absent.
- One-line fix: Render the history summary/buckets as a real learning-history view with the operator-token control and history actions, not a raw JSON readback.

## _app_learning_packs (reference /app/learning/packs, port /learning/packs)

- Reference: /app/learning/packs, textLen 887. Port: /learning/packs, textLen 160. Ratio: 160 / 887 = 18.0%.
- VERDICT: STUB. Below 30% and both core pack areas are missing.
- Missing sections: "Learned packs"; "Candidate and pack records with their validation receipts, holdout evidence and activation state."; "ENDPOINT LADDER INDEX"; "TASK-SCOPED LEARNED PACKS"; "Roll back active pack (scope-wide)"; "Engage kill switch"; "Release kill switch".
- Missing controls: Reference counts are buttons 30, inputs 1, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the Activate / Roll back toggle per ladder row, the scope-wide rollback, the kill-switch engage/release controls, and the operator-token input.
- Wrong/renamed labels: "Learned packs" is replaced by "Learning packs"; "ENDPOINT LADDER INDEX" and "TASK-SCOPED LEARNED PACKS" are absent; the port says "No learning packs rows."
- One-line fix: Build the endpoint-ladder index with Activate/Roll back per row, task-scoped pack records with receipts/evidence, and the scope-wide rollback/kill-switch controls.

## _app_local_choose (reference /app/local/choose, port /local/choose)

- Reference: /app/local/choose, textLen 590. Port: /local/choose, textLen 60. Ratio: 60 / 590 = 10.2%.
- VERDICT: STUB. Essentially a one-line placeholder.
- Missing sections: "EXTERNAL SERVER"; "Peer-backed models"; "MANAGED BY ROLE-MODEL"; "Llama-swap models"; the reference explanations "Use this when you already run an OpenAI-compatible server (LM Studio, llama.cpp, vLLM, or similar)." and "Use this when role-model runs the local llama-swap process, swaps models on one GPU, and applies TTL auto-unload."
- Missing controls: Reference counts are buttons 21, svgs 1; port counts are buttons 1, svgs 0. Missing the links/actions "Open peer models", "Configure endpoints", "Open llama-swap models", "Edit runtime config".
- Wrong/renamed labels: "Choose local backend" is replaced by "Local choose"; the two backend-card headings and all four actions are absent; only "Choose peer-backed models or llama-swap models." remains.
- One-line fix: Render the two backend cards with their exact descriptions and the four action links.

## _app_local_endpoints (reference /app/local/endpoints, port /local/peers)

- Reference: /app/local/endpoints, textLen 431. Port: /local/peers, textLen 149. Ratio: 149 / 431 = 34.6%.
- VERDICT: STUB. The route mapping is wrong and the endpoint inventory/add form is entirely absent.
- Missing sections: "Local endpoints"; "Endpoint inventory"; "Add peer endpoint"; reference guidance "role-model probes each server at /v1/models before peer models can be registered.", "No peer endpoints configured.", "Add a server URL below to use peer-backed local models."; form blocks "Endpoint URL", "Auth token (optional)", "Add endpoint".
- Missing controls: Reference counts are buttons 29, inputs 2, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the Endpoint URL and Auth token inputs and the "Add endpoint" action.
- Wrong/renamed labels: Reference route /app/local/endpoints is served as /local/peers; "Local endpoints" and "Endpoint inventory" are replaced by "Local peers"; the port shows "No local peers configured yet." instead of "No peer endpoints configured."
- One-line fix: Add the real local-endpoints inventory page at /local/endpoints with the base-URL/token form and Add endpoint action.

## _app_local_llama_swap_logs (reference /app/local/llama-swap/logs, port /local/logs)

- Reference: /app/local/llama-swap/logs, textLen 78784. Port: /local/logs, textLen 145. Ratio: 145 / 78784 = 0.2%.
- VERDICT: STUB. The reference log history is effectively missing.
- Missing sections: "Llama-swap logs"; "Structured local log history"; "Raw log streams"; table columns "TIME", "SOURCE", "LEVEL", "MESSAGE", "REQUEST"; guidance "Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise."
- Missing controls: Reference counts are buttons 30, tables 1, svgs 1; port counts are buttons 1, tables 0, svgs 0. Missing "Refresh", "Auto-refresh (3s)", the "200 rows" control, and the parsed log table.
- Wrong/renamed labels: "Llama-swap logs" is replaced by "Local logs"; "Structured local log history" and "Raw log streams" are absent; the port says "No local logs recorded yet."
- One-line fix: Build the parsed log table (Timestamp/Source/Severity/Request/message) plus raw streams, Refresh and Auto-refresh (3s) controls.

## _app_local_llama_swap_matrix (reference /app/local/llama-swap/models, port /local/llama-swap/models)

- Reference: /app/local/llama-swap/models, textLen 911. Port: /local/llama-swap/models, textLen 176. Ratio: 176 / 911 = 19.3%.
- VERDICT: STUB. Load-model and loaded-inventory sections are missing.
- Missing sections: "Llama-swap models"; "Load model"; "Loaded models"; reference guidance "Model must already be declared in runtime config.", "Model ID", "Role summary"; loaded-state guidance "Models currently resident in memory via llama-swap." and "No llama-swap models loaded yet. Load a configured model above to start or swap the in-memory runtime inventory."
- Missing controls: Reference counts are buttons 30, inputs 1, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the Model ID input, role selector, "Load model" action, "All roles 28 selected · click to clear", and "Open runtime config".
- Wrong/renamed labels: "Load model" and "Loaded models" are absent; the port shows "Models" and three "llama-swap models" headings, then "No llama-swap models rows."
- One-line fix: Build the load-model form (Model ID, roles, Load model, Open runtime config) and the loaded-models inventory.

## _app_local_llama_swap_policy (reference /app/local/llama-swap/policy, port /local/llama-swap/policy)

- Reference: /app/local/llama-swap/policy, textLen 690. Port: /local/llama-swap/policy, textLen 315. Ratio: 315 / 690 = 45.7%.
- VERDICT: PARTIAL. The form fields and raw policy are present, but the page title/descriptions are missing and the control surface is thinner.
- Missing sections: "Llama-swap host policy"; "Policy configuration"; reference descriptions "Edit runtime behavior for local model loading and unloading.", "Seconds a model stays loaded after last request before auto-unload.", "Maximum number of models loaded simultaneously.", "Release a model from memory after its TTL expires so the managed host does not keep inactive weights pinned indefinitely."; "Raw policy" exists but without the reference explanation.
- Missing controls: Reference counts are buttons 31, inputs 2, svgs 2; port counts are buttons 4, inputs 2, svgs 0. The two inputs and Save policy/Reset/Open models exist, but 27 reference buttons and the two svgs are absent; the page lacks the reference title/actions.
- Wrong/renamed labels: "Llama-swap host policy" is replaced by "Local policy"; "Policy configuration" is absent; "Auto-unload idle models" remains but its explanation is shortened to "Release a model after its TTL expires so inactive weights are not pinned indefinitely."
- One-line fix: Restore the "Llama-swap host policy" / "Policy configuration" headings and full field descriptions around the existing TTL/max-concurrency/auto-unload form.

## _app_local_llama_swap_swap (reference /app/local/llama-swap/swap, port /local/swap)

- Reference: /app/local/llama-swap/swap, textLen 807. Port: /local/swap, textLen 152. Ratio: 152 / 807 = 18.8%.
- VERDICT: STUB. The event ledger and semantics are missing.
- Missing sections: "Llama-swap swap history"; "Event ledger"; "Ledger semantics"; "Initial load"; "Swap reason"; "Timeline order"; guidance "Most recent swap events first.", "Events appear here when the managed host loads a first model, swaps to a new one, or records the operator-visible reason for a transition."
- Missing controls: Reference counts are buttons 28, svgs 1; port counts are buttons 1, svgs 0. Missing "Open models" and "Open host policy" plus the ledger actions behind 28 buttons.
- Wrong/renamed labels: "Llama-swap swap history" is replaced by "Local swap"; "Event ledger" is absent; the port shows "No local swap events recorded yet."
- One-line fix: Build the event ledger with Initial load/Swap reason/Timeline order semantics and links to models/host policy.

## _app_local_llama_swap_models (reference /app/local/llama-swap/models, port /local/llama-swap/models)

- Reference: /app/local/llama-swap/models, textLen 911. Port: /local/llama-swap/models, textLen 176. Ratio: 176 / 911 = 19.3%.
- VERDICT: STUB. This key duplicates the reference payload of _app_local_llama_swap_matrix; the same missing Load model and Loaded models surfaces apply.
- Missing sections: "Llama-swap models"; "Load model"; "Loaded models"; "Model ID"; "Role summary"; "No llama-swap models loaded yet."
- Missing controls: Reference counts are buttons 30, inputs 1, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing Model ID input, role selection, Load model, Open runtime config.
- Wrong/renamed labels: Same as _app_local_llama_swap_matrix: the port shows "Models"/"llama-swap models" headings and "No llama-swap models rows." instead of "Load model"/"Loaded models".
- One-line fix: Same fix as _app_local_llama_swap_matrix: load-model form and loaded inventory.

## _app_local_peer_models (reference /app/local/peer-models, port /local/peer-models)

- Reference: /app/local/peer-models, textLen 596. Port: /local/peer-models, textLen 149. Ratio: 149 / 596 = 25.0%.
- VERDICT: STUB. Registration and the registered-models table are missing.
- Missing sections: "Peer models"; "Register model"; "Registered models"; guidance "Model ID must appear in the peer server catalog.", "Registration creates a router-visible endpoint without pretending the runtime owns the model process itself.", "Configure at least one peer endpoint first, then register a model id from that peer catalog.", "No peer models registered yet."
- Missing controls: Reference counts are buttons 58, inputs 1, svgs 1; port counts are buttons 1, inputs 0, svgs 0. Missing the Model ID input, "Roles + Add role", "Select all roles", "Register model", and "Open endpoints".
- Wrong/renamed labels: "Register model" and "Registered models" are absent; the port says "No peer models configured yet." instead of "No peer models registered yet."
- One-line fix: Build the Peer models registration form (Model ID, Roles + Add role, Register model) and the Registered models table with Open endpoints.

## _app_models (reference /app/models, port /models)

- Reference: /app/models, textLen 1570. Port: /models, textLen 1201. Ratio: 1201 / 1570 = 76.5%.
- VERDICT: PARTIAL. There is an inventory, but the selected-model runtime/detail/roles surface is missing.
- Missing sections: "Model inventory"; "Select a model to inspect and configure. Controller is the badge — change it from the footer."; selected-model block "RUNTIME · DEEPSEEK V4.1 FLASH (HIGH)"; "COST"; "BENCHMARK"; "ROLES"; role task counts; footer actions "Make primary controller", "Open Roles", "Open Benchmark", "Eject controller".
- Missing controls: Reference counts are buttons 85, svgs 57; port counts are buttons 1, svgs 0. Missing the model-selection buttons, controller footer actions, role/task controls, and the 57 svgs present in the reference counts.
- Wrong/renamed labels: Reference heading "Model inventory" is absent (port uses "Configured models"); reference model names such as "DeepSeek V4.1 Flash (High)" do not match the port names "Claude 3.7 Sonnet", "gpt-5.4", "GPT-4.1 Mini Fast"; reference detail labels "Source", "Status", "Endpoints", "Tool use", "Context", "Mode", "Input", "Output", "Overall", "Live latency p50", "Live latency p95", "Live mean latency", "Live failure rate", "Live samples", "Difficulty mix", "Routing" are absent.
- One-line fix: Add the selected-model detail surface (runtime, cost, benchmark, roles/task counts) and footer controller actions on top of the existing inventory.

## _app_models_roles (reference /app/models/roles, port /models/roles)

- Reference: /app/models/roles, textLen 4689. Port: /models/roles, textLen 985. Ratio: 985 / 4689 = 21.0%.
- VERDICT: STUB. The port is a read-only projection, not the role create/edit/catalog surface.
- Missing sections: "Runtime roles"; "Create role"; "Role catalog"; "Role task allowlists"; "Edit selected role"; "Advanced policy fields"; "Task detail"; descriptions "Add a router-visible role with identity, instructions, and policy fields." and "Select a role to edit identity and task allowlists."
- Missing controls: Reference counts are buttons 88, inputs 17, svgs 2; port counts are buttons 1, inputs 0, svgs 0. Missing Role id, Name, Description, Default system instructions, Tool policy mode, Routing policy overrides (JSON), Save role, Reset, Create role, Task detail and all task-allowlist controls.
- Wrong/renamed labels: "Runtime roles" is replaced by "Model roles"; "Create role", "Role catalog", "Role task allowlists", "Edit selected role" are absent; the port only lists "claude-3.7-sonnet: analyst, architect, ..." style read-only projections.
- One-line fix: Build Create role and Edit selected role forms plus Role catalog/task allowlists with Task detail and Advanced policy fields.

## _app_models_benchmark (reference /app/models/benchmark, port /system/benchmark)

- Reference: /app/models/benchmark, textLen 1428. Port: /system/benchmark, textLen 2422. Ratio: 2422 / 1428 = 169.6%.
- VERDICT: STUB. The port is longer only because it lists benchmark suite rows; the capability-run UI, scores, taxonomy and history are missing. The route mapping is also wrong.
- Missing sections: "Capability benchmark"; "Run capability benchmark"; "Benchmark scores"; "Taxonomy dimensions"; "Run history"; controls-labels "Benchmark mode", "Judge endpoint", "MODEL PATH", "SCOPE", "STATUS", "3 of 3 selected", "Run quick benchmark (3 models, 12 cases)", "No benchmark scores are in routing profiles yet.", "Clear all benchmark data".
- Missing controls: Reference counts are buttons 31, tables 1, svgs 4; port counts are buttons 1, tables 0, svgs 0. Missing mode/judge/model-selection controls, Run quick benchmark, score table, taxonomy filters, run history and Clear all benchmark data.
- Wrong/renamed labels: Reference route /app/models/benchmark is served as /system/benchmark; "Capability benchmark" is replaced by "Benchmark"; "Benchmark suite" replaces "Benchmark scores"/"Taxonomy dimensions"/"Run history"; the port shows 61 suite rows such as "e01-yes-no" rather than capability-run evidence.
- One-line fix: Move the page to /models/benchmark and build the Run capability benchmark form, Benchmark scores, Taxonomy dimensions and Run history around the existing suite data.

# PRIORITY

| route | verdict | biggest gap | effort |
|---|---|---|---|
| /local/llama-swap/logs | STUB | Parsed log table and raw streams; 78,784-char reference vs 145-char port | L |
| /models/roles | STUB | Create/Edit role forms and role catalog/task allowlists | L |
| /models | PARTIAL | Selected-model runtime/cost/benchmark/roles detail and controller footer | L |
| /models/benchmark | STUB | Capability run form, scores, taxonomy and history; wrong route | L |
| /learning/packs | STUB | Endpoint ladder index, pack records, rollback and kill switch | L |
| /learning/evidence | STUB | Cohort evidence/guardrail verdicts and evidence-loss table | L |
| /learning/decisions | STUB | Decision receipt table with five filters | L |
| /local/peer-models | STUB | Register model form and registered-models table | M |
| /local/llama-swap/models | STUB | Load model form and loaded-models inventory (same payload as matrix) | M |
| /local/llama-swap/models (matrix duplicate) | STUB | Same Load model/Loaded models gap as matrix | M |
| /local/endpoints | STUB | Endpoint inventory/add form; wrong route /local/peers | M |
| /local/swap | STUB | Event ledger and Ledger semantics | M |
| /learning | PARTIAL | Learning overview, live replay/evaluation and recent decisions | M |
| /learning/configuration | PARTIAL | Parameter editor and operator identity/token | M |
| /learning/history | PARTIAL | Real history summary/buckets instead of raw JSON | M |
| /local/choose | STUB | Two backend cards and four action links | S |
| /local/llama-swap/policy | PARTIAL | Host-policy headings/descriptions around the existing form | S |

## Group B (observe / control / router)

# Foldkit port parity gaps — batch B (observe/control/router)

Reference: React 0.0.20 served on :3456 (`audit/ref`). Port: Foldkit served on :51970 (`audit/fold`). Read-only comparison of the captured JSON; reference holds live telemetry, so honest empty states are judged by structural blocks, not row counts.

## _app_observe_activity

- Reference `pathname`: `/app/observe/activity`; `textLen` **4269**. Port: `/observe/activity`; `textLen` **154**. Ratio **3.61%**.
- **VERDICT: STUB** — only an empty-state sentence; the metrics row, activity ledger and capture inspector are absent.
- Missing sections (exact reference labels): **Host activity and metrics**, **Recent host activity**, **Capture inspector**; metric labels **ENTRIES**, **ERRORS**, **PROMPT TOKENS**, **COMPLETION TOKENS**; the bounded-ledger line "Showing 50 of 220 requests in the last 24 hours" has no port equivalent.
- Missing controls: reference **78 buttons** and **1 SVG** vs port **1 button**, **0 SVGs**; no activity row buttons or capture inspector controls.
- Wrong/renamed labels: port headings are **Activity** / **Observe activity**; reference headings are **Host activity and metrics** / **Recent host activity** / **Capture inspector**. Port text is only "No host activity recorded yet."
- One-line fix: build the four metric tiles, the 50-row host-activity ledger with capture links, and the capture inspector section with the reference labels.

## _app_observe_logs

- Reference `/app/observe/logs`, `textLen` **79187**. Port `/observe/logs`, `textLen` **149**. Ratio **0.19%**.
- **VERDICT: STUB** — no log table, no raw-lines block, only an empty state.
- Missing sections: **Host logs**, **Structured log rows**, **Raw lines**; "Source filter", "All sources combined", table columns **TIME SOURCE LEVEL MESSAGE REQUEST**; summary labels **STRUCTURED ROWS 200**, **SOURCES 1**, **CORRELATED REQUESTS 195**.
- Missing controls: reference **30 buttons** and **1 table**, **1 SVG** vs port **1 button**, **0 tables**, **0 SVGs**.
- Wrong/renamed labels: port uses **Observe logs** twice and says "No observe logs recorded yet."; reference has **Host logs** / **Structured log rows** / **Raw lines**.
- One-line fix: build the structured log table (Time/Source/Level/Message/Request), source filter, row controls and raw-lines block.

## _app_observe_observability_snapshot

- Reference `/app/observe/observability-snapshot`, `textLen` **3240**. Port `/observe/observability-snapshot`, `textLen` **297**. Ratio **9.17%**.
- **VERDICT: STUB** — the metric registry exists in miniature (3 rows) but the explanatory block and refresh surface are missing.
- Missing sections: reference explanatory paragraph "What this runtime has measured: routing decisions served, captures admitted for replay, evaluation finalise refusals, and learner candidates examined."; the "11 metric row(s) in the registry" registry view and **Refresh** control. Heading **Observability snapshot** itself is present.
- Missing controls: reference **29 buttons** and **1 SVG** vs port **1 button**, **0 SVGs**; no Refresh or metric drill-in controls.
- Wrong/renamed labels: port adds an **Observability** heading and reports "3 metric row(s) in the live registry"; reference reports "11 metric row(s) in the registry" and the explanatory copy above. (Row-count difference may be data; the explanatory/refresh structure is still absent.)
- One-line fix: add the measured-metrics explanation, full registry table with Refresh, and metric labels/controls.

## _app_observe_queues

- Reference `/app/observe/queues`, `textLen` **269**. Port `/observe/queues`, `textLen` **172**. Ratio **63.94%**.
- **VERDICT: STUB** — the port is an error/empty state with no queue table, despite the similar text length.
- Missing sections: **Queue state**, "Queue truth from the shared store: depth, activity, retries and stalls per queue, with job drill-in."; table columns **Queue Mode Waiting Active Delayed Failed Stalled Oldest waiting p50 p95 Last error Drain**.
- Missing controls: reference **28 buttons** and **1 table**, **1 SVG** vs port **1 button**, **0 tables**, **0 SVGs**.
- Wrong/renamed labels: port **Queues** is followed by "Queues read failed: HTTP 503 (queue store has no rows yet)"; reference has **Queue state** and the queue-truth sentence.
- One-line fix: build the queue table with per-queue state/counters, drain/retry controls and job drill-in.

## _app_observe_requests

- Reference `/app/observe/requests`, `textLen` **389**. Port `/requests`, `textLen` **365**. Ratio **93.83%** — text volume is close, but the structure is not the reference ledger.
- **VERDICT: STUB** — the core telemetry request ledger is absent; the port is the ranking form plus an empty readback.
- Missing sections: **Telemetry request ledger**, **Recent telemetry requests**, "Explainable request ledger with endpoint, model, status, and direct Observe/Router drill-in.", "Loading the canonical telemetry ledger…"; controls **Time range** (Day/Week/Month/90 days), **Breakdown** (Total), **Source** (All sources), **Ranking metric**, **Average latency**, **Ranking target**, **Endpoint variants**, **Advanced controls**, **Expand**.
- Missing controls: reference **37 buttons**, **12 inputs**, **2 SVGs** vs port **4 buttons**, **0 inputs**, **0 SVGs**.
- Wrong/renamed labels: port headings **Requests** / **Ranked comparison** / **Requests** and the ranking copy "Metric and ranking target feed POST /telemetry/query over the last week…"; reference has **Telemetry request ledger** / **Recent telemetry requests** and the filter labels above. Port's **Run ranking** has no reference counterpart.
- One-line fix: build the telemetry request ledger with the time-range/breakdown/source/ranking filters, request rows, and Observe/Router drill-in links.

## _app_observe_routing

- Reference `/app/observe/routing`, `textLen` **203**. Port `/observe/routing`, `textLen` **152**. Ratio **74.88%**.
- **VERDICT: STUB** — the analytic filters are missing and the port is only an empty state.
- Missing sections: **Routing analytics**, **Time range** (Day/Week/Month/90 days), **Breakdown** (By endpoint variant), **Source** (All sources), **Difficulty** (All buckets), **Advanced controls**, **Expand**.
- Missing controls: reference **35 buttons**, **11 inputs**, **2 SVGs** vs port **1 button**, **0 inputs**, **0 SVGs**.
- Wrong/renamed labels: port uses **Observe routing** / **Observe routing** and "No routing rows recorded yet."; reference has **Routing analytics** with the filter labels.
- One-line fix: build the routing analytics filter bar and bounded routing results block.

## _app_observe_store_degradation_receipts

- Reference `/app/observe/store-degradation-receipts`, `textLen` **4869**. Port `/observe/store-degradation-receipts`, `textLen` **156**. Ratio **3.20%**.
- **VERDICT: STUB** — only an empty state; no receipt rows or stores.
- Missing sections: **Store degradation receipts**, the explanatory "Materialization failures (R3 ladder writes, R6b development floors) are never silent…" paragraph, "18 receipt row(s) across both stores", **Refresh**, **Knowledge store**, **Knowledge worker**, receipt categories **LADDER-MATERIALIZATION** and **KNOWLEDGE:VALIDATE-CANDIDATE**.
- Missing controls: reference **29 buttons**, **1 SVG** vs port **1 button**, **0 SVGs**.
- Wrong/renamed labels: port **Store receipts** and "No store degradation receipts yet." vs reference **Store degradation receipts** and the materialization-failure explanation.
- One-line fix: build the dual-store receipt ledger with Refresh, store grouping, category/message/status/timestamp rows.

## _app_control_providers

- Reference `/app/remote/providers`, `textLen` **692**. Port `/control/providers`, `textLen` **473**. Ratio **68.35%**.
- **VERDICT: PARTIAL** — the port has provider/device/account forms, but not the reference provider catalogue/selection structure.
- Missing sections: **Remote providers**, **Choose provider and models**, **Configured provider connections**; selection labels **Provider**, **Connection method**, **302.AI API Key**, **Provider connection id**, **Credential reference**, **Model**, **Select a model…**, **Save configuration**; explanatory "Endpoints stay grouped by account. Expand a model’s roles count to edit which routing roles it can serve.".
- Missing controls: reference **28 buttons**, **4 SVGs**, **2 inputs** vs port **7 buttons**, **0 SVGs**, **17 inputs**. Port has more inputs but no model/role selection cards or per-account endpoint expansion.
- Wrong/renamed labels: port **Providers** / **Provider connection** / **Provider account** vs reference **Remote providers** / **Choose provider and models** / **Configured provider connections**; port **Reconnect provider** vs **Save configuration**.
- One-line fix: build the provider catalogue/selection card, connection-method and model pickers, and grouped configured-connection cards with role expansion.

## _app_router

- Reference `/app/router`, `textLen` **1044**. Port `/router`, `textLen` **247**. Ratio **23.66%**.
- **VERDICT: STUB** — no alias inventory or routing-candidate tables; only three raw summary rows.
- Missing sections: **Routing overview**, **Alias inventory**, **Routing candidates**; labels **CURRENT ACTIVE ALIAS**, **ALIAS READINESS**, **ALIAS MODES**, **Browse all alias pools (18)**, columns **MODEL ENDPOINT SOURCE HEALTH ROUTING**.
- Missing controls: reference **28 buttons**, **2 tables**, **2 SVGs** vs port **1 button**, **0 tables**, **0 SVGs**.
- Wrong/renamed labels: port **Router** and raw `executionMode decision_only` / `configuredCandidateCount 3` fields; reference is **Routing overview** with the alias/readiness/mode cards.
- One-line fix: build the overview alias cards, readiness/mode summaries, full alias-pool table and routing-candidate table.

## _app_router_agent_strategy

- Reference `/app/router/agent-strategy`, `textLen` **2360**. Port `/router/agent-strategy`, `textLen` **52**. Ratio **2.20%**.
- **VERDICT: STUB** — only "No agent strategy readback available."
- Missing sections: **Agent strategy**, **Posture diagnostics**, **Entries**; "Role-bound postures. Each entry materialises one alias per execution scope…", "1 scope cannot resolve", **EDITING SAVED ENTRY RESEARCHER**, **Name**, **Role (required)**, **Search, compare, synthesize, cite, and summarize information.**, role picker.
- Missing controls: reference **34 buttons**, **3 inputs**, **1 SVG** vs port **1 button**, **0 inputs**, **0 SVGs**.
- Wrong/renamed labels: port heading **Agent strategy** is present, but the body is an unavailable sentence; reference has **Posture diagnostics** and **Entries** plus the role-bound posture cards.
- One-line fix: build the role-bound posture list, diagnostics panel, and edit/add entry form with role picker and save controls.

## _app_router_candidates

- Reference `/app/router/candidates`, `textLen` **1228**. Port `/router/candidates`, `textLen` **784**. Ratio **63.84%**.
- **VERDICT: PARTIAL** — candidate data exists, but it is raw JSON-like rows; the reference candidate-inventory cards and metadata are absent.
- Missing sections: **Candidate inventory**, the CAP explanation "CAP is benchmark capability; its evidence is labeled exact, borrowed, or prior…", candidate labels **ENDPOINT**, **SOURCE**, **CAP**, **EFFORT**, **LIVE P50**, **LIVE FAIL**, **LIVE SAMPLES**, **ROLES**, **TOOLING**.
- Missing controls: reference **28 buttons**, **1 SVG** vs port **1 button**, **0 SVGs**; no candidate promotion/selection controls.
- Wrong/renamed labels: port **Router candidates** vs reference **Candidate inventory**; port prints raw `{ "endpointId": …, "pricing": … }` instead of the reference card fields.
- One-line fix: render candidate cards with health/source/CAP/effort/live p50/fail/samples/roles/tooling and the benchmark-evidence explanation.

## _app_router_config

- Reference `/app/router/strategy`, `textLen` **116**. Port `/router/config`, `textLen` **66**. Ratio **56.90%**.
- **VERDICT: PARTIAL** — the reference capture is itself a loading state ("Loading routing strategy posture…"), so only skeleton/heading structure can be compared; the port exposes two raw fields, not the posture UI.
- Missing sections: **Routing strategy** heading; the reference loading sentence and its full posture surface (not captured because the reference page was still loading).
- Missing controls: reference **28 buttons**, **1 SVG** vs port **1 button**, **0 SVGs**.
- Wrong/renamed labels: port **Router config** and `Routing strategy: null` / `Execution mode: decision_only`; reference **Routing strategy** with "Loading routing strategy posture…".
- One-line fix: implement the real routing-strategy posture page and controls; re-audit once the reference finishes loading to compare the full structure.

## _app_router_strategy

- Reference `/app/router/strategy`, `textLen` **116**. Port `/router/strategy`, `textLen` **68**. Ratio **58.62%**.
- **VERDICT: PARTIAL** — same limitation as `_app_router_config`: the reference capture is a loading state, and the port has two raw fields rather than the posture page.
- Missing sections: **Routing strategy** heading; reference loading copy and full posture surface not captured.
- Missing controls: reference **28 buttons**, **1 SVG** vs port **1 button**, **0 SVGs**.
- Wrong/renamed labels: port **Router strategy** vs reference **Routing strategy**; port `Routing strategy: null` / `Execution mode: decision_only`.
- One-line fix: implement the routing-strategy posture/controls and re-audit against a loaded reference page.

## _app_router_workloads

- Reference `/app/router/workloads`, `textLen` **1012**. Port `/router/workloads`, `textLen` **42**. Ratio **4.15%**.
- **VERDICT: STUB** — only an unavailable sentence.
- Missing sections: **Workloads**, **Posture diagnostics**, **Workload templates**, **Entries**; "No Workloads entries are configured yet.", "Use batch template", "Use embedding template", "Add workload", "Save Workloads".
- Missing controls: reference **32 buttons**, **1 SVG** vs port **1 button**, **0 SVGs**.
- Wrong/renamed labels: port **Router workloads** / "No workloads readback available." vs reference **Workloads** with templates and entries.
- One-line fix: build workload templates, diagnostics, and the add/edit entries table with save.

## _app_router_controller

- Reference `/app/router/controller`, `textLen` **1193**. Port `/control/controller`, `textLen` **507**. Ratio **42.50%**.
- **VERDICT: PARTIAL** — the port has a controller row/save form, but no candidate cards or promotion controls.
- Missing sections: **Routing controller**, **Controller assignment**, candidate labels **ENDPOINT**, **SOURCE**, **HEALTH**, **TOOLING**, **ROLES**, **ROLE COUNT**, **SERVING**, **Current controller**, **Use as controller**, "Promote this endpoint to the persisted routing controller.".
- Missing controls: reference **31 buttons**, **1 SVG** vs port **3 buttons**, **0 SVGs**, **1 input**; no per-candidate "Use as controller" promotion.
- Wrong/renamed labels: port **Controller** / **Update controller** and raw row IDs vs reference **Routing controller** / **Controller assignment** / **Use as controller**.
- One-line fix: render candidate assignment cards with health/roles/tooling and per-candidate promotion, keeping the existing save form.

## _app_router_decisions

- Reference `/app/router/decisions`, `textLen` **13805**. Port `/router/decisions`, `textLen` **157**. Ratio **1.14%**.
- **VERDICT: STUB** — only an empty state; the decision ledger is absent.
- Missing sections: **Routing decisions**, **Decision ledger**, "Showing 50 of 225 routing decisions in the selected window.", row labels **MODEL**, **ENDPOINT**, **EFFORT**, **STRATEGY**, **SOURCE**, **DECIDED**, **Router · Open detail**, **Observe · Open detail**.
- Missing controls: reference **28 buttons**, **1 SVG** vs port **1 button**, **0 SVGs**; no decision drill-in links.
- Wrong/renamed labels: port **Router decisions** and "No router decisions recorded yet." vs reference **Routing decisions** / **Decision ledger**.
- One-line fix: build the bounded 50-row decision ledger with model/endpoint/effort/strategy/source/decided fields and Router/Observe drill-in links.

## PRIORITY

| route | verdict | biggest gap | effort |
|---|---|---|---|
| _app_observe_logs | STUB | No log table at all; reference is 79k chars/30 buttons | L |
| _app_router_decisions | STUB | No decision ledger; 225-row bounded ledger absent | L |
| _app_observe_activity | STUB | No metrics row/activity ledger/capture inspector | L |
| _app_observe_store_degradation_receipts | STUB | No dual-store receipt ledger | M |
| _app_router_agent_strategy | STUB | No posture cards or entry editor | L |
| _app_router_workloads | STUB | No templates/diagnostics/entries editor | M |
| _app_observe_queues | STUB | No queue table despite similar text length | M |
| _app_router | STUB | No alias inventory/candidate tables | L |
| _app_observe_requests | STUB | No telemetry ledger/filter surface | L |
| _app_observe_routing | STUB | No analytics filter surface | M |
| _app_observe_observability_snapshot | STUB | Missing explanation/Refresh; only 3 registry rows | M |
| _app_control_providers | PARTIAL | Wrong shape: forms instead of provider catalogue/connection cards | L |
| _app_router_candidates | PARTIAL | Raw candidate rows instead of inventory cards | M |
| _app_router_controller | PARTIAL | No candidate cards/promotion controls | M |
| _app_router_config | PARTIAL | Reference loading; port exposes raw fields | S/M |
| _app_router_strategy | PARTIAL | Reference loading; port exposes raw fields | S/M |

Effort key: S = mostly labels/format on existing data; M = new table/cards + controls; L = new ledger/editor with data wiring.

## Group C (studio / system / endpoints)

# Run115 Foldkit port vs reference React — route gaps (C)

Audit input: reference React 0.0.20 files and Foldkit port JSON under `D:/DEV/rm-clean/audit/{ref,fold}`. Read-only audit; no source edits. Data caveat: the reference instance holds live telemetry; an honest empty state is not by itself a stub. These verdicts judge structural sections and controls.

## _app_studio_advanced

Reference: `/app/studio/advanced` — textLen 343.  
Port: `/studio` — textLen 118. Ratio: **0.34**.  
VERDICT: **STUB** — the route-specific workspace is missing and the port renders the generic Studio form.

Missing sections (exact reference labels): `Advanced workspace`, `Endpoint family`, `Response workspace`. The reference `REQUEST TEMPLATE` block is absent; port only has generic `JSON body` and `RAW RESPONSE`.

Missing controls: reference 29 buttons / 1 input / 1 svg vs port 7 / 1 / 0. Missing the `Endpoint family` selector, `Submit advanced request`, and the response-workspace affordances; port `Run` is the generic Studio action, not the advanced submit flow.

Wrong/renamed labels: `Advanced workspace` → `Studio`; `Endpoint family` → absent; `Response workspace` → `RAW RESPONSE`; `Submit advanced request` → `Run`.

Fix: build the advanced Studio route with endpoint-family selection, JSON request/template, submit, and a labeled response workspace.

## _app_studio_audio

Reference: `/app/studio/audio` — textLen 309.  
Port: `/studio` — textLen 121. Ratio: **0.39**.  
VERDICT: **STUB** — no audio workspace, mode, voice inventory, or audio result stage.

Missing sections: `Audio workspace`, `Audio mode and request`, `Audio result stage`, plus the `VOICE INVENTORY` block.

Missing controls: reference 30 buttons / 1 input / 1 svg vs port 7 / 2 / 0. Reference labels `Mode`, `Speech synthesis`, `Voice`, `Select…`, `Run audio request` are absent; port has generic `Model Prompt Run`.

Wrong/renamed labels: `Audio mode and request` → `Model Prompt`; `Audio result stage` → `RAW RESPONSE`; `Voice inventory is unavailable on this runtime host.` → absent.

Fix: add the audio mode/voice controls, voice inventory state, and audio result stage.

## _app_studio_chat

Reference: `/app/studio/chat` — textLen 130.  
Port: `/studio` — textLen 121. Ratio: **0.93**.  
VERDICT: **PARTIAL** — request controls exist generically, but the reference result workspace and its labels are lost.

Missing sections: `Chat workspace`, `Request`, `Result workspace`. The port has `Model`, `Prompt`, `Run` and a generic `RAW RESPONSE` block, but no labeled request/result workspace.

Missing controls: reference 28 buttons / 1 input / 1 svg vs port 7 / 2 / 0. The `Run request` affordance is not preserved as a chat-specific action; the result area has no chat result structure.

Wrong/renamed labels: `Chat workspace` → `Studio`; `Request` → `Model Prompt Run`; `Result workspace` / `No result yet.` → `RAW RESPONSE` / `Run a Studio request to see the raw response.`

Fix: add explicit Request and Result workspace sections with chat labels; keep raw response as a subordinate result view, not the whole page.

## _app_studio_images

Reference: `/app/studio/images` — textLen 297.  
Port: `/studio` — textLen 131. Ratio: **0.44**.  
VERDICT: **STUB** — image modes, size/result stage, and generated-images block are missing.

Missing sections: `Images workspace`, `Image request modes`, `Image result stage`, plus `GENERATED IMAGES`.

Missing controls: reference 30 buttons / 1 input / 1 svg vs port 7 / 4 / 0. Reference `Mode`, `OpenAI-style generation`, `Size`, `Run image request` are not preserved; port has generic `Mode Model Prompt Size Run`.

Wrong/renamed labels: `Image request modes` → `Mode`; `Image result stage` → `RAW RESPONSE`; `GENERATED IMAGES` → absent; `Run image request` → `Run`.

Fix: add image-mode/size controls, generation submit, and a generated-images result stage.

## _app_studio_rerank

Reference: `/app/studio/rerank` — textLen 276.  
Port: `/studio` — textLen 145. Ratio: **0.53**.  
VERDICT: **STUB** — the rerank workspace, contract details, and ranked results are missing.

Missing sections: `Rerank workspace`, `Rerank request`, `Ranked results`, plus `CONTRACT DETAILS`.

Missing controls: reference 29 buttons / 2 inputs / 1 svg vs port 7 / 3 / 0. Reference `Contract /v1/rerank`, `Candidate documents`, `Submit rerank request` are absent; port labels `Documents (one per line)` and `Run` are generic.

Wrong/renamed labels: `Rerank request` → `Model Query Documents (one per line)`; `Ranked results` → `RAW RESPONSE`; `CONTRACT DETAILS` → absent; `Submit rerank request` → `Run`.

Fix: add the rerank request contract, candidate-document control, submit action, and ranked-results section.

## _app_system_extensions

Reference: `/app/system/extensions` — textLen 838.  
Port: `/system/extensions` — textLen 8215. Ratio: **9.80** (port text is inflated by raw JSON extension rows).  
VERDICT: **STUB** — no boundary, automation, contribution, recommendation, or inventory sections; the port is a raw readback dump.

Missing sections: `Extension boundary`, `Replay automation`, `Contribution posture`, `Recommendation ledger`, `Extension inventory`, plus reference status blocks `INSTALLED 0`, `READY 0`, `DEGRADED 0`, `OPEN RECS 0`.

Missing controls: reference 29 buttons / 1 svg vs port 1 / 0. Reference actions such as `Pause` and `Download & validate latest` are absent; port exposes a single generic refresh/readback.

Wrong/renamed labels: `Extension boundary`/`Extension inventory` → `Extensions` / `RUNTIME READBACK`; `Replay automation` → absent; `Contribution posture` → absent; `Recommendation ledger` → absent.

Fix: build the five extension sections with their status blocks and pause/download actions; keep raw extension JSON out of the primary text.

## _app_system_operator

Reference: `/app/system/operator` — textLen 1456.  
Port: `/system/operator` — textLen 988. Ratio: **0.68**.  
VERDICT: **STUB** — only status/trace-root readbacks are present; controls and job/learning surfaces are absent.

Missing sections: `Operator controls`, `Operator Controls`, `Trace lineage`, `Replay Jobs`, `Evaluation Jobs`, `Shadow Learning`.

Missing controls: reference 25 buttons / 4 inputs / 1 svg vs port 1 / 0 / 0. Reference `Operator access token`, `Load Operator State`, `Create Replay`, `Update Mode`, `Roll Back Shadow State`, `Open Storage & Retention` are absent.

Wrong/renamed labels: `Operator controls` → `Operator status`; `Trace lineage` → `Trace roots`; `Replay Jobs` / `Evaluation Jobs` → absent; `Shadow Learning` → absent.

Fix: add the operator token/load control, replay and evaluation job sections, and shadow-learning mode/rollback controls.

## _app_system_peers

Reference: `/app/system/peers` — textLen 684.  
Port: `/system/peers` — textLen 151. Ratio: **0.22**.  
VERDICT: **STUB** — all four reference sections are missing.

Missing sections: `Peer topology`, `Peer inventory`, `Peer config`, `Contract fields` (including reference `PROXY`, `APIKEY`, `MODELS`, `FILTERS · TIMEOUTS`).

Missing controls: reference 27 buttons / 1 svg vs port 1 / 0. The peer inventory/config/contract affordances are absent.

Wrong/renamed labels: `Peer topology`/`Peer inventory`/`Peer config`/`Contract fields` → `System peers`; reference empty-state copy `No peers configured in the current host config.` is not rendered.

Fix: add peer topology/inventory/config/contract sections and their action affordances; an honest empty state is acceptable once those structural sections exist.

## _app_system_runtime

Reference: `/app/system/runtime` — textLen 999.  
Port: `/runtime` — textLen 452. Ratio: **0.45**.  
VERDICT: **STUB** — the runtime page is merged into a config editor and lacks four reference sections.

Missing sections: `Runtime topology`, `Applied runtime policy`, `Execution readiness`, `Controller posture`, `Version facts`.

Missing controls: reference 27 buttons / 1 svg vs port 2 / 0. The reference policy/readiness/controller/version facts and their actions are absent; port only has generic runtime-config load/edit controls.

Wrong/renamed labels: `Runtime topology` / `Applied runtime policy` / `Execution readiness` / `Controller posture` / `Version facts` → `Runtime` / `Runtime config`; reference `VERSION`, `BUILD DATE`, `STATE ROOT` facts are absent.

Fix: add the five runtime sections and their facts/actions; keep the config editor as a separate section/page.

## _app_control_runtime_config

Reference: `/app/system/runtime-config` — textLen 625.  
Port: `/runtime` — textLen 452. Ratio: **0.72**.  
VERDICT: **STUB** — the editor shell exists, but `Applied snapshot` and `Page actions` are missing.

Missing sections: `Config editor`, `Applied snapshot`, `Page actions`. The `Runtime config` page label is present, but its editor/snapshot/action sub-sections are not.

Missing controls: reference 30 buttons / 1 input / 1 svg vs port 2 / 0 / 0. Reference `Save and apply`, `Insert llama-swap scaffold`, and `Reset editor` are absent.

Wrong/renamed labels: `Config editor` → generic `Runtime config`; `Applied snapshot` → absent; `Page actions` → absent; `Save and apply` → no equivalent.

Fix: add the labeled config editor, applied snapshot facts, page actions, and the three save/scaffold/reset controls.

## _app_system_session_readiness

Reference: `/app/system/session-readiness` — textLen 1073.  
Port: `/session-readiness` — textLen 287. Ratio: **0.27**.  
VERDICT: **STUB** — six of seven reference sections are absent; the port is a small status readback.

Missing sections: `Session bootstrap`, `Canonical lifecycle`, `Operator intent manifest`, `Credential readiness`, `Routable inventory`, `Alias drift warnings`. The page-level `Session readiness` heading is present; the six substantive sections are not.

Missing controls: reference 27 buttons / 1 svg vs port 1 / 0. The bootstrap/lifecycle/intent/credential/inventory surface and its actions are absent.

Wrong/renamed labels: `Session bootstrap`, `Canonical lifecycle`, `Operator intent manifest`, `Credential readiness`, `Routable inventory`, `Alias drift warnings` → absent; only generic `Session readiness` / `RUNTIME READBACK` rows remain.

Fix: build the six readiness sections (bootstrap, lifecycle, intent manifest, credentials, routable inventory, alias drift).

## _app_system_storage_retention

Reference: `/app/system/storage-retention` — textLen 1012.  
Port: `/system/storage-retention` — textLen 248. Ratio: **0.25**.  
VERDICT: **STUB** — the logical-classes/policy/pruning sections and actions are absent.

Missing sections: `Logical classes`, `Retention policy`, `Manual pruning`; reference `PHYSICAL BYTES`, `LOGICAL BYTES`, `RECLAIMABLE BYTES`, `LEGAL HOLDS`, `MAINTENANCE` facts are absent.

Missing controls: reference 30 buttons / 2 inputs / 1 svg vs port 1 / 0 / 0. Reference `Maximum size (GB)`, `Maximum age (days)`, `Save policy`, `Dry-run`, `Execute plan` are absent.

Wrong/renamed labels: `Storage & retention` → `Storage retention` (missing ampersand); `Logical classes` / `Retention policy` / `Manual pruning` → generic `Total bytes`, `Total rows`, `Categories`, `Receipts` counts.

Fix: add logical inventory, retention policy fields/save, and the dry-run/execute pruning workflow.

## _app_control_endpoints

Reference: `/app/connect` — textLen 741.  
Port: `/control/endpoints` — textLen 298. Ratio: **0.40**.  
VERDICT: **STUB** — the reference endpoint registry table and runtime-connections view are missing; the port renders endpoint admission instead.

Missing sections: `Available models & endpoints`, `Runtime connections` (merged provider/model/endpoint table).

Missing controls: reference 24 buttons / 1 table / 1 svg vs port 3 / 0 / 0 (port has 6 inputs). The registry/table and reference connection actions are absent; port has an admission form.

Wrong/renamed labels: `Runtime connections` → `Endpoint admission`; reference column labels `PROVIDER`, `CONNECTION`, `MODEL`, `ENDPOINT`, `EFFORT`, `SOURCE`, `HEALTH`, `READINESS` are absent.

Fix: restore the merged runtime-connections table and its columns; keep admission as a separate control.

## _app_control_roles

Reference: `/app/models/roles` — textLen 4689.  
Port: `/models/roles` — textLen 985. Ratio: **0.21**.  
VERDICT: **STUB** — the port is a read-only eligibility dump; all role-management sections are absent.

Missing sections: `Runtime roles`, `Create role`, `Role catalog`, `Role task allowlists`, `Edit selected role`.

Missing controls: reference 88 buttons / 17 inputs / 2 svgs vs port 1 / 0 / 0. Reference `Create role`, `Reset`, `Task detail`, `Save role` and the 47/36/49-task catalog affordances are absent.

Wrong/renamed labels: `Role catalog` / `Create role` / `Role task allowlists` / `Edit selected role` → `Read-only role eligibility projection`; reference role rows (e.g. `Analyst`, `Architect`, `Coder`) and task counts are absent.

Fix: build role creation, catalog selection, task allowlist editing, and selected-role edit fields/actions.

## _app_control_benchmark

Reference: `/app/models/benchmark` — textLen 1428.  
Port: `/system/benchmark` — textLen 2422. Ratio: **1.70** (port text is inflated by raw suite rows).  
VERDICT: **STUB** — the run/scores/taxonomy/history sections are missing; the port is a raw benchmark-suite dump.

Missing sections: `Capability benchmark`, `Run capability benchmark`, `Benchmark scores`, `Taxonomy dimensions`, `Run history`.

Missing controls: reference 31 buttons / 1 table / 4 svgs vs port 1 / 0 / 0. Reference `Benchmark mode`, `Judge endpoint`, `Run quick benchmark`, `Clear all benchmark data` are absent; no scores table/history controls exist.

Wrong/renamed labels: `Run capability benchmark` / `Benchmark scores` / `Taxonomy dimensions` / `Run history` → `Benchmark suite` + raw case rows.

Fix: add the benchmark run form, judge/mode selection, scores table, taxonomy dimensions, and run history/clear action.

## _app_connect

Reference: `/app/connect` — textLen 741.  
Port: `/control/endpoints` — textLen 298. Ratio: **0.40**.  
VERDICT: **STUB** — identical to `_app_control_endpoints`: no runtime-connections registry.

Missing sections: `Available models & endpoints`, `Runtime connections`.

Missing controls: reference 24 buttons / 1 table / 1 svg vs port 3 / 0 / 0 (6 inputs). The registry table and connection actions are absent.

Wrong/renamed labels: `Runtime connections` → `Endpoint admission`; reference column labels are absent.

Fix: restore the registry/connection view for `/app/connect` (same gap as `_app_control_endpoints`).

## _app

Reference: `/app` — textLen 1745.  
Port: `/` — textLen 327. Ratio: **0.19**.  
VERDICT: **STUB** — the dashboard chart/filter structure is missing. The port's `No telemetry yet` is an honest data-empty state, but it cannot substitute for the seven reference chart blocks.

Missing sections: `Model pool` with `Route candidates by quality, cost, and speed.`; `Token usage over time`; `Cache efficiency trend`; `Effective cost over time`; `Cost avoided over time`; `Latency trend`; `Success vs failure volume`.

Missing controls: reference 29 buttons / 7 svgs / 0 inputs vs port 5 / 0 / 4. Reference `Time range`, `Breakdown`, `Source filter`, `Status`, `Difficulty` controls are not preserved; the port has filter-style inputs but no charts.

Wrong/renamed labels: `Time range`/`Breakdown`/`Source filter`/`Status`/`Difficulty` → uppercase generic filter labels; chart legends (`Input tokens`, `Output tokens`, `Total tokens`, `Cache hit tokens`, `Routing avoided cost`, `Cache avoided cost`, `Average latency`, `p95 latency`, `Success`, `Failures`) are absent.

Fix: add the seven dashboard charts/legends and the reference filter semantics; render an honest empty state inside each chart block when no telemetry exists.

## PRIORITY

| route | verdict | biggest gap | effort |
|---|---|---|---|
| _app_control_roles | STUB | Create role / Role catalog / allowlists / Edit role | L |
| _app_system_extensions | STUB | Extension boundary / Replay automation / Contribution posture / Recommendation ledger | L |
| _app_system_operator | STUB | Operator controls / Replay Jobs / Evaluation Jobs / Shadow Learning | L |
| _app_control_benchmark | STUB | Run benchmark / Scores / Taxonomy / History | L |
| _app | STUB | Seven dashboard chart blocks and filters | L |
| _app_system_storage_retention | STUB | Logical classes / Retention policy / Manual pruning | L |
| _app_control_endpoints | STUB | Runtime connections registry table | M |
| _app_connect | STUB | Runtime connections registry table | M |
| _app_system_session_readiness | STUB | Six readiness sections | M |
| _app_system_runtime | STUB | Applied policy / Execution readiness / Controller / Version | M |
| _app_control_runtime_config | STUB | Applied snapshot / Page actions / save-reset controls | M |
| _app_system_peers | STUB | Peer topology / inventory / config / contract fields | M |
| _app_studio_advanced | STUB | Endpoint family / advanced submit / response workspace | M |
| _app_studio_audio | STUB | Audio mode / voice inventory / audio result stage | M |
| _app_studio_images | STUB | Image modes / generated images result stage | M |
| _app_studio_rerank | STUB | Rerank contract / ranked results | M |
| _app_studio_chat | PARTIAL | Result workspace label/structure; otherwise generic request form | S |

No CLOSE route was found. All verdicts are based only on the supplied JSON fields/text; no sources or live services were modified.

