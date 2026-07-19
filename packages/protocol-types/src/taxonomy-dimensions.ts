export type TaxonomyDimensionValueMode = "single" | "multi";
export type TaxonomyDimensionValueSource = "original" | "normalized" | "derived";
type TaxonomyAnalyticsDimensionDefinition = {
  readonly id: string;
  readonly telemetryKey: string;
  readonly benchmarkDimension?: string;
  readonly valueMode: TaxonomyDimensionValueMode;
  readonly valueSource: TaxonomyDimensionValueSource;
  readonly telemetryAnalyticsCapable: boolean;
  readonly uiFilterable: boolean;
};

export const TAXONOMY_ANALYTICS_DIMENSIONS = [
  {
    id: "taxonomyGroupId",
    telemetryKey: "taxonomy_group_id",
    valueMode: "single",
    valueSource: "derived",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyRoleId",
    telemetryKey: "taxonomy_role_id",
    benchmarkDimension: "byRole",
    valueMode: "single",
    valueSource: "normalized",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyTaskType",
    telemetryKey: "taxonomy_task_type",
    benchmarkDimension: "byTask",
    valueMode: "single",
    valueSource: "normalized",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyTaskVariant",
    telemetryKey: "taxonomy_task_variant",
    benchmarkDimension: "byVariant",
    valueMode: "single",
    valueSource: "normalized",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyCapabilityId",
    telemetryKey: "taxonomy_capability_ids",
    benchmarkDimension: "byCapability",
    valueMode: "multi",
    valueSource: "normalized",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyModalityId",
    telemetryKey: "taxonomy_modality_ids",
    benchmarkDimension: "byModality",
    valueMode: "multi",
    valueSource: "normalized",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyToolClassId",
    telemetryKey: "taxonomy_tool_class_ids",
    benchmarkDimension: "byToolClass",
    valueMode: "multi",
    valueSource: "normalized",
    telemetryAnalyticsCapable: true,
    uiFilterable: true,
  },
  {
    id: "taxonomyOriginalRoleHintId",
    telemetryKey: "taxonomy_original_role_hint_id",
    valueMode: "single",
    valueSource: "original",
    telemetryAnalyticsCapable: false,
    uiFilterable: false,
  },
  {
    id: "taxonomyOriginalTaskType",
    telemetryKey: "taxonomy_original_task_type",
    valueMode: "single",
    valueSource: "original",
    telemetryAnalyticsCapable: false,
    uiFilterable: false,
  },
  {
    id: "taxonomyClassificationSource",
    telemetryKey: "taxonomy_classification_source",
    valueMode: "single",
    valueSource: "original",
    telemetryAnalyticsCapable: false,
    uiFilterable: false,
  },
] as const satisfies readonly TaxonomyAnalyticsDimensionDefinition[];

export type TaxonomyAnalyticsDimension = (typeof TAXONOMY_ANALYTICS_DIMENSIONS)[number];
export type TaxonomyAnalyticsDimensionId = TaxonomyAnalyticsDimension["id"];

export type TaxonomyBenchmarkDimension = NonNullable<
  TaxonomyAnalyticsDimensionDefinition["benchmarkDimension"]
>;

export const TAXONOMY_BENCHMARK_DIMENSIONS = TAXONOMY_ANALYTICS_DIMENSIONS.flatMap((dimension) =>
  "benchmarkDimension" in dimension && dimension.benchmarkDimension
    ? [dimension.benchmarkDimension]
    : [],
) as readonly TaxonomyBenchmarkDimension[];

export const TAXONOMY_UI_FILTER_DIMENSIONS = TAXONOMY_ANALYTICS_DIMENSIONS.filter(
  (dimension) => dimension.uiFilterable,
).map((dimension) => dimension.id) as readonly Extract<
  TaxonomyAnalyticsDimensionId,
  | "taxonomyGroupId"
  | "taxonomyRoleId"
  | "taxonomyTaskType"
  | "taxonomyTaskVariant"
  | "taxonomyCapabilityId"
  | "taxonomyModalityId"
  | "taxonomyToolClassId"
>[];

export type TaxonomyDimensionScoreMap = Record<TaxonomyBenchmarkDimension, Record<string, number>>;
