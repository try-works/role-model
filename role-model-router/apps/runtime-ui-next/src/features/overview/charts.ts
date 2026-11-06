import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";
import { tanstackChartSvg } from "./tanstack-chart";

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
        quality:
          numberOrNull(meta.routingQualityScore) ??
          numberOrNull(meta.benchmarkCapability?.overallScore),
        score: numberOrNull(entry.value),
        speed: latency === null ? null : Math.min(1, 1000 / Math.max(latency, 1)),
      };
    } catch {
      return {
        cost: null,
        id: entry.id,
        label: entry.label,
        quality: null,
        score: null,
        speed: null,
      };
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
      h.line([
        h.Attribute("x1", "200"),
        h.Attribute("y1", "175"),
        h.Attribute("x2", "316.9"),
        h.Attribute("y2", "242.5"),
        h.Stroke("var(--rm-border)"),
      ]),
      h.line([
        h.Attribute("x1", "200"),
        h.Attribute("y1", "175"),
        h.Attribute("x2", "83.1"),
        h.Attribute("y2", "242.5"),
        h.Stroke("var(--rm-border)"),
      ]),
      h.line([
        h.Attribute("x1", "200"),
        h.Attribute("y1", "175"),
        h.Attribute("x2", "200"),
        h.Attribute("y2", "310"),
        h.Stroke("var(--rm-border)"),
      ]),
      h.text(
        [
          h.Attribute("x", "75"),
          h.Attribute("y", "248"),
          h.Attribute("text-anchor", "end"),
          h.Fill("var(--rm-fg)"),
          h.FontSize("12"),
        ],
        ["← Cost"],
      ),
      h.text(
        [
          h.Attribute("x", "200"),
          h.Attribute("y", "26"),
          h.Attribute("text-anchor", "middle"),
          h.Fill("var(--rm-fg)"),
          h.FontSize("12"),
        ],
        ["↑ Quality"],
      ),
      h.text(
        [
          h.Attribute("x", "325"),
          h.Attribute("y", "248"),
          h.Attribute("text-anchor", "start"),
          h.Fill("var(--rm-fg)"),
          h.FontSize("12"),
        ],
        ["Speed →"],
      ),
      ...rows.map((row, index) => {
        const cost = row.cost === null ? 0 : Math.min(1, 1 / Math.max(row.cost, 0.0001));
        const quality = row.quality ?? 0;
        const speed = row.speed ?? 0;
        const floorX = 200 + cost * -116.9 + speed * 116.9;
        const floorY = 175 + cost * 67.5 + speed * 67.5;
        const markerY = floorY - quality * 135;
        const palette = [
          "var(--rm3-chart-cost)",
          "var(--rm3-chart-1)",
          "var(--rm3-chart-2)",
          "var(--rm3-chart-azure)",
          "var(--rm3-chart-pink)",
          "var(--rm3-chart-violet)",
          "var(--rm3-chart-amber)",
          "var(--rm3-chart-coral)",
        ];
        const color = palette[index % palette.length] ?? "var(--rm3-chart-1)";
        return h.g(
          [],
          [
            h.line([
              h.Attribute("x1", String(floorX)),
              h.Attribute("y1", String(floorY)),
              h.Attribute("x2", String(floorX)),
              h.Attribute("y2", String(markerY)),
              h.Stroke(color),
              h.Attribute("stroke-opacity", "0.45"),
            ]),
            h.circle([
              h.Cx(String(floorX)),
              h.Cy(String(floorY)),
              h.R("3"),
              h.Fill(color),
              h.Attribute("fill-opacity", "0.35"),
            ]),
            h.circle([
              h.Cx(String(floorX)),
              h.Cy(String(markerY)),
              h.R(String(6 + (row.score ?? 0) * 6)),
              h.Fill(color),
              h.Stroke(color),
              h.Attribute("fill-opacity", index === 0 ? "0.9" : "0.35"),
              h.DataAttribute("candidate-point", row.id),
              h.AriaLabel(
                `${row.label}: C${percent(cost)} · Q${percent(quality)} · S${percent(speed)}`,
              ),
            ]),
          ],
        );
      }),
    ],
  );

