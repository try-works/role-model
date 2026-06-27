/**
 * Extract taxonomy dimensions from a normalizedIntent observation blob
 * into top-level indexed fields for telemetry filtering and aggregation.
 *
 * This is the canonical implementation used by both @role-model-router/core
 * and @role-model-router/runtime-observability.
 *
 * The original normalizedIntent blob is preserved unchanged — these are
 * additive extracted fields.
 *
 * @see TaxonomyBenchmarkDimension in taxonomy-dimensions.ts for the dimension registry
 */
export function extractTaxonomyDimensions(
  normalizedIntent: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!normalizedIntent) return undefined;

  const role = normalizedIntent.role as Record<string, unknown> | undefined;
  const task = normalizedIntent.task as Record<string, unknown> | undefined;

  return {
    taxonomy_role_id: role?.id ?? null,
    taxonomy_task_type: task?.id ?? null,
    taxonomy_role_source: normalizedIntent.roleSource ?? null,
    taxonomy_task_source: normalizedIntent.taskSource ?? null,
    taxonomy_confidence:
      typeof normalizedIntent.confidence === "number" ? normalizedIntent.confidence : null,
    taxonomy_version: normalizedIntent.taxonomyVersion ?? null,
    classification_contract_version: normalizedIntent.classificationContractVersion ?? null,
  };
}
