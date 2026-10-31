import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { CONTROL_SPECS, type ControlsState } from "./control";
import { card, filterBar, table as referenceTable, tableCellClass, tableHeadClass, titleClass, descriptionClass, filterLabelClass, filterControlClass } from "./features/s563-layout";
import { renderControlPage } from "./control-view";
import { Message } from "./message";
import type { ReadbackRow, ReadbacksState } from "./readback";
import { ROUTER_EXECUTION_MODES, ROUTER_MODES, ROUTER_SCORING_STRATEGIES, initialRouterPostureState, type RouterPostureState } from "./router-posture";

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
const wiredSelect = (
  label: string,
  options: readonly string[],
  selected: string,
  field: "mode" | "scoringStrategy" | "executionMode" | "pinWeights",
  h: H,
): Html =>
  h.label([h.Class("flex max-w-[420px] flex-col gap-1.5")], [
    h.span([h.Class(filterLabelClass)], [label]),
    h.select(
      [
        h.AriaLabel(label),
        h.Class(filterControlClass),
        h.OnChange((value: string) => Message.RouterPostureFieldChanged({ field, value })),
      ],
      options.map((option) => h.option([h.Value(option), ...(option === selected ? [h.Selected(true)] : [])], [option])),
    ),
  ]);

const postureStatusLine = (state: RouterPostureState, h: H): readonly Html[] =>
  state.message === undefined
    ? []
    : [h.p([h.Role(state.status === "error" ? "alert" : "status"), h.DataAttribute("router-posture-status", state.status), h.Class(bodyClass)], [state.message])];

