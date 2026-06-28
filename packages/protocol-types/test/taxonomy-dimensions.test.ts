import { describe, expect, test } from "vitest";

import {
  TAXONOMY_ANALYTICS_DIMENSIONS,
  TAXONOMY_BENCHMARK_DIMENSIONS,
  TAXONOMY_UI_FILTER_DIMENSIONS,
} from "../src/index.js";

describe("taxonomy analytics dimension authority", () => {
  test("defines one canonical telemetry analytics registry with benchmark and UI views derived from it", () => {
    expect(TAXONOMY_ANALYTICS_DIMENSIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "taxonomyGroupId",
          telemetryKey: "taxonomy_group_id",
          valueMode: "single",
          valueSource: "derived",
          telemetryAnalyticsCapable: true,
          uiFilterable: true,
        }),
        expect.objectContaining({
          id: "taxonomyRoleId",
          telemetryKey: "taxonomy_role_id",
          benchmarkDimension: "byRole",
          valueMode: "single",
          valueSource: "normalized",
          telemetryAnalyticsCapable: true,
          uiFilterable: true,
        }),
        expect.objectContaining({
          id: "taxonomyTaskVariant",
          telemetryKey: "taxonomy_task_variant",
          benchmarkDimension: "byVariant",
          valueMode: "single",
          telemetryAnalyticsCapable: true,
          uiFilterable: true,
        }),
        expect.objectContaining({
          id: "taxonomyCapabilityId",
          telemetryKey: "taxonomy_capability_ids",
          benchmarkDimension: "byCapability",
          valueMode: "multi",
          telemetryAnalyticsCapable: true,
          uiFilterable: true,
        }),
        expect.objectContaining({
          id: "taxonomyClassificationSource",
          telemetryKey: "taxonomy_classification_source",
          valueMode: "single",
          valueSource: "original",
          telemetryAnalyticsCapable: false,
          uiFilterable: false,
        }),
      ]),
    );

    expect(TAXONOMY_BENCHMARK_DIMENSIONS).toEqual([
      "byRole",
      "byTask",
      "byVariant",
      "byCapability",
      "byModality",
      "byToolClass",
    ]);

    expect(TAXONOMY_UI_FILTER_DIMENSIONS).toEqual([
      "taxonomyGroupId",
      "taxonomyRoleId",
      "taxonomyTaskType",
      "taxonomyTaskVariant",
      "taxonomyCapabilityId",
      "taxonomyModalityId",
      "taxonomyToolClassId",
    ]);
  });
});
