import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { CONTROL_SPECS, type ControlsState } from "./control";
import { card, filterBar, table as referenceTable, tableCellClass, tableHeadClass, titleClass, descriptionClass, filterLabelClass, filterControlClass } from "./features/s563-layout";
import { renderControlPage } from "./control-view";
import { Message } from "./message";
import type { ReadbackRow, ReadbacksState } from "./readback";

/**
 * S530: structural parity for the router/control family. The reference React pages render purpose
 * built tables/cards/editors; the earlier Foldkit projections printed raw readback rows. These
 * renderers keep the same readback sources (one /router/config source for the posture pages) and the
 * reference section titles and labels, including honest loading/error/empty states.
 */
type H = HtmlBuilder<Message>;

const eyebrowClass = "font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-muted-foreground";
const cardClass = "rounded-lg border border-border bg-card p-3";
const bodyClass = "text-[12px] leading-5 text-[var(--rm-secondary)]";
const strongClass = "text-[13px] font-semibold text-[var(--rm-fg)]";

const sectionCard = (
  title: string,
  description: string | undefined,
  children: readonly Html[],
  h: H,
): Html => h.div([h.Class("mt-4")], [card(title, description, [h.div([h.Class("space-y-3")], children)], h)]);

const statTile = (label: string, value: string, h: H): Html =>
  h.div([h.Class(cardClass + " flex flex-col gap-1")], [
    h.p([h.Class(eyebrowClass)], [label]),
    h.p([h.Class("break-words font-mono text-sm leading-[18px] font-medium tabular-nums text-foreground")], [value]),
  ]);

const statGrid = (items: readonly { readonly label: string; readonly value: string }[], h: H): Html =>
  h.div([h.Class("grid gap-2 sm:grid-cols-2 xl:grid-cols-3")], items.map((item) => statTile(item.label, item.value, h)));

const table = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  h: H,
): Html => referenceTable(headers, rows, "No rows recorded yet.", h);

const controlButton = (label: string, message: Message | undefined, h: H): Html =>
  h.button(
    [
      h.Type("button"),
      h.Class(
        "justify-self-start rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50",
      ),
      ...(message === undefined ? [h.AriaDisabled(true)] : [h.OnClick(message)]),
    ],
    [label],
  );

const textField = (label: string, value: string, h: H): Html =>
  h.label([h.Class("flex max-w-[420px] flex-col gap-1.5")], [
    h.span([h.Class(filterLabelClass)], [label]),
    h.input([
      h.Class(filterControlClass),
      h.Type("text"),
      h.Value(value),
      h.Disabled(true),
      h.AriaDisabled(true),
    ]),
  ]);

const selectField = (label: string, options: readonly string[], selected: string | undefined, h: H): Html =>
  h.label([h.Class("flex max-w-[420px] flex-col gap-1.5")], [
    h.span([h.Class(filterLabelClass)], [label]),
    h.select(
      [
        h.AriaLabel(label),
        h.Class(filterControlClass),
        h.Disabled(true),
      ],
      options.map((option) =>
        h.option([h.Value(option), ...(option === selected ? [h.Selected(true)] : [])], [option]),
      ),
    ),
  ]);

/** The readback parser owns meta's shape; pages render it opaquely as the endpoint identity column. */
const metaText = (meta: string): string => (meta.length === 0 ? "—" : meta);

const family = (
  readbacks: ReadbacksState,
  prefixes: readonly string[],
) => {
  const readback = readbacks.routerConfig;
  const status = readback.status === "idle" ? "loading" : readback.status;
  const rows = readback.rows.filter((entry) => prefixes.some((prefix) => entry.id === prefix || entry.id.startsWith(prefix)));
  const state = status === "ok" ? (rows.length === 0 ? "empty" : "ok") : status;
  const message =
    state === "loading"
      ? "Loading routing strategy posture…"
      : state === "error"
        ? (readback.message ?? "Router config read failed")
        : state === "empty"
          ? "No posture entries are configured yet."
          : undefined;
  return { state, rows, message };
};

