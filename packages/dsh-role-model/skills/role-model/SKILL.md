---
name: role-model
description: Use when routing model requests through an externally running role-model runtime, inspecting role-model aliases, or diagnosing the role-model provider route.
---

# role-model for DeepSeek Harness

Use this skill when the work should route through a role-model runtime.

role-model is the routing authority. This harness sends requests on the `role-model`
provider route, and the external runtime decides which endpoint or alias serves each
request. This plugin only discovers the runtime, registers the provider route and its
models, injects intent metadata, and exposes diagnostics.

## Start here

Check `/role-model status` first. It reports the endpoint, runtime version, discovery
state, alias count, the selected and recommended alias, and the provider state.

If something looks wrong, run `/role-model doctor`. It walks every check: endpoint
reachability, health, runtime version, the downstream discovery contract, auth, endpoint
trust, provider registration, alias availability, and any models whose metadata had to be
sized conservatively.

`/role-model setup` re-registers the provider route from a fresh discovery.
`/role-model ui` prints the runtime's own URL.

## Model selection

The runtime's aliases, models and endpoints are all selectable in the model selector,
grouped under `role-model`, with the recommended alias first. Prefer an alias when you want
the runtime to route intelligently; pick a concrete model or endpoint when you want to pin
a specific destination.

- `/role-model alias list` lists every alias the runtime advertises.
- `/role-model alias recommended` prints the runtime's own recommendation.
- `/role-model alias use <alias>` records the alias in this plugin's configuration. It does
  not change the active model: the model selector owns that, and the command says so.
- `/role-model alias current` prints what is recorded.
- `/role-model alias refresh` re-registers from a fresh discovery after the catalog changes.

If someone picks a foreign id such as `gpt-4o` while on this route, the plugin explains the
mismatch and points back to `/role-model alias list` and `/role-model alias recommended`.

## Request diagnostics

- `/role-model requests [limit]` lists recent runtime requests.
- `/role-model explain <request-id|latest>` reads one request together with its router
  decision: the chosen endpoint and model, the strategy label, the selection reason codes,
  and the runtime's own observation path.

Use these when asked why a route was chosen, what reason codes were recorded, or whether
the classification influenced routing.

## Intent metadata

Every ordinary conversation request on this route carries `role_model.intent` metadata:
role hint, task type, preferred capabilities, required and output modalities, tool classes,
confidence, evidence, alternatives, taxonomy version, and the classification contract
version. The runtime uses valid hints to narrow candidates and falls back to its own
classification when hints are missing, low-confidence, or outside the taxonomy, so the
metadata is advisory rather than a hard requirement.

Classification is progressive: candidate groups are chosen first, roles are scored next,
and a role's task detail is loaded only for the likely role. Auxiliary calls such as
compaction and session titles are never annotated.

For taxonomy discovery, prefer the runtime's own taxonomy when it is reachable and
compatible; otherwise the plugin classifies from its bundled compact snapshot and reports
the version it used.

## Boundaries

Benchmarks, routing decisions, endpoint eligibility, fallback and telemetry belong to
role-model, not to this plugin. This plugin may surface runtime-owned request diagnostics
and reason codes; it does not score models or aggregate production telemetry.

If asked to install, start, stop, or update the external runtime, point at the role-model
repository's own instructions and be clear that this is external runtime setup, not a side
effect of installing this plugin. This plugin never manages the runtime lifecycle.

Security boundaries: a remote endpoint requires explicit trust, a runtime that reports
`authentication.required` fails closed, and the plugin never reads, prints, copies or syncs
credentials. The bearer token it sends is the runtime's published local placeholder.
