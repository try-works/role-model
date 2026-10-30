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
  return familyShell("router", readbacks.router.status === "idle" ? "loading" : candidates.status, [
    h.h2([h.Class("rm3-next-route-title")], ["Routing overview"]),
    sectionCard(
      "Alias inventory",
      "Keep the current alias posture visible, then expand the registry only when you need every pool.",
      [
        statGrid(
          [
            { label: "Current active alias", value: activeAlias },
            { label: "Alias readiness", value: summary.length > 0 ? summary.length + " summary row(s)" : "No alias rows available." },
            { label: "Alias modes", value: executionMode },
          ],
          h,
        ),
        table(
          ["Alias", "Mode", "Effective models", "Candidate expansion", "Readiness"],
          configRows.map((entry) => [entry.label, entry.value, "—", "—", entry.meta]),
          h,
        ),
      ],
      h,
    ),
    sectionCard(
      "Routing candidates",
      "Concrete endpoint and model candidates currently visible to the router for this runtime posture.",
      [
        table(
          ["Model", "Endpoint", "Source", "Health", "Routing"],
          candidateRows.map((entry) => [
            entry.label,
            metaText(entry.meta),
            "—",
            "—",
            entry.value,
          ]),
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
    h.h2([h.Class("rm3-next-route-title")], ["Candidate inventory"]),
    h.h3([h.Class("mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--rm-muted)]")], ["Candidate inventory"]),
    sectionCard(
      "Candidate inventory",
      "CAP is benchmark capability; its evidence is labeled exact, borrowed, or prior so a provider-default arm never reads as a fixed arm's benchmark. Live p50, failure, and samples come only from the exact endpoint's operational telemetry profile.",
      [
        ...(rows.length === 0
          ? [
              h.p(
                [h.Class(bodyClass)],
                [state === "loading" ? "Loading routing candidates…" : state === "error" ? (readback.message ?? "Router candidates read failed") : "No routing candidates are available yet."],
              ),
            ]
          : rows.map((entry) =>
              h.div([h.Class(cardClass)], [
                h.p([h.Class(strongClass)], [entry.label]),
                statGrid(
                  [
                    { label: "ENDPOINT", value: metaText(entry.meta) },
                    { label: "SOURCE", value: "—" },
                    { label: "CAP", value: entry.value === "" ? "—" : entry.value },
                    { label: "EFFORT", value: "—" },
                    { label: "LIVE P50", value: "n/a" },
                    { label: "LIVE FAIL", value: "n/a" },
                    { label: "LIVE SAMPLES", value: "n/a" },
                    { label: "ROLES", value: "—" },
                    { label: "TOOLING", value: "—" },
                  ],
                  h,
                ),
              ]),
            )),
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
    h.h2([h.Class("rm3-next-route-title")], ["Routing decisions"]),
    sectionCard(
      "Decision ledger",
      "Showing " + String(rows.length) + " of " + String(rows.length) + " routing decisions in the selected window. The page is bounded for scanability; direct drill-in links use stable request IDs.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], [state === "loading" ? "Loading routing decisions…" : state === "error" ? (readback.message ?? "Router decisions read failed") : "No routing decisions have been recorded yet."])]
          : rows.map((entry) =>
              h.div([h.Class(cardClass)], [
                h.p([h.Class(strongClass)], [entry.id]),
                statGrid(
                  [
                    { label: "MODEL", value: entry.label },
                    { label: "ENDPOINT", value: entry.meta === "" ? "—" : entry.meta },
                    { label: "EFFORT", value: "No reasoning effort" },
                    { label: "STRATEGY", value: "no strategy label" },
                    { label: "SOURCE", value: "remote" },
                    { label: "DECIDED", value: "n/a" },
                  ],
                  h,
                ),
                h.div([h.Class("mt-2 flex flex-wrap gap-3 text-[12px]")], [
                  h.a([h.Href("/router/decisions/" + encodeURIComponent(entry.id)), h.Class("text-[var(--rm-accent)]")], ["Router · Open detail"]),
                  h.a([h.Href("/observe/requests/" + encodeURIComponent(entry.id)), h.Class(bodyClass)], ["Observe · Open detail"]),
                ]),
              ]),
            )),
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
    h.h2([h.Class("rm3-next-route-title")], ["Routing strategy"]),
    previewDisclosure(h),
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
    h.h2([h.Class("rm3-next-route-title")], [title]),
    previewDisclosure(h),
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
        h.div([h.Class("flex flex-wrap gap-2")], [
          controlButton(kind === "role" ? "Save Agent strategy" : "Save Workloads", undefined, h),
          controlButton("Add " + (kind === "role" ? "agent strategy" : "workload"), undefined, h),
        ]),
      ],
      h,
    ),
    sectionCard(
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
    ),
    sectionCard(
      "Entries",
      kind === "role"
        ? "Entries materialise one role-bound alias per execution scope."
        : "Entries materialise one workload alias per execution scope.",
      rows.length === 0
        ? [h.p([h.Class(bodyClass)], ["No " + title + " entries are configured yet."])]
        : [postureRows(rows, h)],
      h,
    ),
    diagnosticsPanel(diagnostics.rows, diagnostics.state, h),
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
    previewDisclosure(h),
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
    h.h2([h.Class("rm3-next-route-title")], ["Routing controller"]),
    sectionCard(
      "Controller assignment",
      "Assign the persisted routing controller. Candidate cards keep health, source type, role coverage, and tooling posture visible before promotion.",
      [
        statGrid([{ label: "Current controller", value: current }], h),
        ...(endpoints.rows.length === 0
          ? [h.p([h.Class(bodyClass)], [state === "loading" ? "Loading controller surface…" : state === "error" ? (endpoints.error ?? "Endpoint read failed") : "No endpoints are available yet. Configure runtime config or activate a provider endpoint to continue."])]
          : endpoints.rows.map((row) => {
              const isCurrent = row.value === current || row.id === current || controller.selectedEndpointId === row.id;
              return h.div([h.Class(cardClass)], [
                h.p([h.Class(strongClass)], [row.label]),
                statGrid(
                  [
                    { label: "ENDPOINT", value: row.id },
                    { label: "SOURCE", value: metaText(row.meta) },
                    { label: "HEALTH", value: row.value === "" ? "unknown" : row.value },
                    { label: "TOOLING", value: "—" },
                    { label: "ROLES", value: "—" },
                    { label: "ROLE COUNT", value: "—" },
                    { label: "SERVING", value: "—" },
                  ],
                  h,
                ),
                isCurrent
                  ? h.button([h.Type("button"), h.AriaDisabled(true), h.Class("mt-2 rounded border px-3 py-1.5 text-[12px] opacity-50")], ["Current controller"])
                  : h.div([h.Class("mt-2 space-y-1")], [
                      controlButton("Use as controller", Message.ControllerSaveRequested({ endpointId: row.id }), h),
                      h.p([h.Class(bodyClass)], ["Promote this endpoint to the persisted routing controller."]),
                    ]),
              ]);
            })),
      ],
      h,
    ),
    renderControlPage(CONTROL_SPECS.controlController, controller, h, endpoints.rows.map((row) => row.id)),
  ]);
};