const previewDisclosure = (h: H): Html =>
  h.p(
    [h.Class("mt-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-2 text-[12px] leading-5 text-[var(--rm-secondary)]"), h.DataAttribute("preview-only", "")],
    ["Preview only: these editors and controls are not wired to the runtime yet. Saving, templates, and add/remove actions are disabled and make no runtime writes."],
  );

const familyShell = (routeName: string, state: string, children: readonly Html[], h: H): Html =>
  h.section(
    [h.Class("rm3-next-route"), h.DataAttribute("route", routeName), h.DataAttribute("router-family-state", state)],
    children,
  );

const postureRows = (rows: readonly ReadbackRow[], h: H): Html =>
  h.ul([h.Class("space-y-1")], rows.map((entry) => h.li([h.Class(bodyClass)], [entry.label + ": " + entry.value])));

const diagnosticsPanel = (rows: readonly ReadbackRow[], state: string, h: H): Html =>
  sectionCard(
    "Posture diagnostics",
    "Violations and capability warnings the runtime raised for the saved entries on this page. A scope that cannot resolve is reported on its own entry.",
    [
      ...(rows.length === 0
        ? [h.p([h.Class(bodyClass)], [state === "ok" ? "No posture violations reported." : "No diagnostics readback available yet."])]
        : [postureRows(rows, h)]),
    ],
    h,
  );

export const routerOverviewPage = (readbacks: ReadbacksState, h: H): Html => {
  const candidates = readbacks.routerCandidates;
  const configRows = readbacks.routerConfig.rows;
  const summary = readbacks.router.rows;
  const activeAlias = configRows.find((entry) => entry.id === "strategy")?.value ?? "unresolved";
  const executionMode = configRows.find((entry) => entry.id === "executionMode")?.value ?? "—";
  const candidateRows = candidates.rows;
  const health = readbacks.health.rows;
  const countHealth = (needle: string): number => health.filter((entry) => entry.value.toLowerCase().includes(needle)).length;
  const ready = countHealth("healthy");
  const degraded = countHealth("degraded");
  const unavailable = countHealth("unavailable");
  const modes = configRows.filter((entry) => ["basic", "difficulty", "hybrid"].includes(entry.value.toLowerCase())).map((entry) => entry.value.toLowerCase());
  const modeCount = (mode: string): number => modes.filter((value) => value === mode).length;
  return familyShell("router", readbacks.router.status === "idle" ? "loading" : candidates.status, [
    sectionCard(
      "Alias inventory",
      "Keep the current alias posture visible, then expand the registry only when you need every pool.",
      [
        statGrid(
          [
            { label: "Current active alias", value: activeAlias + "." + executionMode },
            { label: "Alias readiness", value: health.length === 0 ? "No readiness rows available." : String(ready) + " ready · " + String(degraded) + " degraded · " + String(unavailable) + " unavailable" },
            { label: "Alias modes", value: modes.length === 0 ? "—" : "basic " + String(modeCount("basic")) + " · difficulty " + String(modeCount("difficulty")) + " · hybrid " + String(modeCount("hybrid")) },
          ],
          h,
        ),
        table(
          ["Alias", "Mode", "Effective models", "Candidate expansion", "Readiness"],
          configRows.map((entry) => [entry.label, entry.value, "—", "—", entry.meta]),
          h,
        ),
        h.div([h.Class("mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-4")], [
          h.p([h.Class("text-sm font-medium text-foreground")], ["Browse all alias pools (" + String(Math.max(configRows.length, readbacks.configuredModels.rows.length, 0)) + ")"]),
          h.span([h.Class("inline-flex size-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground")], ["⌄"]),
        ]),
      ],
      h,
    ),
    sectionCard(
      "Routing candidates",
      "Concrete endpoint and model candidates currently visible to the router for this runtime posture.",
      [
        table(
          ["Model", "Endpoint", "Source", "Health", "Routing"],
          candidateRows.map((entry) => {
            let meta: { endpointId?: string; providerId?: string; healthStatus?: string } = {};
            try { meta = JSON.parse(entry.meta) as typeof meta; } catch { meta = {}; }
            return [
              entry.label,
              meta.endpointId ?? metaText(entry.meta),
              meta.providerId ?? "—",
              meta.healthStatus ?? "—",
              entry.value === "" ? "candidate" : entry.value,
            ];
          }),
          h,
        ),
      ],
      h,
    ),
    h.p([h.Class("mt-3 " + bodyClass)], [summary.length === 0 ? "No router summary readback available yet." : summary.map((entry) => entry.label + ": " + entry.value).join(" · ")]),
  ], h);
};