export const candidateSpaceCard = (candidates: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = candidateRows(candidates);
  // R13: honest state - when every candidate lacks a benchmark profile, say so instead of
  // drawing an all-neutral scatter that reads as measured data.
  const allUnprofiled =
    rows.length > 0 &&
    rows.every((row) => row.cost === null && row.quality === null && row.speed === null);
  const swatches = [
    "bg-[var(--rm3-chart-cost)]",
    "bg-[var(--rm3-chart-1)]",
    "bg-[var(--rm3-chart-2)]",
    "bg-[var(--rm3-chart-azure)]",
    "bg-[var(--rm3-chart-pink)]",
    "bg-[var(--rm3-chart-violet)]",
    "bg-[var(--rm3-chart-amber)]",
    "bg-[var(--rm3-chart-coral)]",
  ];
  return h.section(
    [
      h.Class("flex h-auto w-full flex-col gap-3 bg-card p-4 text-card-foreground"),
      h.DataAttribute("overview-card", "Model pool"),
    ],
    [
      h.div(
        [h.Class("-mx-4 flex flex-col gap-1 border-b border-border px-4 pb-3")],
        [
          h.h2(
            [h.Class("text-sm font-medium leading-5 tracking-tight text-foreground")],
            ["Model pool"],
          ),
          h.p(
            [h.Class("text-xs leading-4 text-muted-foreground")],
            [
              "Route candidates by quality, cost, and speed. Marker size is proportional to route score. Cost axis is inverted: higher is cheaper.",
            ],
          ),
        ],
      ),
      ...(allUnprofiled
        ? [
            h.p(
              [
                h.DataAttribute("model-pool-honest", ""),
                h.Class("text-xs leading-4 text-muted-foreground"),
              ],
              [
                "No benchmark profile is reported yet: markers sit at neutral placement until the host reports operational profiles. Run a benchmark to populate quality, cost and speed.",
              ],
            ),
          ]
        : []),
      h.div(
        [h.Class("grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]")],
        [
          h.div(
            [h.Class("flex min-h-[280px] w-full items-center justify-center overflow-hidden")],
            [candidateSpaceSvg(rows, h)],
          ),
          h.div(
            [h.Class("flex h-full min-h-[280px] flex-col gap-3")],
            [
              h.div(
                [h.Class("flex items-baseline gap-2")],
                [
                  h.p(
                    [
                      h.Class(
                        "font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground",
                      ),
                    ],
                    ["Candidates · route score (0–1)"],
                  ),
                ],
              ),
              rows.length === 0
                ? h.div(
                    [h.Class("flex min-h-0 flex-1 flex-col justify-center gap-4 pb-2")],
                    [
                      h.div(
                        [h.Class("flex flex-col gap-1.5")],
                        [
                          h.p(
                            [h.Class("text-sm font-medium leading-5 text-foreground")],
                            ["No models configured"],
                          ),
                          h.p(
                            [h.Class("text-xs leading-4 text-muted-foreground")],
                            [
                              candidates.status === "error"
                                ? (candidates.message ?? "Model pool read failed")
                                : candidates.status === "loading"
                                  ? "Loading model pool…"
                                  : "Configure models on Remote or Local to score and place candidates here.",
                            ],
                          ),
                        ],
                      ),
                    ],
                  )
                : h.ul(
                    [h.Class("flex max-h-[360px] flex-col gap-2.5 overflow-y-auto pr-1")],
                    rows.map((row, index) =>
                      h.li(
                        [h.Class("flex items-start gap-2.5")],
                        [
                          h.span(
                            [
                              h.Attribute("aria-hidden", "true"),
                              h.Class(
                                `mt-[3px] h-2.5 w-2.5 shrink-0 rounded-[2px] ${swatches[index % swatches.length] ?? "bg-[var(--rm3-chart-1)]"}`,
                              ),
                            ],
                            [],
                          ),
                          h.div(
                            [h.Class("min-w-0 flex-1 space-y-0.5")],
                            [
                              h.div(
                                [h.Class("flex items-baseline justify-between gap-2")],
                                [
                                  h.span(
                                    [
                                      h.Class(
                                        "truncate text-[13px] font-semibold leading-4 text-foreground",
                                      ),
                                    ],
                                    [row.label],
                                  ),
                                  h.span(
                                    [
                                      h.Class(
                                        "w-11 shrink-0 text-right font-mono text-[12px] tabular-nums leading-4 text-foreground",
                                      ),
                                    ],
                                    [row.score === null ? "—" : row.score.toFixed(3)],
                                  ),
                                ],
                              ),
                              h.p(
                                [
                                  h.Class(
                                    "font-mono text-[10px] leading-[13px] text-muted-foreground",
                                  ),
                                ],
                                [
                                  `C${percent(row.cost)} · Q${percent(row.quality)} · S${percent(row.speed)} · Live telemetry`,
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
            ],
          ),
        ],
      ),
    ],
  );
};

const chartTable = (
  series: ReadonlyArray<ChartSeries>,
  title: string,
  h: HtmlBuilder<Message>,
): Html => {
  const labels: string[] = [];
  for (const entry of series)
    for (const point of entry.points) if (!labels.includes(point.label)) labels.push(point.label);
  // The chart data table is the accessible representation of the SVG, not a visible table: the reference
  // UI (and the owner) expect chart cards to show the plot only.
  return h.table(
    [h.DataAttribute("chart-part", "table"), h.Class("sr-only")],
    [
      h.caption([h.Class("pb-2 text-xs text-muted-foreground")], [title]),
      h.thead(
        [],
        [
          h.tr(
            [],
            [
              h.th(
                [
                  h.Attribute("scope", "col"),
                  h.Class("border-b border-border py-1 pr-3 font-medium"),
                ],
                ["Bucket"],
              ),
              ...series.map((entry) =>
                h.th(
                  [
                    h.Attribute("scope", "col"),
                    h.Class("border-b border-border py-1 pr-3 text-right font-medium"),
                  ],
                  [entry.label],
                ),
              ),
            ],
          ),
        ],
      ),
      h.tbody(
        [],
        labels.map((label) =>
          h.tr(
            [],
            [
              h.th(
                [
                  h.Attribute("scope", "row"),
                  h.Class("border-b border-border/60 py-1 pr-3 font-normal"),
                ],
                [label],
              ),
              ...series.map((entry) => {
                const point = entry.points.find((candidate) => candidate.label === label);
                return h.td(
                  [
                    h.Class(
                      "border-b border-border/60 py-1 pr-3 text-right font-mono tabular-nums",
                    ),
                  ],
                  [point?.value === null || point?.value === undefined ? "—" : String(point.value)],
                );
              }),
            ],
          ),
        ),
      ),
    ],
  );
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
  const chartSeries = input.hasData ? input.series : [];
  const emptyMessage =
    input.state === "error"
      ? "Telemetry read failed"
      : input.state === "loading"
        ? "Loading chart data…"
        : input.emptyMessage;
  // A blank axis area reads as measured data. When a chart has no series, the honest empty state is
  // rendered INSIDE the plot box (owner-reported blank-chart failure), so the plot never looks empty-but-real.
  const chart = input.h.div(
    [input.h.Class("flex w-full flex-col gap-2")],
    [
      input.h.div(
        [
          input.h.DataAttribute("chart-plot", input.title),
          input.h.Class("relative rm3-tanstack-chart block h-[220px] w-full"),
        ],
        [
          input.h.div(
            [
              input.h.Class("absolute inset-0"),
              input.h.InnerHTML(
                tanstackChartSvg(chartSeries, {
                  ariaLabel: input.title,
                  height: 220,
                  kind: input.kind,
                  width: 640,
                }),
              ),
            ],
            [],
          ),
          ...(input.hasData
            ? []
            : [
                input.h.div(
                  [
                    input.h.DataAttribute("chart-empty-message", input.title),
                    input.h.Role("status"),
                    input.h.Class(
                      "absolute inset-0 flex items-center justify-center bg-card/80 px-4 text-center text-xs leading-4 text-muted-foreground",
                    ),
                  ],
                  [emptyMessage],
                ),
              ]),
        ],
      ),
      chartTable(chartSeries, input.title, input.h),
    ],
  );
  return input.h.section(
    [
      input.h.Class("flex h-auto w-full flex-col gap-3 bg-card p-4 text-card-foreground"),
      input.h.DataAttribute("overview-card", input.title),
    ],
    [
      input.h.div(
        [input.h.Class("-mx-4 flex flex-col gap-1 border-b border-border px-4 pb-3")],
        [
          input.h.h2(
            [input.h.Class("text-sm font-medium leading-5 tracking-tight text-foreground")],
            [input.title],
          ),
          input.h.p(
            [input.h.Class("text-xs leading-4 text-muted-foreground")],
            [input.description],
          ),
        ],
      ),
      chart,
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
    [
      input.h.Class("mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"),
      input.h.DataAttribute("overview-stats", ""),
    ],
    [
      input.h.div(
        [
          input.h.Class(
            "rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3",
          ),
        ],
        [
          input.h.p(
            [input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")],
            ["MODELS"],
          ),
          input.h.p([input.h.Class("mt-1 text-[18px] font-semibold")], [String(input.models)]),
        ],
      ),
      input.h.div(
        [
          input.h.Class(
            "rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3",
          ),
        ],
        [
          input.h.p(
            [input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")],
            ["REQUESTS"],
          ),
          input.h.p([input.h.Class("mt-1 text-[18px] font-semibold")], [String(input.requests)]),
        ],
      ),
      input.h.div(
        [
          input.h.Class(
            "rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3",
          ),
        ],
        [
          input.h.p(
            [input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")],
            ["CACHE"],
          ),
          input.h.p([input.h.Class("mt-1 text-[18px] font-semibold")], [input.cacheHitRate]),
        ],
      ),
      input.h.div(
        [
          input.h.Class(
            "rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3",
          ),
        ],
        [
          input.h.p(
            [input.h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")],
            ["ROUTER ENDPOINT"],
          ),
          input.h.p([input.h.Class("mt-1 truncate font-mono text-[12px]")], [input.routerEndpoint]),
        ],
      ),
    ],
  );
