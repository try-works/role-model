/**
 * Bridge benchmark cases and results to taxonomy dimensions.
 *
 * This module provides type-safe accessors for taxonomy tags on benchmark
 * cases and taxonomy aggregates on benchmark results. It is the benchmark
 * counterpart to telemetry-linkage.ts (SP5).
 *
 * Extension points:
 * - Custom benchmark suite types can add provider-specific taxonomy fields
 *   via the `additionalProperties: true` on benchmark schemas.
 * - Future taxonomy versions can add dimension fields by extending the
 *   TaxonomyCaseTags interface and updating the canonical validation.
 */
import type { TaxonomyDimensionScoreMap } from "@role-model/protocol-types";
import { TAXONOMY_BENCHMARK_DIMENSIONS } from "@role-model/protocol-types";

/** A benchmark case with optional taxonomy tags (subset of RoutingBenchmarkCase). */
export interface TaggedBenchmarkCase {
  readonly case_id: string;
  readonly taxonomy_tags?: TaxonomyCaseTags;
}

/** Taxonomy tags attached to a benchmark case. */
export interface TaxonomyCaseTags {
  readonly roleId: string;
  readonly taskType: string;
  readonly variant?: string;
  readonly requiredCapabilities?: readonly string[];
  readonly preferredCapabilities?: readonly string[];
  readonly requiredModalities?: readonly string[];
  readonly toolClasses?: readonly string[];
}

/** Taxonomy score aggregates for a benchmark result. Derived from the dimension registry. */
export type TaxonomyScoreAggregates = Partial<TaxonomyDimensionScoreMap>;

/**
 * Extract taxonomy tags from a benchmark case, if present.
 * Returns undefined for cases that have not been tagged.
 */
export function getCaseTaxonomyTags(
  caseItem: TaggedBenchmarkCase,
): TaxonomyCaseTags | undefined {
  const tags = caseItem.taxonomy_tags;
  if (!tags) return undefined;
  return {
    roleId: tags.roleId,
    taskType: tags.taskType,
    variant: tags.variant,
    requiredCapabilities: tags.requiredCapabilities,
    preferredCapabilities: tags.preferredCapabilities,
    requiredModalities: tags.requiredModalities,
    toolClasses: tags.toolClasses,
  };
}

/**
 * Build a lookup map from case IDs to their taxonomy tags.
 * Useful for passing to computeTaxonomyAggregates in benchmark-summary.ts.
 */
export function buildCaseTaxonomyTagMap(
  cases: readonly TaggedBenchmarkCase[],
): Record<string, TaxonomyCaseTags> {
  const map: Record<string, TaxonomyCaseTags> = {};
  for (const c of cases) {
    const tags = getCaseTaxonomyTags(c);
    if (tags) {
      map[c.case_id] = tags;
    }
  }
  return map;
}

/**
 * Validate that taxonomy tag references resolve against a set of
 * canonical dimension IDs. Returns an array of diagnostics for
 * tags that reference unknown IDs.
 */
export function validateCaseTaxonomyTags(
  cases: readonly TaggedBenchmarkCase[],
  validRoleIds: ReadonlySet<string>,
  validTaskTypeIds: ReadonlySet<string>,
  validCapabilityIds: ReadonlySet<string>,
  validModalityIds: ReadonlySet<string>,
  validToolClassIds: ReadonlySet<string>,
): readonly { caseId: string; code: string; message: string }[] {
  const diagnostics: Array<{ caseId: string; code: string; message: string }> = [];
  for (const c of cases) {
    const tags = c.taxonomy_tags;
    if (!tags) continue;
    if (!validRoleIds.has(tags.roleId)) {
      diagnostics.push({
        caseId: c.case_id,
        code: "UNKNOWN_ROLE_ID",
        message: `Unknown role ID "${tags.roleId}"`,
      });
    }
    if (!validTaskTypeIds.has(tags.taskType)) {
      diagnostics.push({
        caseId: c.case_id,
        code: "UNKNOWN_TASK_TYPE",
        message: `Unknown task type "${tags.taskType}"`,
      });
    }
    for (const cap of tags.requiredCapabilities ?? []) {
      if (!validCapabilityIds.has(cap)) {
        diagnostics.push({
          caseId: c.case_id,
          code: "UNKNOWN_CAPABILITY",
          message: `Unknown capability "${cap}"`,
        });
      }
    }
    for (const mod of tags.requiredModalities ?? []) {
      if (!validModalityIds.has(mod)) {
        diagnostics.push({
          caseId: c.case_id,
          code: "UNKNOWN_MODALITY",
          message: `Unknown modality "${mod}"`,
        });
      }
    }
    for (const tc of tags.toolClasses ?? []) {
      if (!validToolClassIds.has(tc)) {
        diagnostics.push({
          caseId: c.case_id,
          code: "UNKNOWN_TOOL_CLASS",
          message: `Unknown tool class "${tc}"`,
        });
      }
    }
  }
  return diagnostics;
}