export const routerCandidatesPage = (readbacks: ReadbacksState, h: H): Html => {
  const readback = readbacks.routerCandidates;
  const state = readback.status === "idle" ? "loading" : readback.status;
  const rows = readback.rows;
  return familyShell("router-candidates", state, [
    sectionCard(
      "Candidate inventory",
      "CAP is benchmark capability; its evidence is labeled exact, borrowed, or prior so a provider-default arm never reads as a fixed arm's benchmark. Live p50, failure, and samples come only from the exact endpoint's operational telemetry profile.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], [state === "loading" ? "Loading routing candidates…" : state === "error" ? (readback.message ?? "Router candidates read failed") : "No routing candidates are available yet."])]
          : [h.div([h.Class("grid gap-4 xl:grid-cols-2")], rows.map((entry) => {
              let meta: { endpointId?: string; providerId?: string; healthStatus?: string; roleIds?: readonly string[] } = {};
              try { meta = JSON.parse(entry.meta) as typeof meta; } catch { meta = {}; }
              const roleIds = meta.roleIds ?? [];
              const roles = roleIds.length > 4 ? roleIds.slice(0, 4).join(", ") + ", +" + String(roleIds.length - 4) + " more" : roleIds.join(", ") || "—";
              return h.div([h.Class("rounded-lg border border-border bg-card p-4")], [
                h.div([h.Class("flex items-start justify-between gap-3")], [
                  h.p([h.Class("border-l-2 border-primary pl-2 text-[13px] font-semibold text-foreground")], [entry.label]),
                  h.span([h.Class("rounded-md border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground")], [meta.healthStatus ?? "—"]),
                ]),
                h.div([h.Class("mt-3 grid gap-3 sm:grid-cols-3")], [
                  { label: "ENDPOINT", value: meta.endpointId ?? metaText(entry.meta) },
                  { label: "SOURCE", value: meta.providerId === undefined ? "—" : meta.providerId + " · remote-service" },
                  { label: "CAP", value: "n/a" }, { label: "EFFORT", value: "—" },
                  { label: "LIVE P50", value: "n/a" }, { label: "LIVE FAIL", value: "n/a" },
                  { label: "LIVE SAMPLES", value: "n/a" }, { label: "ROLES", value: roles },
                  { label: "TOOLING", value: "none" },
                ].map((item) => h.div([h.Class("flex flex-col gap-0.5")], [h.p([h.Class(eyebrowClass)], [item.label]), h.p([h.Class("break-words font-mono text-[12px] leading-4 text-foreground")], [item.value])]))),
              ]);
            }))]),
      ],
      h,
    ),
  ], h);
};

