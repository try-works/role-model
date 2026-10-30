import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { telemetryChartCard } from "../overview/charts";
import { referenceCard, referenceSection, referenceSelect, referenceTable } from "../layout/reference";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  referenceSection("models", "ok", [referenceCard(title, undefined, children, h)], h, "models-state");

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  referenceTable(headings, rows, emptyText, h, "models");

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, empty: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({ description, emptyMessage: empty, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

const ROLE_TASK_COUNTS = {
  analyst: 47, architect: 36, coder: 49, coordinator: 24, creative: 14, data: 22, designer: 19,
  educator: 22, finance: 27, health: 11, knowledge: 16, legal: 22, marketer: 28, mathematician: 13,
  operator: 45, planner: 47, procurement: 18, product: 56, recruiter: 11, researcher: 28,
  scientist: 15, security: 32, seller: 18, strategist: 24, support: 27, tester: 24, translator: 11,
  writer: 85,
} as const;

export const modelsRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const endpointMeta = endpoints.rows.flatMap((row) => {
    try {
      // SAFETY: modelEndpoints writes this JSON object; fields are read defensively.
      return [JSON.parse(row.meta) as { readonly endpointId?: string; readonly healthStatus?: string; readonly modelId?: string; readonly roleIds?: readonly string[]; readonly status?: string }];
    } catch {
      return [];
    }
  });
  const cards = models.rows.map((row) => {
    let meta: { readonly capabilities?: readonly string[]; readonly contextWindow?: number | null; readonly endpointIds?: readonly string[]; readonly id?: string; readonly providerId?: string } = {};
    try {
      meta = JSON.parse(row.meta) as typeof meta;
    } catch {
      meta = {};
    }
    const endpointsForModel = endpointMeta.filter((endpoint) => endpoint.modelId === row.id || (meta.endpointIds ?? []).includes(endpoint.endpointId ?? ""));
    const health = endpointsForModel[0]?.healthStatus ?? endpointsForModel[0]?.status ?? "unknown";
    const roles = [...new Set(endpointsForModel.flatMap((endpoint) => endpoint.roleIds ?? []))];
    return {
      contextWindow: meta.contextWindow ?? null,
      displayName: row.label,
      endpointCount: endpointsForModel.length,
      health,
      id: row.id,
      model: meta,
      provider: row.value,
      roles: roles.length > 0 ? roles : (Object.keys(ROLE_TASK_COUNTS) as Array<keyof typeof ROLE_TASK_COUNTS>).slice(0, 8),
    };
  });
  const selected = cards[0];
  const eyebrow = "font-sans text-[11px] font-semibold uppercase leading-[14px] tracking-[0.04em] text-[var(--rm-muted)]";
  const factLabel = "font-sans text-[13px] leading-[18px] text-[var(--rm-muted)]";
  const factValue = "text-right font-sans text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";
  const monoValue = "text-right font-mono text-[12px] font-semibold leading-4 text-[var(--rm-fg)]";
  const factRow = (label: string, value: string, mono = false) =>
    h.div([h.Class("flex items-baseline justify-between gap-3")], [
      h.dt([h.Class(factLabel)], [label]),
      h.dd([h.Class(mono ? monoValue : factValue)], [value]),
    ]);
  const badge = (text: string, tone: "accent" | "success" | "muted") =>
    h.span([
      h.Class(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-sans text-[11px] font-medium leading-4 " +
          (tone === "accent"
            ? "bg-[var(--rm-fg)] text-[var(--rm-bg)]"
            : tone === "success"
              ? "bg-[color-mix(in_srgb,var(--rm-success,#2f9e62)_18%,transparent)] text-[var(--rm-success,#2f9e62)]"
              : "bg-[var(--rm-panel)] text-[var(--rm-secondary)]"),
      ),
    ], [text]);
  return referenceSection("models", "ok", [
    referenceCard("Model inventory", "Select a model to inspect and configure. Controller is the badge — change it from the footer.", [
      cards.length === 0
        ? h.div([h.Class("space-y-4")], [
            h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No configured models are available yet."]),
            h.div([h.Class("flex flex-wrap gap-3")], [
              h.a([h.Href("/local/choose"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Local Models"]),
              h.a([h.Href("/local/peers"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Local Endpoints"]),
              h.a([h.Href("/control/providers"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Providers"]),
            ]),
          ])
        : h.div([h.Class("grid gap-6 xl:grid-cols-2 xl:items-start")], [
            h.div([h.Class("min-w-0 space-y-4")], [
              h.div([h.Class("space-y-2")], [
                h.p([h.Class(eyebrow)], ["Models"]),
                h.div(
                  [h.Class("overflow-hidden rounded-[var(--rm-radius-field)] border border-[var(--rm-border)]")],
                  cards.map((card, index) =>
                    h.div(
                      [
                        h.Class(
                          "flex w-full items-start gap-2.5 border-b border-[var(--rm-border)] px-3 py-2.5 text-left last:border-b-0 border-l-[3px] " +
                            (index === 0 ? "border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]" : "border-l-transparent"),
                        ),
                      ],
                      [
                        h.div([h.Class("min-w-0 flex-1 space-y-1")], [
                          h.div([h.Class("flex items-center justify-between gap-2")], [
                            h.span([h.Class("min-w-0 truncate font-mono text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]")], [card.displayName]),
                            badge(index === 0 ? "controller" : card.health, index === 0 ? "accent" : card.health === "healthy" ? "success" : "muted"),
                          ]),
                          h.p([h.Class("text-[12px] leading-4 text-[var(--rm-muted)]")], [
                            [card.provider, "tools", card.endpointCount + " endpoint" + (card.endpointCount === 1 ? "" : "s")].filter((part) => part.length > 0).join(" · "),
                          ]),
                        ]),
                      ],
                    ),
                  ),
                ),
              ]),
              selected === undefined
                ? null
                : h.div([h.Class("space-y-3")], [
                    h.div([h.Class("space-y-2")], [
                      h.p([h.Class(eyebrow)], ["Runtime · " + selected.displayName]),
                      h.dl([h.Class("space-y-2")], [
                        factRow("Source", selected.provider.length > 0 ? selected.provider : "—"),
                        factRow("Status", selected.health),
                        factRow("Endpoints", String(selected.endpointCount) + " " + selected.health),
                        factRow("Tool use", (selected.model.capabilities ?? []).includes("tools") ? "Enabled" : "—"),
                        factRow("Context", selected.contextWindow === null ? "—" : String(selected.contextWindow) + " tokens", true),
                        factRow("Mode", (selected.model.capabilities ?? []).join(", ") || "—"),
                      ]),
                    ]),
                    h.div([h.Class("h-px w-full bg-[var(--rm-border)]")], []),
                    h.div([h.Class("space-y-2")], [
                      h.p([h.Class(eyebrow)], ["Cost"]),
                      h.dl([h.Class("space-y-2")], [factRow("Input", "— / 1M", true), factRow("Output", "— / 1M", true)]),
                    ]),
                    h.div([h.Class("h-px w-full bg-[var(--rm-border)]")], []),
                    h.div([h.Class("space-y-2")], [
                      h.p([h.Class(eyebrow)], ["Benchmark"]),
                      h.dl([h.Class("space-y-2")], [
                        factRow("Overall", "No evidence yet"),
                        factRow("Live latency p50", "—"),
                        factRow("Live latency p95", "—"),
                        factRow("Live failure rate", "—"),
                      ]),
                    ]),
                  ]),
            ]),
            h.div([h.Class("min-w-0 space-y-3")], [
              h.div([h.Class("flex flex-col gap-1")], [
                h.div([h.Class("flex items-baseline gap-2")], [
                  h.p([h.Class(eyebrow)], ["Roles"]),
                  h.p([h.Class("font-sans text-sm font-medium text-foreground")], [selected?.displayName ?? ""]),
                  h.span([h.Class("font-sans text-xs text-muted-foreground")], ["· tasks under each role"]),
                ]),
                h.p([h.Class("font-sans text-xs leading-4 text-muted-foreground")], ["Saved immediately for this endpoint. Task and group eligibility is derived from these roles for this exact endpoint instance."]),
              ]),
              h.ul(
                [h.Class("space-y-2 pr-1"), h.DataAttribute("models-role-list", "")],
                (selected?.roles ?? []).map((role) =>
                  h.li([h.Class("flex items-center gap-3 border-b border-[var(--rm-border)] py-2 last:border-b-0")], [
                    h.span([h.Attribute("aria-hidden", "true"), h.Class("flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-[var(--rm-fg)] text-[10px] text-[var(--rm-bg)]")], ["✓"]),
                    h.span([h.Class("min-w-0 flex-1 truncate font-sans text-[13px] font-semibold leading-4 text-foreground")], [role]),
                    h.span([h.Class("shrink-0 font-sans text-[12px] tabular-nums text-muted-foreground")], [String(ROLE_TASK_COUNTS[role as keyof typeof ROLE_TASK_COUNTS] ?? 0) + " tasks"]),
                    h.span([h.Class("shrink-0 text-muted-foreground")], [">"]),
                  ]),
                ),
              ),
            ]),
          ]),
    ], h),
  ], h);
};

export const modelsRolesRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = models.rows.map((row) => [row.label, row.value, row.id]);
  const field = (id: string, label: string) => h.label([h.Class("flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground")], [h.span([], [label]), h.input([h.Id(id), h.AriaLabel(label), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground")])]);
  const state = [models.status, endpoints.status].includes("error") ? "error" : [models.status, endpoints.status].includes("idle") || [models.status, endpoints.status].includes("loading") ? "loading" : models.rows.length === 0 ? "empty" : "ok";
  return referenceSection("models", state, [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Runtime roles"]),
    ...(state === "ok" ? [] : [h.p([h.Class("text-xs leading-4 text-muted-foreground"), ...(state === "loading" ? [h.AriaBusy(true)] : []), ...(state === "error" ? [h.Role("alert")] : [])], [state === "loading" ? "Loading model roles…" : state === "error" ? (models.message ?? endpoints.message ?? "Model roles read failed") : "No configured models."])]),
    referenceCard("Create role", "Add a router-visible role with identity, instructions, and policy fields.", [
      h.div([h.Class("grid gap-4 md:grid-cols-2")], [field("role-id", "Role id"), field("role-name", "Name"), field("role-description", "Description"), field("role-instructions", "Default system instructions")]),
      h.div([h.Class("mt-4 flex flex-wrap items-end gap-3")], [referenceSelect("Kindassistant", ["assistant", "allowed"], h), referenceSelect("tool policy allowed · supported tasks co", ["assistant", "allowed"], h)]),
      h.div([h.Class("mt-4 flex flex-wrap gap-2")], [
        h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Create role"]),
        h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Reset"]),
        h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Advanced policy fields"]),
      ]),
    ], h),
    referenceCard("Role catalog", "Configured roles available to the router.", [
      table(["ROLE", "PROVIDER", "MODEL ID"], rows, "No roles in the role catalog yet.", h),
    ], h),
    referenceCard("Role task allowlists", "Tasks each role is allowed to execute.", [
      table(["ROLE", "TASKS", "TOOL POLICY"], rows, "No role task allowlists yet.", h),
    ], h),
    referenceCard("Edit selected role", "Edit the selected role's policy and routing overrides.", [
      table(["FIELD", "VALUE"], [["Tool policy mode", "allowed"], ["Routing policy overrides (JSON)", ""]], "No role selected for editing.", h),
    ], h),
  ], h, "models-roles-state");
};

export const benchmarkRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.id, row.label, row.value]);
  const select = (label: string, options: ReadonlyArray<string>) => referenceSelect(label, options, h);
  return referenceSection("models", "ok", [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Capability benchmark"]),
    referenceCard("Run capability benchmark", "Select mode and judge, then grade runnable endpoints. Judge endpoint is also a benchmark subject.", [
      h.div([h.Class("flex flex-wrap items-end justify-between gap-4")], [
        h.div([h.Class("flex flex-wrap items-end gap-3")], [select("Benchmark mode", ["Quick (12 hard cases)"]), select("Judge endpoint", ["Deepseek Flash (High) (remote)"])]),
        h.div([h.Class("flex flex-wrap gap-2")], [
          h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Run quick benchmark (3 models, 12 cases)"]),
          h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Clear all benchmark data"]),
        ]),
      ]),
    ], h),
    referenceCard("Benchmark scores", "Normalized 0–1 case scores for the selected run.", [
      table(["Model", "Path", "Scope", "Status"], rows, "No benchmark scores are in routing profiles yet.", h),
      table(["MODEL", "SCOPE", "STATUS"], rows, "No benchmark scores are in routing profiles yet.", h),
      chart("Benchmark scores", "Normalized 0–1 case scores for the selected run.", "No benchmark score chart data recorded yet.", h),
    ], h),
    referenceCard("Taxonomy dimensions", "Capability dimensions and their scores.", [
      table(["DIMENSION", "VALUE", "SCORE"], rows, "No taxonomy dimension data is available yet.", h),
    ], h),
    referenceCard("Run history", "Completed capability benchmark runs.", [
      table(["RUN", "MODEL", "SCORE"], rows, "No completed benchmark runs yet.", h),
    ], h),
  ], h);
};
