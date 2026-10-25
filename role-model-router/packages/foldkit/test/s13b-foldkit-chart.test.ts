import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import { boundedChartReason, view as chartView } from "../../ui/src/foldkit-chart";
import { inertHtml } from "../dist/html.js";

setup();

/**
 * Run 115 S13b (R9 first slice): the React-free, renderer-agnostic chart primitive.
 *
 * Modelled on the vendored Crease pure-SVG helpers (vendor/crease/src/ui/chart.ts:193-253 for the
 * SVG shape/role=img pattern; vendor/crease/src/lib/echarts.ts:604-610 for the accessible HTML
 * alternative). No ECharts import, no canvas, no Mount: the lazy mount renderer is R10.
 */

const Message = defineMessageUnion({ Noop: {} });
type Message = typeof Message.Type;
type Model = Readonly<{ name: string }>;

const update = (model: Model, _message: Message): UpdateReturn<Model, Message> => ({ model });

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

const viewConfig = {
  ariaLabel: "Requests per minute by source",
  series,
  title: "Requests per minute",
  yUnit: "req",
} as const;

type TestChartState =
  | { readonly status: "ready" }
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly reason: string }
  | { readonly status: "stale"; readonly ageMs: number; readonly ruleMs: number }
  | { readonly status: "truncated"; readonly droppedPoints: number };

interface TestChartConfig {
  readonly ariaLabel?: string;
  readonly description?: string;
  readonly series: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly points: ReadonlyArray<{ readonly label: string; readonly value: number }>;
    readonly color?: string;
  }>;
  readonly title: string;
  readonly yUnit?: string;
  readonly state?: TestChartState;
}

const sceneView =
  (config: TestChartConfig) =>
  (_model: Model, h: HtmlBuilder<Message>): Html =>
    chartView(config, h);

const chart = Scene.role("img");
const seriesPaths = Scene.all.selector("path.rm3-chart-series");