export const routerDecisionsPage = (readbacks: ReadbacksState, h: H): Html => {
  const readback = readbacks.routerDecisions;
  const state = readback.status === "idle" ? "loading" : readback.status;
  const rows = readback.rows;
  return familyShell("router-decisions", state, [
    sectionCard(
      "Decision ledger",
      "Showing " + String(Math.min(rows.length, 10)) + " of " + String(rows.length) + " routing decisions in the selected window. The page is bounded for scanability; direct drill-in links use stable request IDs.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], [state === "loading" ? "Loading routing decisions…" : state === "error" ? (readback.message ?? "Router decisions read failed") : "No routing decisions have been recorded yet."])]
          : rows.slice(0, 10).map((entry) => {
              const field = (label: string, value: string) => h.div([h.Class("flex flex-col gap-0.5")], [h.p([h.Class(eyebrowClass)], [label]), h.p([h.Class("break-words text-right font-mono text-[12px] leading-4 text-foreground")], [value])]);
              return h.div([h.Class("mb-4 rounded-lg border border-border bg-card p-4 last:mb-0")], [
                h.div([h.Class("flex items-start justify-between gap-3 border-b border-border pb-3")], [
                  h.p([h.Class("border-l-2 border-primary pl-2 font-mono text-[12px] font-semibold text-foreground")], [entry.id]),
                  h.span([h.Class("rounded-md border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground")], ["remote"]),
                ]),
                h.div([h.Class("mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6")], [
                  field("MODEL", entry.label),
                  field("ENDPOINT", entry.meta === "" ? "—" : entry.meta),
                  field("EFFORT", "No reasoning effort"),
                  field("STRATEGY", "no strategy label"),
                  field("SOURCE", "remote"),
                  field("DECIDED", "n/a"),
                ]),
                h.div([h.Class("mt-3 flex flex-wrap gap-3 text-[12px]")], [
                  h.a([h.Href("/router/decisions/" + encodeURIComponent(entry.id)), h.Class("inline-flex min-h-[24px] items-center text-[var(--rm-accent)]")], ["Router · Open detail"]),
                  h.a([h.Href("/observe/requests/" + encodeURIComponent(entry.id)), h.Class("inline-flex min-h-[24px] items-center " + bodyClass)], ["Observe · Open detail"]),
                ]),
              ]);
            })),
      ],
      h,
    ),
  ], h);
};

export const routerStrategyPage = (routeName: string, readbacks: ReadbacksState, h: H): Html => {
  const { rows, state, message } = family(readbacks, ["strategy", "executionMode", "routing."]);
  const strategy = rows.find((entry) => entry.id === "strategy")?.value;
  const executionMode = rows.find((entry) => entry.id === "executionMode")?.value;
  return familyShell(routeName, state, [
    sectionCard(
      "Routing strategy",
      "Edit the routing mode, scoring strategy and execution scope. Each preset materialises one alias per execution scope; the next decision uses the saved posture.",
      [
        h.div([h.Class("grid gap-3 xl:grid-cols-3")], [
          selectField("Routing mode", ["baseline", "hybrid", "difficulty"], strategy, h),
          selectField("Scoring strategy", ["balanced", "cost", "quality", "difficulty", "latency", "custom"], undefined, h),
          selectField("Execution scope", ["decision_only", "shadow", "enforce"], executionMode, h),
        ]),
        h.p([h.Class(bodyClass)], ["Quality / Cost / Speed / Failure / Diversity / Latency weights are validated and persisted with the posture."]),
        h.div([h.Class("flex flex-wrap gap-2")], [
          controlButton("Save routing strategy", undefined, h),
          controlButton("Reset to saved posture", undefined, h),
        ]),
        ...(message === undefined ? [] : [h.p([h.Class(bodyClass)], [message])]),
      ],
      h,
    ),
    sectionCard(
      "Measured-latency override",
      "Use measured endpoint latency when it is available instead of the declared cost and quality weights.",
      [
        selectField("Measured-latency override", ["off", "on"], "off", h),
        h.p([h.Class(bodyClass)], ["The override is persisted with the routing posture; the preview editor does not write it."]),
      ],
      h,
    ),
    sectionCard(
      "Saved posture",
      "The persisted routing strategy and execution mode read from the live host.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], ["No routing strategy readback available yet."])]
          : [postureRows(rows, h)]),
      ],
      h,
    ),
  ], h);
};

