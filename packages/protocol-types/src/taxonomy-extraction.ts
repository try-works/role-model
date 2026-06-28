function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueSortedStrings(values: readonly unknown[]): string[] | null {
  const strings = Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)),
  ).sort((left, right) => left.localeCompare(right));
  return strings.length > 0 ? strings : null;
}

function readAlternatives(
  value: unknown,
): readonly Readonly<Record<string, unknown>>[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const alternatives = value.filter(
    (entry): entry is Readonly<Record<string, unknown>> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry),
  );
  return alternatives.length > 0 ? alternatives : null;
}

export function extractTaxonomyDimensions(
  normalizedIntent: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!normalizedIntent) return undefined;

  const role = normalizedIntent.role as Record<string, unknown> | undefined;
  const task = normalizedIntent.task as Record<string, unknown> | undefined;
  const capabilities = normalizedIntent.capabilities as Record<string, unknown> | undefined;
  const modalities = normalizedIntent.modalities as Record<string, unknown> | undefined;
  const toolClasses = Array.isArray(normalizedIntent.toolClasses) ? normalizedIntent.toolClasses : [];
  const alternatives = readAlternatives(normalizedIntent.alternatives);
  const capabilityIds = uniqueSortedStrings([
    ...((Array.isArray(capabilities?.required) ? capabilities.required : []) as readonly unknown[]),
    ...((Array.isArray(capabilities?.preferred)
      ? capabilities.preferred
      : []) as readonly unknown[]),
  ]);
  const modalityIds = uniqueSortedStrings([
    ...((Array.isArray(modalities?.required) ? modalities.required : []) as readonly unknown[]),
    ...((Array.isArray(modalities?.output) ? modalities.output : []) as readonly unknown[]),
  ]);
  const toolClassIds = uniqueSortedStrings(toolClasses);
  const alternativeRoleIds = uniqueSortedStrings(
    (alternatives ?? []).map((alternative) => alternative.roleId),
  );
  const alternativeTaskTypes = uniqueSortedStrings(
    (alternatives ?? []).map((alternative) => alternative.taskType),
  );

  return {
    taxonomy_original_role_hint_id:
      readString(normalizedIntent.originalRoleHintId) ?? readString(role?.id),
    taxonomy_original_task_type:
      readString(normalizedIntent.originalTaskType) ?? readString(task?.id),
    taxonomy_group_id: readString(normalizedIntent.groupId),
    taxonomy_role_id: readString(role?.id),
    taxonomy_task_type: readString(task?.id),
    taxonomy_task_action: readString(normalizedIntent.taskAction),
    taxonomy_task_variant:
      normalizedIntent.taskVariant === null ? null : readString(normalizedIntent.taskVariant),
    taxonomy_capability_ids: capabilityIds,
    taxonomy_modality_ids: modalityIds,
    taxonomy_tool_class_ids: toolClassIds,
    taxonomy_role_source: readString(normalizedIntent.roleSource),
    taxonomy_task_source: readString(normalizedIntent.taskSource),
    taxonomy_classification_source: readString(normalizedIntent.source),
    taxonomy_confidence: readNumber(normalizedIntent.confidence),
    taxonomy_task_confidence: readNumber(normalizedIntent.taskConfidence),
    taxonomy_alternative_count: alternatives?.length ?? null,
    taxonomy_alternative_role_ids: alternativeRoleIds,
    taxonomy_alternative_task_types: alternativeTaskTypes,
    taxonomy_version: readString(normalizedIntent.taxonomyVersion),
    taxonomy_content_revision: readString(normalizedIntent.contentRevision),
    classification_contract_version: readString(normalizedIntent.classificationContractVersion),
  };
}
