# Taxonomy V1

Status: `CURRENT`
Owns-Paths: `schemas/role-model/taxonomy/**`, `role-model-router/packages/core/data/taxonomy/**`, `role-model-router/packages/core/src/taxonomy/**`, `docs/protocol/taxonomy-v1.md`
Watch-Paths: `packages/pi-role-model/data/taxonomy/**`, `packages/pi-role-model/src/taxonomy/**`
Created: `2026-06-23`
Last Validated: `2026-06-27`
Validated By: `260626-still-diamond`

## Canonical Catalog

| Entity | Count | Source |
|--------|-------|--------|
| Groups | 6 | `groups.json` |
| Roles | 28 | `roles.json` |
| Task types | 280 | `task-types.json` |
| Capabilities | 46 | `capabilities.json` |
| Modalities | 9 | `modalities.json` |
| Tool classes | 15 | `tool-classes.json` |
| Intent presets | 0 | `intent-presets.json` |

## Groups and Role Membership

| Group ID | Label | Primary Roles | Secondary Roles |
|----------|-------|---------------|-----------------|
| `engineering` | Engineering | coder, architect, operator, tester, security, data | — |
| `product_design` | Product And Design | product, designer, planner, analyst | — |
| `knowledge_research` | Knowledge And Research | researcher, knowledge, scientist, mathematician, educator | health |
| `business` | Business | strategist, marketer, seller, finance, procurement | legal, recruiter |
| `communication` | Communication | writer, translator, creative, support, coordinator | — |
| `governance_safety` | Governance And Safety | legal, health, recruiter | security, finance |

Every role has exactly one `primaryGroupId` and zero or more `secondaryGroupIds`. Groups are UI/discovery objects, not routing roles.

## Classification Fields

All 28 roles carry a `classification` object used by the Pi classifier:

```json
{
  "id": "operator",
  "classification": {
    "summary": "Use when the request is about runtime, deployment, configuration, installation, diagnostics, incidents, or operational work.",
    "positiveSignals": ["debug", "startup", "launch", "install", "configure", "deploy", "runtime", "server", "process", "port", "environment", "incident", "outage", "alert", "monitor", "backup", "restore", "release execute"],
    "negativeSignals": ["design a new feature", "write marketing copy", "legal review"]
  }
}
```

These fields drive `scoreRoleForPrompt()` in the Pi classifier: positiveSignals give +2 per match, negativeSignals give -3 per match, summary words give +1 per match.

## Versioning

Five separate version axes:

| Axis | Field | Value |
|------|-------|-------|
| Schema version | `schemaVersion` | `role-model.taxonomy.schema.v1` |
| Taxonomy version | `taxonomyVersion` | `1.0.0-alpha.1` (semver) |
| Database version | `databaseVersion` | `1` (monotonic integer) |
| Content revision | `contentRevision` | `taxonomy-v1-alpha.1` |
| Classification contract | `classificationContractVersion` | `role-model.classification.v1` |

## Deprecation

All 7 entity schemas support `stability: "deprecated"` with optional `replacement` (ID of replacement entry) and `deprecationReason` (human-readable string) fields.

## Docs Generation

`scripts/generate-taxonomy-docs.ts` reads canonical JSON from `core/data/taxonomy/` and produces 6 markdown tables (groups, roles, task types, capabilities, modalities, tool classes) injected into `docs/protocol/taxonomy-v1.md` between `<!-- AUTO-GENERATED-TAXONOMY-TABLES-START -->` and `<!-- END -->` markers. The `taxonomy-docs.test.ts` test validates that generated content is present and markers exist.

## Pi Compact Taxonomy

Package `packages/pi-role-model/data/taxonomy/` contains a compact snapshot with:
- `compact-manifest.json` — versions, counts, hashes, file paths
- `compact-groups.json` / `groups/{groupId}.json` — 6 group files
- `compact-role-summaries.json` — 28 role summaries with classification fields
- `compact-role-task-index.json` — role→task ID and label index
- `roles/{roleId}/tasks.compact.json` — 28 task chunk files, each under 20KB
- `compact-classification-guide.json` — group keyword hints and algorithm steps

## Schema Files

13 JSON Schema files under `schemas/role-model/taxonomy/`:
`taxonomy`, `manifest`, `group`, `role`, `task-type`, `capability`, `modality`, `tool-class`, `intent-preset`, `classification`, `model-role-assignment`, `effective-taxonomy`, `routing-policy-binding`