const blockEditor = (
  label: string,
  value: string,
  block: "agent_strategies" | "workloads",
  state: RouterPostureState,
  h: H,
): Html =>
  h.div([h.Class("flex flex-col gap-2")], [
    h.label([h.Class("flex flex-col gap-1.5")], [
      h.span([h.Class(filterLabelClass)], [label]),
      h.textarea(
        [
          h.AriaLabel(label),
          h.Class("min-h-[220px] w-full rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-bg)] p-2 font-mono text-[12px] leading-5 text-[var(--rm-fg)]"),
          h.Value(value),
          h.OnInput((next: string) => Message.RouterBlockChanged({ block, value: next })),
        ],
      ),
    ]),
    h.div([h.Class("flex flex-wrap gap-2")], [
      h.button(
        [
          h.Type("button"),
          h.Class("justify-self-start rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50"),
          ...(state.status === "saving" ? [h.AriaDisabled(true)] : [h.OnClick(Message.RouterBlockSaveRequested({ block }))]),
        ],
        [block === "agent_strategies" ? "Save Agent strategy" : "Save Workloads"],
      ),
      h.button(
        [h.Type("button"), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)]"), h.OnClick(Message.RouterPostureResetRequested({}))],
        ["Reload from host"],
      ),
    ]),
    ...postureStatusLine(state, h),
  ]);

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
  const candidateHealth = candidateRows.map((entry) => {
    try {
      // SAFETY: routerCandidates rows carry the candidate JSON record in meta.
      return String((JSON.parse(entry.meta) as { healthStatus?: string }).healthStatus ?? "");
    } catch {
      return "";
    }
  });
  const countCandidateHealth = (needle: string): number => candidateHealth.filter((value) => value === needle).length;
  const ready = countCandidateHealth("healthy");
  const degraded = countCandidateHealth("degraded");
  const unavailable = candidateHealth.filter((value) => value === "provider-unavailable" || value === "unavailable").length;
  const runtimeMeta = readbacks.runtimeConfig.rows[0]?.meta;
  let aliases: ReadonlyArray<{ aliasId?: string; mode?: string; modelIds?: ReadonlyArray<string> }> = [];
  try {
    // SAFETY: runtimeConfig rows carry {applied, config, path} in meta.
    const parsed = runtimeMeta === undefined ? {} : (JSON.parse(runtimeMeta) as { config?: { modelAliases?: ReadonlyArray<{ aliasId?: string; mode?: string; modelIds?: ReadonlyArray<string> }> } });
    aliases = parsed.config?.modelAliases ?? [];
  } catch {
    aliases = [];
  }
  const aliasRows = aliases.map((alias) => [
    alias.aliasId ?? "—",
    alias.mode ?? "—",
    (alias.modelIds ?? []).join(", ") || "—",
    String((alias.modelIds ?? []).length),
    alias.mode === undefined ? "—" : "configured",
  ]);
  const modes = aliases.map((alias) => (alias.mode ?? "").toLowerCase()).filter((mode) => mode.length > 0);
  const modeCount = (mode: string): number => modes.filter((value) => value === mode).length;
  return familyShell("router", readbacks.router.status === "idle" ? "loading" : candidates.status, [
    sectionCard(
      "Alias inventory",
      "Keep the current alias posture visible, then expand the registry only when you need every pool.",
      [
        statGrid(
          [
            { label: "Current active alias", value: activeAlias + "." + executionMode },
            { label: "Alias readiness", value: candidateRows.length === 0 ? "No readiness rows available." : String(ready) + " ready · " + String(degraded) + " degraded · " + String(unavailable) + " unavailable" },
            { label: "Alias modes", value: modes.length === 0 ? "—" : "basic " + String(modeCount("basic")) + " · difficulty " + String(modeCount("difficulty")) + " · hybrid " + String(modeCount("hybrid")) },
          ],
          h,
        ),
        table(
          ["Alias", "Mode", "Effective models", "Candidate expansion", "Readiness"],
          aliasRows.length > 0 ? aliasRows : configRows.map((entry) => [entry.label, entry.value, "—", "—", entry.meta]),
          h,
        ),
        h.div([h.Class("mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-4")], [
          h.p([h.Class("text-sm font-medium text-foreground")], ["Browse all alias pools (" + String(Math.max(aliasRows.length, configRows.length, 0)) + ")"]),
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

export const routerStrategyPage = (
  routeName: string,
  readbacks: ReadbacksState,
  posture: RouterPostureState | undefined,
  h: H,
): Html => {
  const state = posture ?? initialRouterPostureState();
  const { rows, state: readState, message: readMessage } = family(readbacks, ["strategy", "executionMode", "routing."]);
  const persisted = rows.find((entry) => entry.id === "strategy")?.value;
  const persistedExecution = rows.find((entry) => entry.id === "executionMode")?.value;
  const persistedMode = rows.find((entry) => entry.id === "routing.mode")?.value;
  const persistedScoring = rows.find((entry) => entry.id === "routing.scoringStrategy")?.value;
  const mode = state.mode.length > 0 ? state.mode : persistedMode ?? persisted ?? "baseline";
  const scoringStrategy = state.scoringStrategy.length > 0 ? state.scoringStrategy : persistedScoring ?? "balanced";
  const executionMode = state.executionMode.length > 0 ? state.executionMode : persistedExecution ?? "decision_only";
  const busy = state.status === "saving";
  return familyShell(routeName, readState, [
    sectionCard(
      "Routing strategy",
      "Edit the routing mode, scoring strategy and execution scope. Saving writes the unified runtime config, and the next decision uses the saved posture.",
      [
        h.div([h.Class("grid gap-3 xl:grid-cols-3")], [
          wiredSelect("Routing mode", ROUTER_MODES, mode, "mode", h),
          wiredSelect("Scoring strategy", ROUTER_SCORING_STRATEGIES, scoringStrategy, "scoringStrategy", h),
          wiredSelect("Execution scope", ROUTER_EXECUTION_MODES, executionMode, "executionMode", h),
        ]),
        h.p([h.Class(bodyClass)], ["Routing mode and scoring strategy are written as the structured routing block; execution scope is written as execution_mode."]),
        h.div([h.Class("flex flex-wrap gap-2")], [
          h.button(
            [
              h.Type("button"),
              h.Class("justify-self-start rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50"),
              ...(busy ? [h.AriaDisabled(true)] : [h.OnClick(Message.RouterPostureSaveRequested({}))]),
            ],
            [busy ? "Saving routing strategy…" : "Save routing strategy"],
          ),
          h.button(
            [h.Type("button"), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)]"), h.OnClick(Message.RouterPostureResetRequested({}))],
            ["Reset to saved posture"],
          ),
        ]),
        ...postureStatusLine(state, h),
      ],
      h,
    ),
    sectionCard(
      "Measured-latency override",
      "Pin the measured endpoint weights instead of the declared cost and quality weights. The override is persisted in the routing block.",
      [
        wiredSelect("Measured-latency override", ["off", "on"], state.pinWeights.length > 0 ? state.pinWeights : "off", "pinWeights", h),
      ],
      h,
    ),
    sectionCard(
      "Routing weights",
      "Quality, latency, throughput, cost, reliability and preference weights are validated and persisted with the routing posture.",
      [
        h.div([h.Class("grid gap-3 sm:grid-cols-3 xl:grid-cols-6")], [
          weightField("quality", "weightQuality", state.weightQuality.length > 0 ? state.weightQuality : "0.15", h),
          weightField("latency", "weightLatency", state.weightLatency.length > 0 ? state.weightLatency : "0.1", h),
          weightField("throughput", "weightThroughput", state.weightThroughput.length > 0 ? state.weightThroughput : "0.05", h),
          weightField("cost", "weightCost", state.weightCost.length > 0 ? state.weightCost : "0.5", h),
          weightField("reliability", "weightReliability", state.weightReliability.length > 0 ? state.weightReliability : "0.15", h),
          weightField("preference", "weightPreference", state.weightPreference.length > 0 ? state.weightPreference : "0.05", h),
        ]),
      ],
      h,
    ),
    sectionCard(
      "Saved posture",
      "The persisted routing strategy and execution mode read from the live host.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], [readMessage ?? "No routing strategy readback available yet."])]
          : [postureRows(rows, h)]),
      ],
      h,
    ),
  ], h);
};

const weightField = (
  metric: string,
  field: "weightQuality" | "weightLatency" | "weightThroughput" | "weightCost" | "weightReliability" | "weightPreference",
  value: string,
  h: H,
): Html =>
  h.label([h.Class("flex max-w-[200px] flex-col gap-1.5")], [
    h.span([h.Class(filterLabelClass)], [metric + " weight"]),
    h.input([
      h.DataAttribute("router-weight", metric),
      h.AriaLabel(metric + " weight"),
      h.Type("number"),
      h.Step("0.01"),
      h.Min("0"),
      h.Class(filterControlClass),
      h.Value(value),
      h.OnInput((next: string) => Message.RouterPostureFieldChanged({ field, value: next })),
    ]),
  ]);

const wiredTextField = (
  label: string,
  value: string,
  field: "name" | "role" | "model" | "description",
  h: H,
): Html =>
  h.label([h.Class("flex max-w-[420px] flex-col gap-1.5")], [
    h.span([h.Class(filterLabelClass)], [label]),
    h.input([
      h.AriaLabel(label),
      h.Class(filterControlClass),
      h.Type("text"),
      h.Value(value),
      h.OnInput((next: string) => Message.RouterEntryFieldChanged({ field, value: next })),
    ]),
  ]);

const blockEntries = (value: string): ReadonlyArray<Record<string, unknown>> => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object" && !Array.isArray(entry));
    if (parsed !== null && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>).map(([name, entry]) => ({ name, ...(entry !== null && typeof entry === "object" && !Array.isArray(entry) ? (entry as Record<string, unknown>) : {}) }));
    }
  } catch {
    // An invalid draft cannot be merged; the operator edits the JSON directly.
  }
  return [];
};

