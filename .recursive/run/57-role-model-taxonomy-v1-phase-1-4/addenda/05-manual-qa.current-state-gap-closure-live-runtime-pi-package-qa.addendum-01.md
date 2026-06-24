---
Status: DRAFT
Phase: 5
Addendum: 01
BaseArtifact: 05-manual-qa.md
Title: Current State Gap Closure Live Runtime Pi Package QA Addendum
---

# Current State Gap Closure Live Runtime Pi Package QA Addendum

QA Execution Mode: agent-operated

## Scope

This addendum records final live verification after the current-state gap closure implementation.

The environment did not contain a separate local Pi repository checkout under `D:\DEV`; practical Pi verification was therefore performed by installing the packed `@try-works/pi-role-model` package into a fresh temporary consumer project and exercising the same package extension/runtime APIs that Pi loads.

## Execution Record

- Packed package artifact: `evidence/artifacts/current-state-gap-closure-3/try-works-pi-role-model-0.1.1.tgz`.
- Fresh consumer install logs:
  - `evidence/logs/current-state-gap-closure-3/qa/pi-consumer-npm-init.log`
  - `evidence/logs/current-state-gap-closure-3/qa/pi-consumer-npm-install.log`
  - `evidence/logs/current-state-gap-closure-3/qa/pi-consumer-import-smoke.log`
- Final runtime QA server logs:
  - `evidence/logs/current-state-gap-closure-3/qa/runtime-qa-server.final.out.log`
  - `evidence/logs/current-state-gap-closure-3/qa/runtime-qa-server.final.err.log`
- Final live package/runtime QA log:
  - `evidence/logs/current-state-gap-closure-3/qa/pi-consumer-live-runtime-qa-final.log`

## Observed Results

- Runtime discovery via installed package returned `state: "ready"`.
- Runtime taxonomy resolved from the live runtime, not the package fallback.
- Runtime taxonomy counts were:
  - groups: `6`
  - roles: `28`
  - tasks: `280`
  - capabilities: `46`
  - modalities: `9`
  - tool classes: `15`
- Pi extension registration succeeded for provider `role-model`.
- Pi-style request hook injected:
  - `coder` / `coder.edit` for implementation prompts
  - `security` / `security.audit` for security review prompts
- Two live `/v1/chat/completions` requests completed through the runtime.
- Runtime telemetry and router decisions recorded both requests.
- Router candidates exposed canonical role bindings and did not expose `general.chat`, `coder.patch`, or `tool.agent`.
- Runtime packaging validation rebuilt the Windows executable and reported `roleDefinitionCount: 28`.

## Explicit Checks

- [x] Install package tarball into a clean consumer project.
- [x] Import package extension/source entry points from the installed tarball.
- [x] Discover live Role-Model runtime.
- [x] Read effective taxonomy from runtime.
- [x] Classify implementation prompt as `coder` / `coder.edit`.
- [x] Classify security prompt as `security` / `security.audit`.
- [x] Register Pi provider and command through the package extension.
- [x] Inject `role_model.intent` metadata through the Pi before-provider-request hook.
- [x] Send routed requests to the live runtime.
- [x] Confirm telemetry requests and router decisions are persisted.
- [x] Confirm router candidates do not contain legacy default role fixtures.

## TODO

- [x] Rebuild runtime and package surfaces.
- [x] Drive local runtime with a fresh installed package consumer.
- [x] Verify taxonomy, classification, routing, telemetry, and candidate role bindings end to end.

Audit: PASS
Coverage: PASS
Approval: PASS