const posturePage = (kind: "workload" | "role", routeName: string, readbacks: ReadbacksState, h: H): Html => {
  const prefix = kind === "role" ? "agentStrategy." : "workload.";
  const title = kind === "role" ? "Agent strategy" : "Workloads";
  const { rows, state, message } = family(readbacks, [prefix]);
  const diagnostics = family(readbacks, ["diagnostics."]);
  return familyShell(routeName, state, [
    ...(kind === "role"
      ? [filterBar([
          { label: "Scoring strategy", value: "Quality", options: ["Quality"] },
          { label: "Routing mode", value: "Baseline", options: ["Baseline"] },
          { label: "Compute preference", value: "remote", options: ["remote"] },
        ], h)]
      : []),
    sectionCard(
      title,
      kind === "role"
        ? "Role-bound postures. Each entry materialises one alias per execution scope and inherits the role the operator bound to it."
        : "Workload postures. Each entry materialises one alias per execution scope for a workload shape that no taxonomy role covers.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], [message ?? "No " + title + " entries are configured yet."])]
          : [postureRows(rows, h)]),
        ...(kind === "role"
          ? [h.div([h.Class("flex flex-wrap gap-2")], [
              controlButton("Save Agent strategy", undefined, h),
              controlButton("Add agent strategy", undefined, h),
            ])]
          : []),
      ],
      h,
    ),
    diagnosticsPanel(diagnostics.rows, diagnostics.state, h),
    ...(kind === "workload" ? [sectionCard(
      "Workload templates",
      "Start from a workload template, then edit the entry before saving.",
      [
        h.div([h.Class("flex flex-wrap gap-2")], [
          controlButton("Use batch template", undefined, h),
          controlButton("Use embedding template", undefined, h),
          controlButton("Add workload", undefined, h),
        ]),
      ],
      h,
    )] : []),
    sectionCard(
      "Entries",
      kind === "role"
        ? "Entries materialise one role-bound alias per execution scope."
        : "Entries materialise one workload alias per execution scope.",
      [
        h.p([h.Class(bodyClass)], [String(rows.length) + " saved · 0 new rows. Add as many entries as you need: saving upserts only the rows below and never touches an entry you did not edit."]),
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], ["No " + title + " entries are configured yet."])]
          : [postureRows(rows, h)]),
        h.div([h.Class("mt-3 flex flex-wrap gap-2")], [
          controlButton("Add " + (kind === "role" ? "entry" : "workload"), undefined, h),
          controlButton("Save " + (kind === "role" ? "Agent strategy" : "Workloads"), undefined, h),
        ]),
      ],
      h,
    ),
    ...(kind === "role"
      ? [
          sectionCard(
            "Entries editor",
            "Edit the selected entry, bind its role, then save the canonical block.",
            [
              h.p([h.Class(eyebrowClass)], ["EDITING SAVED ENTRY RESEARCHER"]),
              h.div([h.Class("grid gap-3 xl:grid-cols-3")], [
                textField("Name", "researcher", h),
                textField("Role (required)", "researcher", h),
                textField("Search, compare, synthesize, cite, and summarize information.", "researcher", h),
              ]),
              h.div([h.Class("flex flex-wrap gap-2")], [controlButton("Add entry", undefined, h), controlButton("Save Agent strategy", undefined, h)]),
            ],
            h,
          ),
        ]
      : []),
  ], h);
};

export const routerWorkloadsPage = (readbacks: ReadbacksState, h: H): Html =>
  posturePage("workload", "router-workloads", readbacks, h);

export const routerAgentStrategyPage = (readbacks: ReadbacksState, h: H): Html =>
  posturePage("role", "router-agent-strategy", readbacks, h);

