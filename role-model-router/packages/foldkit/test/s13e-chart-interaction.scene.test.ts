import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { inertHtml } from "../dist/html.js";
import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import { view as chartView } from "../../ui/src/foldkit-chart";
import {
  type ChartInteractionState,
  type ChartTooltip,
  initialChartInteraction,
  updateChartInteraction,
} from "../../ui/src/foldkit-chart-interaction";

setup();

/**
 * Run 115 S13e (R9): legend/tooltip interaction, stale range suppression, a stable theme
 * variant, and two collision-free chart instances. Pure SVG + Foldkit Messages; no ECharts.
 */

const Message = defineMessageUnion({
  HideTooltip: {},
  ShowPoint: { seriesId: Schema.String, label: Schema.String },
  ToggleSeries: { seriesId: Schema.String },
});
type Message = typeof Message.Type;

interface Model {
  readonly hidden: ReadonlyArray<string>;
  readonly tooltip: ChartTooltip | null;
  readonly theme: "light" | "dark";
}

const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  Message.match(message, {
    ToggleSeries: ({ seriesId }) => ({
      model: {
        ...model,
        hidden: model.hidden.includes(seriesId)
          ? model.hidden.filter((id) => id !== seriesId)
          : [...model.hidden, seriesId],
      },
    }),
    ShowPoint: ({ seriesId, label }) => ({
      model: { ...model, tooltip: { label, seriesId } },
    }),
    HideTooltip: () => ({ model: { ...model, tooltip: null } }),
  });

const series = [
  {
    id: "local",
    label: "Local",
    points: [
      { label: "09:00", value: 12 },
      { label: "09:05", value: 18 },
      { label: "09:10", value: 9 },
    ],
  },
  {
    id: "remote",
    label: "Remote",
    points: [
      { label: "09:00", value: 4 },
      { label: "09:05", value: 7 },
      { label: "09:10", value: 5 },
    ],
  },
];

const baseConfig = {
  ariaLabel: "Requests per minute by source",
  series,
  title: "Requests per minute",
  yUnit: "req",
} as const;

const sceneView = (model: Model, h: HtmlBuilder<Message>): Html =>
  chartView<Message>(
    {
      ...baseConfig,
      theme: model.theme,
      interaction: {
        hiddenSeriesIds: model.hidden,
        onHideTooltip: Message.HideTooltip(),
        onShowPoint: (seriesId, label) => Message.ShowPoint({ label, seriesId }),
        onToggleSeries: (seriesId) => Message.ToggleSeries({ seriesId }),
        tooltip: model.tooltip,
      },
    },
    h,
  );