const appendedBlockJson = (draft: string, host: string, entries: ReadonlyArray<Record<string, unknown>>): string =>
  JSON.stringify([...blockEntries(draft.length > 0 ? draft : host), ...entries], null, 2);

const posturePage = (
  kind: "workload" | "role",
  routeName: string,
  readbacks: ReadbacksState,
  posture: RouterPostureState | undefined,
  h: H,
): Html => {
  const state = posture ?? initialRouterPostureState();
  const prefix = kind === "role" ? "agentStrategy." : "workload.";
  const title = kind === "role" ? "Agent strategy" : "Workloads";
  const { rows, state: readState, message } = family(readbacks, [prefix]);
  const diagnostics = family(readbacks, ["diagnostics."]);
  const runtimeMeta = readbacks.runtimeConfig.rows[0]?.meta;
  const blockName = kind === "role" ? "agent_strategies" : "workloads";
  let hostBlock = "[]";
  try {
    // SAFETY: runtimeConfig rows carry {applied, config, path} in meta.
    const parsed = runtimeMeta === undefined ? {} : (JSON.parse(runtimeMeta) as { config?: Record<string, unknown> });
    const block = kind === "role" ? parsed.config?.agent_strategies ?? parsed.config?.agentStrategies : parsed.config?.workloads;
    hostBlock = JSON.stringify(block ?? [], null, 2);
  } catch {
    hostBlock = "[]";
  }
  const draft = kind === "role" ? state.agentJson : state.workloadsJson;
  return familyShell(routeName, readState, [
    sectionCard(
      title,
      kind === "role"
        ? "Role-bound postures stored in the agent_strategies block of the unified runtime config."
        : "Workload postures stored in the workloads block of the unified runtime config.",
      [
        ...(rows.length === 0
          ? [h.p([h.Class(bodyClass)], [message ?? "No " + title + " entries are configured yet."])]
          : [postureRows(rows, h)]),
      ],
      h,
    ),
    diagnosticsPanel(diagnostics.rows, diagnostics.state, h),
    ...(kind === "workload"
      ? [sectionCard(
          "Workload templates",
          "Start from a workload template, then save the block.",
          [
            h.div([h.Class("flex flex-wrap gap-2")], [
              h.button([h.Type("button"), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)]"), h.OnClick(Message.RouterBlockChanged({ block: "workloads", value: appendedBlockJson(draft, hostBlock, [{ name: "batch", scoring_strategy: "cost" }]) }))], ["Use batch template"]),
              h.button([h.Type("button"), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)]"), h.OnClick(Message.RouterBlockChanged({ block: "workloads", value: appendedBlockJson(draft, hostBlock, [{ name: "embedding", scoring_strategy: "cost", required_capabilities: ["knowledge.retrieval"] }]) }))], ["Use embedding template"]),
            ]),
          ],
          h,
        )]
      : []),
    sectionCard(
      "Entries",
      String(rows.length) + " saved · edit the JSON block below to add, change or remove entries; saving replaces the whole block.",
      [
        ...(rows.length === 0 ? [h.p([h.Class(bodyClass)], ["No " + title + " entries are configured yet."])] : [postureRows(rows, h)]),
        h.div([h.Class("flex flex-wrap gap-2")], [
          h.button([h.Type("button"), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)]"), h.OnClick(Message.RouterBlockChanged({ block: blockName, value: appendedBlockJson(draft, hostBlock, [kind === "role" ? { name: state.entryName || state.entryRole || "researcher", role_id: state.entryRole || "coder", ...(state.entryModel.length > 0 ? { model_ids: [state.entryModel] } : {}) } : { name: state.entryName || "workload", scoring_strategy: state.scoringStrategy || "cost" }]) }))], [kind === "role" ? "Add entry" : "Add workload"]),
          h.button([h.Type("button"), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50"), ...(state.status === "saving" ? [h.AriaDisabled(true)] : [h.OnClick(Message.RouterBlockSaveRequested({ block: blockName }))])], [kind === "role" ? "Save Agent strategy" : "Save Workloads"]),
        ]),
      ],
      h,
    ),
    ...(kind === "role"
      ? [sectionCard(
          "Entries editor",
          "Edit the entry fields, add the entry to the JSON block, then save the canonical block.",
          [
            h.p([h.Class(eyebrowClass)], ["EDITING SAVED ENTRY RESEARCHER"]),
            h.div([h.Class("grid gap-3 xl:grid-cols-3")], [
              wiredTextField("Name", state.entryName || "researcher", "name", h),
              wiredTextField("Role (required)", state.entryRole || "coder", "role", h),
              wiredTextField("Description", state.entryDescription || "Search, compare, synthesize, cite, and summarize information.", "description", h),
            ]),
            wiredTextField("Model id", state.entryModel || "qwen3-coder", "model", h),
          ],
          h,
        )]
      : []),
    sectionCard(
      kind === "role" ? "Agent strategy JSON" : "Workloads JSON",
      "This is the exact block the host persists; saving replaces the whole block.",
      [blockEditor(kind === "role" ? "agent_strategies (JSON)" : "workloads (JSON)", draft.length > 0 ? draft : hostBlock, blockName, state, h)],
      h,
    ),
  ], h);
};

export const routerWorkloadsPage = (readbacks: ReadbacksState, posture: RouterPostureState | undefined, h: H): Html =>
  posturePage("workload", "router-workloads", readbacks, posture, h);

export const routerAgentStrategyPage = (readbacks: ReadbacksState, posture: RouterPostureState | undefined, h: H): Html =>
  posturePage("role", "router-agent-strategy", readbacks, posture, h);

export const routerConfigPage = (readbacks: ReadbacksState, posture: RouterPostureState | undefined, h: H): Html => {
  const { state } = family(readbacks, ["strategy", "executionMode", "routing.", "diagnostics."]);
  return familyShell("router-config", state, [
    h.h2([h.Class("rm3-next-route-title")], ["Routing strategy"]),
    h.p([h.Class(bodyClass)], ["The router config segment canonicalises to the routing strategy posture; there is no separate config surface."]),
    routerStrategyPage("router-config", readbacks, posture, h),
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