export const routerConfigPage = (readbacks: ReadbacksState, h: H): Html => {
  const { state } = family(readbacks, ["strategy", "executionMode", "routing.", "diagnostics."]);
  return familyShell("router-config", state, [
    h.h2([h.Class("rm3-next-route-title")], ["Routing strategy"]),
    h.p([h.Class(bodyClass)], ["The router config segment canonicalises to the routing strategy posture; there is no separate config surface."]),
    routerStrategyPage("router-config", readbacks, h),
  ], h);
};

export const controlControllerPage = (controls: ControlsState, h: H): Html => {
  const endpoints = controls.endpoints;
  const controller = controls.controlController;
  const current = controller.rows[0]?.value ?? controller.selectedEndpointId ?? "—";
  const state = endpoints.status === "idle" ? "loading" : endpoints.status;
  return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "control-controller")], [
    sectionCard(
      "Controller assignment",
      "Assign the persisted routing controller. Candidate cards keep health, source type, role coverage, and tooling posture visible before promotion.",
      [
        ...(endpoints.rows.length === 0
          ? [h.p([h.Class(bodyClass)], [state === "loading" ? "Loading controller surface…" : state === "error" ? (endpoints.error ?? "Endpoint read failed") : "No endpoints are available yet. Configure runtime config or activate a provider endpoint to continue."])]
          : [h.div([h.Class("mt-4 grid gap-4 xl:grid-cols-2")], endpoints.rows.map((row) => {
              const isCurrent = row.value === current || row.id === current || controller.selectedEndpointId === row.id;
              let meta: { endpointId?: string; providerId?: string; healthStatus?: string; roleIds?: readonly string[]; tooling?: string; serving?: string } = {};
              try { meta = JSON.parse(row.meta) as typeof meta; } catch { meta = {}; }
              const roleIds = meta.roleIds ?? [];
              const roleText = roleIds.length > 4 ? roleIds.slice(0, 4).join(", ") + ", +" + String(roleIds.length - 4) + " more" : roleIds.join(", ") || "—";
              const field = (label: string, value: string) => h.div([h.Class("flex items-start justify-between gap-4 border-b border-border py-1.5 last:border-b-0")], [
                h.span([h.Class(eyebrowClass)], [label]),
                h.span([h.Class("break-words text-right font-mono text-[12px] leading-4 text-foreground")], [value]),
              ]);
              return h.div([h.Class("rounded-lg border border-border bg-card p-4")], [
                h.div([h.Class("flex items-start justify-between gap-3")], [
                  h.p([h.Class("border-l-2 border-primary pl-2 text-[13px] font-semibold text-foreground")], [row.label]),
                  h.span([h.Class("rounded-md border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground")], [isCurrent ? "controller" : "active"]),
                ]),
                h.div([h.Class("mt-3")], [
                  field("ENDPOINT", meta.endpointId ?? row.id),
                  field("SOURCE", meta.providerId === undefined ? metaText(row.meta) : meta.providerId + " · remote-service"),
                  field("HEALTH", meta.healthStatus ?? (row.value === "" ? "unknown" : row.value)),
                  field("TOOLING", meta.tooling ?? "none"),
                  field("ROLES", roleText),
                  field("ROLE COUNT", roleIds.length === 0 ? "—" : String(roleIds.length) + " roles"),
                  field("SERVING", meta.serving ?? (meta.providerId === undefined ? "—" : "remote-service")),
                ]),
                h.div([h.Class("mt-3")], [
                  isCurrent
                    ? h.button([h.Type("button"), h.AriaDisabled(true), h.Class("rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground opacity-60")], ["Current controller"])
                    : controlButton("Use as controller", Message.ControllerSaveRequested({ endpointId: row.id }), h),
                  ...(isCurrent ? [] : [h.p([h.Class("mt-2 text-xs text-muted-foreground")], ["Promote this endpoint to the persisted routing controller."])]),
                ]),
              ]);
            }))]),
      ],
      h,
    ),
    renderControlPage(CONTROL_SPECS.controlController, controller, h, endpoints.rows.map((row) => row.id)),
  ]);
};
