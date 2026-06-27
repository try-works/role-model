# Changelog

## v0.0.1-alpha.3 - 2026-06-27

Second alpha release of `role-model`.

This release adds taxonomy-aware request metadata and routing, benchmark scoring with
taxonomy dimensions, and taxonomy-aware telemetry observability. It also includes a
14x telemetry query performance improvement.

### Request Classification & Routing (Run 57)

- **Canonical Taxonomy V1**: 6 groups, 28 roles, 280 task types, 46 capabilities, 9 modalities, 15 tool classes.
  Every role includes classification signals used by Pi for group-first role scoring.
- **Runtime Taxonomy APIs**: Progressive-disclosure endpoints under `/api/role-model/taxonomy*` for
  discovery, validation, and normalization of role/task/capability/modality/tool metadata.
- **Pi Classification**: `pi-role-model` extension now classifies requests using progressive group/role/task
  scoring and injects `role_model.intent` metadata into provider requests. Runtime effective taxonomy
  takes precedence over the package snapshot when available.
- **Router Integration**: Hard taxonomy fields serve as eligibility filters; advisory fields affect scoring
  and diagnostics. Router decisions record normalized intent and classification metadata.
- **UI Integration**: Models/roles surfaces are group-aware with 6 group headings. Role assignment
  defaults to all roles with visible controls and high-risk role indicators.

### Benchmark-Aware Routing & Telemetry (Run 58)

- **Taxonomy Benchmark Schemas**: 4 new schema files under `schemas/role-model/taxonomy/` for
  benchmark suites, runs, results, and telemetry events with AJV validation.
- **Benchmark Case Tagging**: 15 routing-capability cases tagged with canonical taxonomy metadata
  covering 6 roles and 6 task types.
- **6-Dimension Score Aggregation**: Benchmark results aggregated by role, task, variant, capability,
  modality, and tool class. End-to-end pipeline: runner extracts tags → persisted result includes context →
  summary API computes per-dimension aggregates.
- **Task-Specific Routing**: Router blends overall benchmark score with task-specific score when
  benchmark data exists for the requested task type. Blend weights configurable via runtime config.
- **Telemetry Taxonomy Dimensions**: `taxonomyRoleId` and `taxonomyTaskType` added to telemetry
  analytics API for filtering and aggregation. UI observe-routing filters extended with taxonomy inputs.
- **Privacy & Retention**: `privacyReceipt` on observation bundles with configurable sampling rate,
  retention TTL, and indexed `retain_until_ms` column for efficient cleanup.
- **Difficulty Classifier Fix**: When `difficultyClassifier.modelId` is null, falls back to controller's
  `modelId` instead of silently degrading to basic routing.
- **Performance**: Telemetry 7-day query reduced from 5,026ms to 349ms (14x) by replacing per-record
  SQLite open/close with batch column reads and indexed metadata extraction.

## v0.0.1-alpha.1 - 2026-06-22

First alpha release of `role-model`.

This release publishes the Role-Model router runtime together with the public Pi integration package. It is an
early release intended for installation testing, Pi integration validation, and feedback on the runtime routing
workflow.

Highlights:

- Released the packaged Role-Model router runtime for Windows, macOS, and Linux through GitHub Releases.
- Added installer assets and checksums for the standalone runtime distribution.
- Published the public `@try-works/pi-role-model` package for installing Role-Model support into Pi.
- Added the Pi Role-Model skill and commands for setup, doctor checks, alias discovery, alias selection, and
  routing through the Role-Model runtime.
- Documented Pi installation from npm, local checkout installation, endpoint configuration with
  `ROLE_MODEL_ENDPOINT`, and remote/authentication safety behavior.
- Verified the Pi package can connect Pi to an externally running Role-Model runtime and route OpenAI-compatible
  requests through the Role-Model downstream endpoint.

## Release Notes

The generated per-release changelog is also published in GitHub Releases.

For tagged releases, the repo-authored release body is generated from recursive artifacts in the release commit
range, especially:

- `/.recursive/run/**/03-implementation-summary.md`
- `/.recursive/run/**/06-decisions-update.md`
- `/.recursive/run/**/07-state-update.md`
- fallback deltas from `/.recursive/DECISIONS.md` and `/.recursive/STATE.md` when the structured receipts are not
  present in the same commit

GitHub's generated release notes are still included alongside that recursive changelog so merged PRs,
contributors, and uncategorized changes remain visible.

This project uses release tags of the form `vX.Y.Z` and follows Semantic Versioning for its public release
surface.

## Operator Notes

- Do not hand-maintain per-version sections in this file.
- Instead, make sure the recursive implementation, decisions, and state receipts are present and locked in the
  commits you intend to ship.
- The release workflow reads those artifacts directly when the tag is published.
