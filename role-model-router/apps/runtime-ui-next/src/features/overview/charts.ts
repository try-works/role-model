import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { view as chartView, type ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import type { ReadbackState } from "../../readback";

type ChartKind = "area" | "bar" | "line";

interface CandidateRow {
  readonly cost: number | null;
  readonly id: string;
  readonly label: string;
  readonly quality: number | null;
  readonly score: number | null;
  readonly speed: number | null;
}

const numberOrNull = (value: number | string | boolean | null | undefined): number | null => {
  const numeric = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(numeric)
    ? null
    : numeric;
};

const candidateRows = (candidates: ReadbackState): ReadonlyArray<CandidateRow> =>
  candidates.rows.map((entry) => {
    try {
      // SAFETY: entry.meta is the runtime readback's JSON payload; every field is read
      // defensively through numberOrNull and optional access.
      const meta = JSON.parse(entry.meta) as {
        readonly benchmarkCapability?: { readonly overallScore?: number | string | null };
        readonly operationalProfile?: { readonly latency_ms_p50?: number | string | null };
        readonly pricing?: { readonly inputPer1M?: number | string | null };
        readonly routingQualityScore?: number | string | null;
      };
      const profile = meta.operationalProfile;
      const latency = numberOrNull(profile?.latency_ms_p50);
      return {
        cost: numberOrNull(meta.pricing?.inputPer1M),
        id: entry.id,
        label: entry.label,
        quality: numberOrNull(meta.routingQualityScore) ?? numberOrNull(meta.benchmarkCapability?.overallScore),
        score: null,
        speed: latency === null ? null : Math.min(1, 1000 / Math.max(latency, 1)),
      };
    } catch {
      return { cost: null, id: entry.id, label: entry.label, quality: null, score: null, speed: null };
    }
  });

const percent = (value: number | null): string =>
  value === null ? "—" : String(Math.round(Math.min(1, Math.max(0, value)) * 100));

const candidateSpaceSvg = (rows: ReadonlyArray<CandidateRow>, h: HtmlBuilder<Message>): Html =>
  h.svg(
    [
      h.Attribute("viewBox", "0 0 400 340"),
      h.Class("mt-2 h-auto w-full max-h-[360px]"),
      h.Role("img"),
      h.AriaLabel("Model pool scatter of cost, quality, and speed"),
      h.DataAttribute("candidate-space", ""),
    ],
    [
      h.polygon([
        h.Attribute("points", "200,310 316.9,242.5 200,175 83.1,242.5"),
        h.Fill("color-mix(in srgb, var(--rm-fg) 4%, transparent)"),
        h.Stroke("var(--rm-border)"),
      ]),
      h.line([h.Attribute("x1", "200"), h.Attribute("y1", "175"), h.Attribute("x2", "316.9"), h.Attribute("y2", "242.5"), h.Stroke("var(--rm-border)")]),
      h.line([h.Attribute("x1", "200"), h.Attribute("y1", "175"), h.Attribute("x2", "83.1"), h.Attribute("y2", "242.5"), h.Stroke("var(--rm-border)")]),
      h.line([h.Attribute("x1", "200"), h.Attribute("y1", "175"), h.Attribute("x2", "200"), h.Attribute("y2", "310"), h.Stroke("var(--rm-border)")]),
      h.text([h.Attribute("x", "75"), h.Attribute("y", "248"), h.Attribute("text-anchor", "end"), h.Fill("var(--rm-fg)"), h.FontSize("12")], ["← Cost"]),
      h.text([h.Attribute("x", "200"), h.Attribute("y", "26"), h.Attribute("text-anchor", "middle"), h.Fill("var(--rm-fg)"), h.FontSize("12")], ["↑ Quality"]),
      h.text([h.Attribute("x", "325"), h.Attribute("y", "248"), h.Attribute("text-anchor", "start"), h.Fill("var(--rm-fg)"), h.FontSize("12")], ["Speed →"]),
      ...rows.map((row) => {
        const cost = row.cost === null ? 0 : Math.min(1, 1 / Math.max(row.cost, 0.0001));
        const quality = row.quality ?? 0;
        const speed = row.speed ?? 0;
        const floorX = 200 + cost * -116.9 + speed * 116.9;
        const floorY = 175 + cost * 67.5 + speed * 67.5;
        const markerY = floorY - quality * 135;
        return h.circle([
          h.Cx(String(floorX)),
          h.Cy(String(markerY)),
          h.R(String(8 + (row.score ?? 0) * 8)),
          h.Fill("var(--rm-accent)"),
          h.Stroke("var(--rm-accent)"),
          h.Attribute("fill-opacity", "0.25"),
          h.DataAttribute("candidate-point", row.id),
          h.AriaLabel(row.label + ": C" + percent(cost) + " · Q" + percent(quality) + " · S" + percent(speed)),
        ]);
      }),
    ],
  );

export const candidateSpaceCard = (candidates: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = candidateRows(candidates);
  return h.section(
    [h.Class("min-h-[300px] min-w-0 overflow-hidden rounded-[8px] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4"), h.DataAttribute("overview-card", "Model pool")],
    [
      h.h2([h.Class("text-[15px] font-semibold")], ["Model pool"]),
      h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Route candidates by quality, cost, and speed. Marker size is proportional to route score. Cost axis is inverted: higher is cheaper."]),
      candidateSpaceSvg(rows, h),
      h.div([h.Class("mt-3")], [
        h.p([h.Class("font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--rm-muted)]")], ["Candidates · route score (0–1)"]),
        rows.length === 0
          ? h.p([h.DataAttribute("candidate-space-state", candidates.status === "error" ? "error" : candidates.status === "loading" ? "loading" : "empty"), h.Role("status")], [candidates.status === "error" ? candidates.message ?? "Model pool read failed" : candidates.status === "loading" ? "Loading model pool…" : "No models configured. Configure models on Remote or Local to score and place candidates here."])
          : h.ul([h.Class("mt-2 flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1")], rows.map((row) =>
              h.li([h.Class("flex items-start justify-between gap-3 text-[12px]")], [
                h.span([h.Class("min-w-0 truncate font-medium text-[var(--rm-fg)]")], [row.label]),
                h.span([h.Class("shrink-0 font-mono text-[11px] text-[var(--rm-secondary)]")], [(row.score === null ? "—" : row.score.toFixed(3)) + " · C" + percent(row.cost) + " · Q" + percent(row.quality) + " · S" + percent(row.speed)]),
              ]),
            )),
      ]),
    ],
  );
};

const barSvg = (series: ReadonlyArray<ChartSeries>, h: HtmlBuilder<Message>): Html => {
  const labels = series[0]?.points.map((point) => point.label) ?? [];
  const max = Math.max(1, ...series.flatMap((item) => item.points.flatMap((point) => (point.value === null ? [] : [point.value]))));
  const width = 640;
  const height = 220;
  const left = 56;
  const bottom = 184;
  const slot = (width - left - 16) / Math.max(labels.length, 1);
  return h.svg([
    h.Attribute("viewBox", "0 0 " + String(width) + " " + String(height)),
    h.Class("mt-2 h-auto w-full"),
    h.Role("img"),
    h.AriaLabel("Success vs failure volume bar chart"),
    h.DataAttribute("overview-bar-chart", ""),
  ], [
    h.line([h.Attribute("x1", String(left)), h.Attribute("y1", String(bottom)), h.Attribute("x2", String(width - 16)), h.Attribute("y2", String(bottom)), h.Stroke("var(--rm-border)")]),
    ...series.flatMap((item, seriesIndex) =>
      item.points.flatMap((point, index) => {
        const value = point.value;
        if (value === null) return [];
        const barWidth = Math.max(3, slot / (series.length + 1));
        const x = left + index * slot + 4 + seriesIndex * barWidth;
        const barHeight = ((value / max) * (bottom - 20));
        return [h.rect([
          h.Attribute("x", String(x)),
          h.Attribute("y", String(bottom - barHeight)),
          h.Attribute("width", String(barWidth)),
          h.Attribute("height", String(barHeight)),
          h.Fill(seriesIndex === 0 ? "var(--rm-success, #2f9e62)" : "var(--rm-danger)"),
          h.DataAttribute("bar-series", item.id),
        ])];
      }),
    ),
  ]);
};

export const telemetryChartCard = (input: {
  readonly description: string;
  readonly emptyMessage: string;
  readonly hasData: boolean;
  readonly h: HtmlBuilder<Message>;
  readonly kind: ChartKind;
  readonly series: ReadonlyArray<ChartSeries>;
  readonly state: "empty" | "error" | "loading" | "ready";
  readonly title: string;
}): Html => {
  const chart =
    input.kind === "bar"
      ? barSvg(input.series, input.h)
      : chartView(
          {
            ariaLabel: input.title,
            series: input.series,
            state:
              input.state === "loading"
                ? { status: "loading" }
                : input.state === "error"
                  ? { reason: "Telemetry read failed", status: "error" }
                  : input.hasData
                    ? { status: "ready" }
                    : { status: "empty" },
            title: "",
            yUnit: input.kind === "area" ? "tokens" : undefined,
          },
          input.h,
        );
  const empty = input.hasData
    ? null
    : input.h.p(
        [input.h.DataAttribute("chart-empty-message", input.title), input.h.Role("status")],
        [input.state === "error" ? "Telemetry read failed" : input.state === "loading" ? "Loading chart data…" : input.emptyMessage],
      );
  return input.h.section(
    [input.h.Class("min-h-[300px] min-w-0 overflow-hidden rounded-[8px] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4"), input.h.DataAttribute("overview-card", input.title)],
    [
      input.h.h2([input.h.Class("text-[15px] font-semibold")], [input.title]),
      input.h.p([input.h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], [input.description]),
      chart,
      ...(empty === null ? [] : [empty]),
    ],
  );
};

export const overviewStats = (input: {
  readonly cacheHitRate: string;
  readonly h: HtmlBuilder<Message>;
  readonly models: number;
  readonly requests: number;
  readonly routerEndpoint: string;
}): Html =>
  input.h.section(
    [input.h.Class("mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"), input.h.DataAttribute("overview-stats", "")],
    [
      input.h.div([input.h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3")], [input.h.p([input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["MODELS"]), input.h.p([input.h.Class("mt-1 text-[18px] font-semibold")], [String(input.models)])]),
      input.h.div([input.h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3")], [input.h.p([input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["REQUESTS"]), input.h.p([input.h.Class("mt-1 text-[18px] font-semibold")], [String(input.requests)])]),
      input.h.div([input.h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3")], [input.h.p([input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["CACHE"]), input.h.p([input.h.Class("mt-1 text-[18px] font-semibold")], [input.cacheHitRate])]),
      input.h.div([input.h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3")], [input.h.p([input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["ROUTER ENDPOINT"]), input.h.p([input.h.Class("mt-1 truncate font-mono text-[12px]")], [input.routerEndpoint])]),
    ],
  );