describe("RM3 chart primitive", () => {
  it("renders a pure SVG with axes, one token-coloured path per series, points and an accessible name", () => {
    Scene.scene(
      { update, view: sceneView(viewConfig) },
      Scene.given({ name: "chart" }),
      Scene.expect(chart).toExist(),
      Scene.expect(chart).toHaveAccessibleName("Requests per minute by source"),
      Scene.expect(chart).toHaveAttr("viewBox", "0 0 640 220"),
      Scene.expect(Scene.selector("line.rm3-chart-axis")).toExist(),
      Scene.expect(Scene.selector("line.rm3-chart-grid")).toExist(),
      Scene.expectAll(seriesPaths).toHaveCount(2),
      Scene.expect(Scene.selector("path.rm3-chart-series")).toHaveClass("rm3-chart-series"),
      Scene.expect(Scene.selector("path.rm3-chart-series")).toHaveClass(
        "stroke-[var(--color-chart-1)]",
      ),
      Scene.expect(Scene.selector("circle.rm3-chart-point")).toExist(),
      Scene.expect(Scene.selector("text.rm3-chart-axis-label")).toContainText("req"),
    );
  });

  it("renders a numeric HTML text alternative with a caption, headers and every value", () => {
    Scene.scene(
      { update, view: sceneView(viewConfig) },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector("table")).toExist(),
      Scene.expect(Scene.selector("table")).toHaveClass("sr-only"),
      Scene.expect(Scene.selector("table")).toContainText("Requests per minute data"),
      Scene.expect(Scene.selector("table")).toContainText("09:00"),
      Scene.expect(Scene.selector("table")).toContainText("Local"),
      Scene.expect(Scene.selector("table")).toContainText("Remote"),
      Scene.expect(Scene.selector("table")).toContainText("18"),
      Scene.expect(Scene.selector("table")).toContainText("req"),
    );
  });

  it("keeps every ragged-series point in the table and associates values by label, not index", () => {
    // Reviewer failing input 1: A has only 'a'; B has 'a' and 'b'. The old table built rows from
    // series[0] and indexed each series by that index, so B's b=3 never appeared.
    Scene.scene(
      {
        update,
        view: sceneView({
          series: [
            { id: "a", label: "A", points: [{ label: "a", value: 1 }] },
            { id: "b", label: "B", points: [{ label: "a", value: 2 }, { label: "b", value: 3 }] },
          ],
          title: "Ragged",
        }),
      },
      Scene.given({ name: "chart" }),
      // Two union rows: [a: A=1, B=2] and [b: A=—, B=3]. The old row set had one row (a 1 2).
      Scene.expectAll(Scene.all.selector("tbody tr")).toHaveCount(2),
      Scene.expect(Scene.selector("tbody")).toHaveText("a12b—3"),
    );
  });

  it("does not put a differently-labelled series value under the first series label", () => {
    // Reviewer failing input 2: equal-length series with different labels. B's 10:00 value must be
    // under 10:00 (and A absent there), not under A's 09:00 label.
    Scene.scene(
      {
        update,
        view: sceneView({
          series: [
            {
              id: "a",
              label: "A",
              points: [
                { label: "09:00", value: 1 },
                { label: "09:05", value: 2 },
              ],
            },
            {
              id: "b",
              label: "B",
              points: [
                { label: "10:00", value: 3 },
                { label: "10:05", value: 4 },
              ],
            },
          ],
          title: "Unequal",
        }),
      },
      Scene.given({ name: "chart" }),
      // Union order: A's 09:00/09:05 then B's 10:00/10:05. B's values sit under B's own labels.
      // The old table produced two rows (09:00 A=1 B=3, 09:05 A=2 B=4): wrong association.
      Scene.expectAll(Scene.all.selector("tbody tr")).toHaveCount(4),
      Scene.expect(Scene.selector("tbody")).toHaveText("09:001—09:052—10:00—310:05—4"),
      // The SVG x-axis is built from the same union, so 10:00 is labelled too.
      Scene.expect(Scene.selector("svg")).toContainText("09:00"),
      Scene.expect(Scene.selector("svg")).toContainText("10:00"),
    );
  });

  it("a ready render whose series have no usable points collapses to the documented empty state", () => {
    // Documented collapse: usable = points.length > 0; ready + no usable series becomes empty and the
    // legend is dropped. This test freezes that behaviour instead of leaving it implied.
    Scene.scene(
      {
        update,
        view: sceneView({
          series: [{ id: "empty", label: "Empty", points: [] }],
          title: "Collapsed",
        }),
      },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="empty"]')).toExist(),
      Scene.expect(Scene.selector("[data-chart-empty]")).toContainText("No chart data available."),
      Scene.expect(Scene.selector("svg")).toBeAbsent(),
      Scene.expect(Scene.selector("ul.rm3-chart-legend")).toBeAbsent(),
    );
  });

  it("renders an explicit empty state instead of an empty chart", () => {
    Scene.scene(
      { update, view: sceneView({ series: [], title: "Requests per minute" }) },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector("svg")).toBeAbsent(),
      Scene.expect(Scene.selector("table")).toBeAbsent(),
      Scene.expect(Scene.selector("[data-chart-empty]")).toExist(),
      Scene.expect(Scene.selector("[data-chart-empty]")).toContainText("No chart data available."),
    );
  });
});