describe("S13e chart interaction", () => {
  it("legend toggles series visibility and the accessible table follows it; a point exposes exact value and unit", () => {
    Scene.scene(
      { update, view: sceneView },
      Scene.given({ hidden: [], theme: "light", tooltip: null }),
      Scene.expect(Scene.selector("table")).toContainText("Local"),
      Scene.expectAll(Scene.all.selector("path.rm3-chart-series")).toHaveCount(2),
      Scene.expect(
        Scene.selector('button.rm3-chart-legend-toggle[data-chart-series-id="local"]'),
      ).toHaveAttr("aria-pressed", "true"),
      Scene.click(Scene.selector('button.rm3-chart-legend-toggle[data-chart-series-id="local"]')),
      Scene.expectHandled(),
      Scene.expectAll(Scene.all.selector("path.rm3-chart-series")).toHaveCount(1),
      Scene.expect(Scene.selector("table")).not.toContainText("Local"),
      Scene.expect(
        Scene.selector('button.rm3-chart-legend-toggle[data-chart-series-id="local"]'),
      ).toHaveAttr("aria-pressed", "false"),
      Scene.click(
        Scene.selector(
          'circle.rm3-chart-point[data-chart-series-id="remote"][data-chart-point-label="09:05"]',
        ),
      ),
      Scene.expectHandled(),
      Scene.expect(Scene.selector("[data-chart-tooltip]")).toContainText("Remote: 09:05 = 7 req"),
      Scene.expect(
        Scene.selector(
          'circle.rm3-chart-point[data-chart-series-id="remote"][data-chart-point-label="09:05"]',
        ),
      ).toHaveAccessibleName("Remote: 09:05 = 7 req"),
      Scene.click(Scene.selector('button.rm3-chart-legend-toggle[data-chart-series-id="local"]')),
      Scene.expectHandled(),
      Scene.expectAll(Scene.all.selector("path.rm3-chart-series")).toHaveCount(2),
      Scene.expect(Scene.selector("table")).toContainText("Local"),
    );
  });

  it("range switching issues monotonic tokens and a stale response resolved last cannot win", () => {
    const oldSeries = [{ id: "old", label: "Old", points: [{ label: "old", value: 1 }] }];
    const newSeries = [{ id: "new", label: "New", points: [{ label: "new", value: 2 }] }];
    const initial = initialChartInteraction({ range: "1h", series: oldSeries });
    const first = updateChartInteraction(initial, { type: "SwitchRange", range: "24h" });
    const second = updateChartInteraction(first.state, { type: "SwitchRange", range: "7d" });
    expect(first.command).toMatchObject({ token: 1, range: "24h" });
    expect(second.command).toMatchObject({ token: 2, range: "7d" });

    const newLoaded = updateChartInteraction(second.state, {
      type: "RangeLoaded",
      token: 2,
      range: "7d",
      series: newSeries,
    });
    const oldResolvedLast = updateChartInteraction(newLoaded.state, {
      type: "RangeLoaded",
      token: 1,
      range: "24h",
      series: oldSeries,
    });
    expect(oldResolvedLast.state.series).toBe(newSeries);
    expect(oldResolvedLast.state.range).toBe("7d");
    const rendered = JSON.stringify(
      chartView({ series: oldResolvedLast.state.series, title: "Range" }, inertHtml),
    );
    expect(rendered).toContain("New");
    expect(rendered).not.toContain("Old");
  });

  it("a theme change keeps series identity and point count; only the theme class differs", () => {
    const light = chartView({ ...baseConfig, theme: "light" }, inertHtml);
    const dark = chartView({ ...baseConfig, theme: "dark" }, inertHtml);
    const lightJson = JSON.stringify(light);
    const darkJson = JSON.stringify(dark);
    expect(lightJson.replace(/rm3-chart-theme-light/g, "THEME")).toBe(
      darkJson.replace(/rm3-chart-theme-dark/g, "THEME"),
    );
    expect((lightJson.match(/data-chart-series-id/g) ?? []).length).toBe(
      (darkJson.match(/data-chart-series-id/g) ?? []).length,
    );
    expect((lightJson.match(/rm3-chart-point/g) ?? []).length).toBe(6);
    expect((darkJson.match(/rm3-chart-point/g) ?? []).length).toBe(6);
    expect(lightJson).not.toContain('"id"');
    expect(darkJson).not.toContain('"id"');
  });

  it("two charts on one page render independently with no ids or shared interaction state", () => {
    const first = initialChartInteraction({ range: "1h", series });
    const second = initialChartInteraction({ range: "1h", series });
    const firstHidden = updateChartInteraction(first, {
      type: "ToggleSeries",
      seriesId: "local",
    }).state;
    const combined = (h) =>
      h.div(
        [],
        [
          chartView(
            {
              ...baseConfig,
              title: "First",
              interaction: { hiddenSeriesIds: firstHidden.hiddenSeriesIds },
            },
            h,
          ),
          chartView(
            {
              ...baseConfig,
              title: "Second",
              interaction: { hiddenSeriesIds: second.hiddenSeriesIds },
            },
            h,
          ),
        ],
      );
    const rendered = JSON.stringify(combined(inertHtml));
    expect(rendered).not.toContain('"id"');
    expect((rendered.match(/rm3-chart-svg/g) ?? []).length).toBe(2);
    expect((rendered.match(/rm3-chart-series/g) ?? []).length).toBe(3);
    expect((rendered.match(/rm3-chart-point/g) ?? []).length).toBe(9);
    expect(second.hiddenSeriesIds).toEqual([]);
  });
});
