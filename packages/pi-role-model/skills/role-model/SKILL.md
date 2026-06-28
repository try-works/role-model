---
name: role-model
description: Use when Pi should route model requests through a locally running Role-Model runtime, inspect Role-Model aliases, or diagnose Role-Model provider setup.
---

# Role-Model For Pi

Use this skill when the user wants Pi to use Role-Model as the routing provider.

Role-Model is the routing authority. Pi sends requests to the `role-model` provider, and the external Role-Model runtime decides which endpoint or alias should handle the request. The Pi package only discovers the runtime, registers provider models, exposes diagnostics, and helps choose aliases.

First check `/role-model status`. If setup has not completed, run `/role-model setup`, then use `/role-model doctor` to verify the endpoint, runtime version, auth state, endpoint trust, provider state, and downstream discovery contract.

For model selection, use `/role-model alias list` to inspect available aliases, `/role-model alias recommended` to show the runtime recommendation, and `/role-model alias use <alias>` or `/role-model alias choose <alias>` to select the alias Pi should use. Use `/role-model alias refresh` after the Role-Model runtime catalog changes.

For runtime-owned request diagnostics, use `/role-model requests` to inspect recent runtime requests and `/role-model explain <request-id|latest>` to read the runtime's structured request detail and router decision detail for that request. Use those commands when the user asks why Role-Model chose a route, what reason codes were recorded, or whether benchmark/telemetry advisory signals showed up in the runtime diagnostics.

Aliases are Role-Model routing entries; direct models are concrete model IDs exposed by the runtime. Prefer aliases when the user wants Role-Model to route intelligently.

For taxonomy discovery, prefer the live Role-Model runtime taxonomy manifest and compact role/task endpoints when available. If the runtime is unavailable or reports an incompatible taxonomy version, fall back to the package compact taxonomy snapshot and report the version mismatch clearly.

Use progressive classification before sending a request through Role-Model: choose likely groups first, inspect likely roles next, and load task detail only for the likely role or an ambiguous role pair. Include `role_model.intent` metadata when the package can classify the request: role, task, preferred capabilities, modalities, tool classes, confidence, source, evidence, taxonomy version, and classification contract version. Treat low-confidence heuristic classifications as advisory unless the user gave an explicit instruction.

Role-Model benchmarks, routing decisions, endpoint eligibility, fallback, and telemetry belong to Role-Model, not to this Pi package. Use Role-Model runtime docs and UI for benchmark or routing analysis. Taxonomy-aware benchmarks and telemetry are later Role-Model phases, and this package may surface runtime-owned request diagnostics and reason codes, but it must not claim that it scores models or aggregates production telemetry itself.

If the user explicitly asks to install or launch the external Role-Model router runtime, point them to the Role-Model repository README for those instructions and make it clear that this is external runtime setup, not a side effect of installing the Pi package.

Security boundaries: remote endpoints require explicit trust, runtimes reporting `authentication.required` must fail closed unless an explicit supported token source exists, and the package must not manage the runtime lifecycle. Do not read, print, copy, or sync Pi auth files.