describe("RM3 chart states and render policy", () => {
  const stateConfig = (state: TestChartState): TestChartConfig => ({
    ...viewConfig,
    state,
  });

  it("loading is its own state: a live status message, no chart and no table", () => {
    Scene.scene(
      { update, view: sceneView(stateConfig({ status: "loading" })) },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="loading"]')).toExist(),
      Scene.expect(Scene.role("status")).toHaveAttr("aria-busy", "true"),
      Scene.expect(Scene.role("status")).toContainText("Loading chart data"),
      Scene.expect(Scene.selector("svg")).toBeAbsent(),
      Scene.expect(Scene.selector("table")).toBeAbsent(),
    );
  });

  it("error is its own state with a bounded, single-line reason", () => {
    const hostile = `first line\nsecond\tline ${"x".repeat(400)}`;
    const bounded = boundedChartReason(hostile);
    expect(bounded).not.toContain("\n");
    expect(bounded.length).toBeLessThanOrEqual(160);
    expect(bounded.length).toBeGreaterThan(0);

    Scene.scene(
      { update, view: sceneView(stateConfig({ reason: hostile, status: "error" })) },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="error"]')).toExist(),
      Scene.expect(Scene.role("alert")).toContainText("Chart unavailable"),
      Scene.expect(Scene.role("alert")).toContainText(bounded.slice(0, 40)),
      Scene.expect(Scene.selector("svg")).toBeAbsent(),
      Scene.expect(Scene.selector("table")).toBeAbsent(),
    );
  });

  it("stale is its own state: data stays, with the caller-supplied age and rule", () => {
    Scene.scene(
      { update, view: sceneView(stateConfig({ ageMs: 12_000, ruleMs: 300_000, status: "stale" })) },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="stale"]')).toExist(),
      Scene.expect(Scene.selector('[data-chart-notice="stale"]')).toContainText("Stale"),
      // Exact phrase: swapping age and rule in the render must fail.
      Scene.expect(Scene.selector('[data-chart-notice="stale"]')).toHaveText(
        "Stale: data is 12s old (rule 5m).",
      ),
      Scene.expect(Scene.selector("svg")).toExist(),
    );
  });

  it("truncated is its own state: the chart stays and the dropped point count is visible", () => {
    Scene.scene(
      {
        update,
        view: sceneView({
          ...viewConfig,
          series: [{ ...series[0], points: series[0].points.slice(0, 2) }],
          state: { droppedPoints: 3, status: "truncated" },
        }),
      },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="truncated"]')).toExist(),
      Scene.expect(Scene.selector('[data-chart-notice="truncated"]')).toContainText("3"),
      Scene.expect(Scene.selector('[data-chart-notice="truncated"]')).toContainText("2 of 5"),
      // Exact caption: an empty suffix (or swapped shown/total/dropped) must fail.
      Scene.expect(Scene.selector("caption")).toHaveText(
        "Requests per minute data (showing 2 of 5 points; 3 dropped)",
      ),
      Scene.expect(Scene.selector("svg")).toExist(),
      Scene.expect(Scene.selector("table")).toExist(),
    );
  });

  it("no-data is its own explicit state, not a loading spinner or an empty chart", () => {
    Scene.scene(
      {
        update,
        view: sceneView({ series: [], state: { status: "empty" }, title: "Requests per minute" }),
      },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="empty"]')).toExist(),
      Scene.expect(Scene.selector("[data-chart-empty]")).toContainText("No chart data available."),
      Scene.expect(Scene.selector("svg")).toBeAbsent(),
      Scene.expect(Scene.selector("table")).toBeAbsent(),
      Scene.expect(Scene.selector('[data-chart-status="loading"]')).toBeAbsent(),
    );
  });

  it("ready is explicit and still renders the chart", () => {
    Scene.scene(
      { update, view: sceneView(stateConfig({ status: "ready" })) },
      Scene.given({ name: "chart" }),
      Scene.expect(Scene.selector('[data-chart-status="ready"]')).toExist(),
      Scene.expect(Scene.selector("svg")).toExist(),
      Scene.expect(Scene.selector("table")).toExist(),
    );
  });

  it("is deterministic: the same (series, state) renders the same markup twice, with no ids", () => {
    const configs: ReadonlyArray<TestChartConfig> = [
      viewConfig,
      stateConfig({ status: "loading" }),
      stateConfig({ status: "empty" }),
      stateConfig({ reason: "bounded failure", status: "error" }),
      stateConfig({ ageMs: 1_000, ruleMs: 30_000, status: "stale" }),
      stateConfig({ droppedPoints: 2, status: "truncated" }),
      { series: [], state: { status: "empty" }, title: "Empty chart" },
    ];
    for (const config of configs) {
      const first = JSON.stringify(chartView(config, inertHtml));
      const second = JSON.stringify(chartView(config, inertHtml));
      expect(first).toBe(second);
      expect(first).not.toMatch(/"id"/u);
      expect(first).not.toMatch(/Math\.random|Date\.now|crypto\.randomUUID/u);
    }
  });
});
