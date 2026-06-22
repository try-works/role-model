---
name: role-model
description: Use when Pi should route model requests through a locally running Role-Model runtime, inspect Role-Model aliases, or diagnose Role-Model provider setup.
---

# Role-Model For Pi

Use this skill when the user wants Pi to use Role-Model as the routing provider.

Role-Model is the routing authority. Pi sends requests to the `role-model` provider, and the external Role-Model runtime decides which endpoint or alias should handle the request. The Pi package only discovers the runtime, registers provider models, exposes diagnostics, and helps choose aliases.

First check `/role-model status`. If setup has not completed, run `/role-model setup`, then use `/role-model doctor` to verify the endpoint, runtime version, auth state, endpoint trust, provider state, and downstream discovery contract.

For model selection, use `/role-model alias list` to inspect available aliases, `/role-model alias recommended` to show the runtime recommendation, and `/role-model alias use <alias>` or `/role-model alias choose <alias>` to select the alias Pi should use. Use `/role-model alias refresh` after the Role-Model runtime catalog changes.

Aliases are Role-Model routing entries; direct models are concrete model IDs exposed by the runtime. Prefer aliases when the user wants Role-Model to route intelligently.

Role-Model benchmarks, routing decisions, endpoint eligibility, fallback, and telemetry belong to Role-Model, not to this Pi package. Use Role-Model runtime docs and UI for benchmark or routing analysis.

If the user explicitly asks to install or launch the external Role-Model router runtime, point them to the Role-Model repository README for those instructions and make it clear that this is external runtime setup, not a side effect of installing the Pi package.

Security boundaries: remote endpoints require explicit trust, runtimes reporting `authentication.required` must fail closed unless an explicit supported token source exists, and the package must not manage the runtime lifecycle. Do not read, print, copy, or sync Pi auth files.
