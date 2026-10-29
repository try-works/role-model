import { view as uiButtonView } from "@role-model-router/foldkit-ui/button";
import type { Document, Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { rm3ButtonClassName, view as rm3ButtonView } from "@role-model/ui/foldkit-button";

import { CONTROL_SPECS, type ControlsState } from "./control";
import { renderControlPage } from "./control-view";
import { chartInteractionForRoute, chartStateForReadback, type ChartInteractionState } from "./chart-interaction";
import { type LearningRankingState } from "./learning-ranking";
import { renderLearningRanking } from "./learning-ranking-view";
import { controlControllerPage, routerAgentStrategyPage, routerCandidatesPage, routerConfigPage, routerDecisionsPage, routerOverviewPage, routerStrategyPage, routerWorkloadsPage } from "./router-family-view";
import { familyPage, familySvg, localChoosePage, providersPage, studioWorkspaceLabels, studioWorkspaceTitle } from "./families-view";
import type { RequestsRankingState } from "./requests-ranking";
import { initialDeviceAuthState, type DeviceAuthState } from "./device-auth";
import { initialProviderAccountState, type ProviderAccountState } from "./provider-account";
import { initialEndpointAdmissionState, type EndpointAdmissionState } from "./endpoint-admission";
import {
  type DiagnosticsSnapshot,
  diagnosticsBuildLabel,
  diagnosticsInstanceLabel,
  diagnosticsRenderText,
  formatAge,
} from "./diagnostics";
import { Message } from "./message";
import { DEFAULT_OVERVIEW_FILTERS, OVERVIEW_BREAKDOWNS, OVERVIEW_DIFFICULTIES, OVERVIEW_SOURCES, OVERVIEW_STATUSES, overviewSummary, type OverviewFilters } from "./overview-filters";
import type { Model } from "./model";
import type { ObservabilityState } from "./observability";
import { chartPointKeyAction, view as chartView } from "@role-model/ui/foldkit-chart";

import { READBACK_SPECS, type ReadbacksState, localPolicyControls, localPolicyDraftFromReadback, localPolicyFromReadback, renderReadbackPage } from "./readback";
import { endpointsRoute, providersRoute } from "./features/control/routes";
import { requestsRoute } from "./features/requests-ranking/routes";
import {
  learningConfigurationRoute,
  learningDecisionsRoute,
  learningEvidenceRoute,
  learningHistoryRoute,
  learningRoute,
  learningPacksRoute,
} from "./features/learning-ranking/routes";
import { studioRoute } from "./features/studio/routes";
import { runtimeRoute } from "./features/runtime/routes";
import { indexRoute } from "./features/overview/routes";
import { candidateSpaceCard, overviewStats, telemetryChartCard } from "./features/overview/charts";
import {
  observeActivityRoute,
  observeLogsRoute,
  observeRoutingRoute,
  observabilitySnapshotRoute,
  storeDegradationReceiptsRoute,
  telemetryRequestsRoute,
} from "./features/observe/views";
import {
  learningConfigurationRoute as learningConfigurationPage,
  learningDecisionsRoute as learningDecisionsPage,
  learningEvidenceRoute as learningEvidencePage,
  learningHistoryRoute as learningHistoryPage,
  learningOverviewRoute,
  learningPacksRoute as learningPacksPage,
} from "./features/learning/routes";
import { benchmarkRoute, modelsRolesRoute, modelsRoute } from "./features/models/routes";
import { type StudioField, type StudioState, StudioTabSchema, studioIdle } from "./studio";
import { AppRoute } from "./route";

const focusRingClass =
  "rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rm-accent)]";

const localPolicyPage = (readback: ReadbacksState["localPolicy"], h: HtmlBuilder<Message>): Html => {
  const draft = localPolicyDraftFromReadback(readback);
  const saved = localPolicyFromReadback(readback);
  const loading = readback.status === "loading" && readback.rows.length === 0;
  const error = readback.status === "error" ? readback.message ?? "Local policy read failed" : undefined;
  const { autoUnload, maxConcurrency, ttl } = localPolicyControls(draft);
  const numberField = (id: string, label: string, value: number, min: string, onInput: (value: number) => Message) =>
    h.label([h.Class("mt-3 flex flex-col gap-1 text-[12px]")], [
      h.span([], [label]),
      h.input([
        h.Class("w-full max-w-[420px] rounded border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]"),
        h.Id(id),
        h.Type("number"),
        h.Attribute("min", min),
        h.Value(String(value)),
        h.OnInput((next) => onInput(Number.parseInt(next, 10) || (min === "1" ? 1 : 0))),
      ]),
    ]);
  return h.section(
    [h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "local-policy"), h.DataAttribute("local-policy-state", readback.status)],
    [
      h.h2([h.Class("rm3-next-route-title")], ["Llama-swap host policy"]),
      familySvg(h),
      h.h3([h.Class("mt-2 text-[14px] font-semibold text-[var(--rm-fg)]")], ["Policy configuration"]),
      h.p([h.Class("text-[12px] text-[var(--rm-secondary)]")], ["Edit runtime behavior for local model loading and unloading."]),
      ...(error === undefined ? [] : [h.p([h.Role("alert"), h.DataAttribute("local-policy-error", "")], [error])]),
      ...(loading
        ? [h.p([h.DataAttribute("local-policy-loading", "")], ["Loading policy…"])]
        : draft === undefined
          ? [h.p([h.DataAttribute("local-policy-unavailable", "")], ["No local policy readback is available."])]
          : [
              h.p([h.Class("text-[12px] text-[var(--rm-secondary)]")], ["Edit runtime behavior for local model loading and unloading."]),
              numberField("local-policy-ttl", "TTL (seconds)", ttl, "0", (value) => Message.LocalPolicyTtlChanged({ value })),
              numberField("local-policy-max-concurrency", "Max concurrency", maxConcurrency, "1", (value) => Message.LocalPolicyMaxConcurrencyChanged({ value })),
              h.button([
                h.Class("mt-3 rounded border px-3 py-1.5 text-[12px]"),
                h.Id("autoUnload"),
                h.AriaPressed(String(autoUnload)),
                h.DataAttribute("local-policy-auto-unload", String(autoUnload)),
                h.OnClick(Message.LocalPolicyAutoUnloadToggled({})),
                h.Type("button"),
              ], ["Auto-unload idle models: " + (autoUnload ? "on" : "off")]),
              h.p([h.Class("mt-1 text-[11px] text-[var(--rm-muted)]")], ["Release a model after its TTL expires so inactive weights are not pinned indefinitely."]),
              ...(readback.message === undefined || readback.status === "error" ? [] : [h.p([h.Role("alert"), h.DataAttribute("local-policy-save-error", "")], [readback.message])]),
              h.div([h.Class("mt-3 flex flex-wrap gap-2")], [
                h.button([h.Class("rounded border px-3 py-1.5 text-[12px]"), h.AriaDisabled(readback.status === "loading"), h.DataAttribute("local-policy-save", ""), h.OnClick(Message.LocalPolicySaveRequested({})), h.Type("button")], [readback.status === "loading" ? "Saving…" : "Save policy"]),
                h.button([h.Class("rounded border px-3 py-1.5 text-[12px]"), h.AriaDisabled(readback.status === "loading"), h.DataAttribute("local-policy-reset", ""), h.OnClick(Message.LocalPolicyResetRequested({})), h.Type("button")], ["Reset"]),
                h.a([h.Class("rounded border px-3 py-1.5 text-[12px]"), h.Href("/local/llama-swap/models"), h.DataAttribute("local-policy-open-models", "")], ["Open models"]),
              ]),
              h.h3([h.Class("mt-5 text-[13px] font-semibold")], ["Raw policy"]),
              saved === undefined || Object.keys(saved).length === 0
                ? h.p([h.DataAttribute("local-policy-empty", "")], ["No policy configured. Save a policy to see it here."])
                : h.pre([h.Class("mt-2 overflow-x-auto rounded border border-[var(--rm-border)] p-3 text-[11px]"), h.DataAttribute("local-policy-raw", "")], [JSON.stringify(saved, null, 2)]),
            ]),
    ],
  );
};
const routeTitle = (route: Model["route"]): string =>
  AppRoute.match(route, {
    Diagnostics: ({ id }) => `Diagnostics ${id} | RM3 Foldkit shell`,
    Index: () => "Overview | RM3 Foldkit shell",
    Observability: () => "Observability | RM3 Foldkit shell",
    StoreReceipts: () => "Store receipts | RM3 Foldkit shell",
    Queues: () => "Queues | RM3 Foldkit shell",
    LocalLogs: () => "Local logs | RM3 Foldkit shell",
    RouterCandidates: () => "Router candidates | RM3 Foldkit shell",
    Requests: () => "Requests | RM3 Foldkit shell",
    RequestDetail: ({ requestId }) => `Request ${requestId} | RM3 Foldkit shell`,
    RouterDecisions: () => "Router decisions | RM3 Foldkit shell",
    RouterDecisionDetail: ({ requestId }) => `Decision ${requestId} | RM3 Foldkit shell`,
    LocalPeers: () => "Local peers | RM3 Foldkit shell",
    SystemPeers: () => "System peers | RM3 Foldkit shell",
    LocalPeerModels: () => "Peer models | RM3 Foldkit shell",
    QueuesConfiguration: () => "Queue configuration | RM3 Foldkit shell",
    IntegrationsDownstream: () => "Downstream integration | RM3 Foldkit shell",
    IntegrationsUpstream: () => "Upstream integration | RM3 Foldkit shell",
    LocalChoose: () => "Local choose | RM3 Foldkit shell",
    Benchmark: () => "Benchmark | RM3 Foldkit shell",
    StorageRetention: () => "Storage retention | RM3 Foldkit shell",
    Studio: () => "Studio | RM3 Foldkit shell",
    Learning: () => "Learning | RM3 Foldkit shell",
    LearningConfiguration: () => "Learning configuration | RM3 Foldkit shell",
    LearningPacks: () => "Learning packs | RM3 Foldkit shell",
    LearningDecisions: () => "Learning decisions | RM3 Foldkit shell",
    LearningEvidence: () => "Learning evidence | RM3 Foldkit shell",
    LearningHistory: () => "Learning history | RM3 Foldkit shell",
    LocalPolicy: () => "Local policy | RM3 Foldkit shell",
    LocalLlamaSwapModels: () => "llama-swap models | RM3 Foldkit shell",
    SystemOperator: () => "Operator | RM3 Foldkit shell",
    SystemExtensions: () => "Extensions | RM3 Foldkit shell",
    Models: () => "Models | RM3 Foldkit shell",
    ModelsRoles: () => "Model roles | RM3 Foldkit shell",
    RouterStrategy: () => "Router strategy | RM3 Foldkit shell",
    RouterWorkloads: () => "Router workloads | RM3 Foldkit shell",
    RouterConfig: () => "Router config | RM3 Foldkit shell",
    RouterAgentStrategy: () => "Agent strategy | RM3 Foldkit shell",
    Runtime: () => "Runtime | RM3 Foldkit shell",
    SessionReadiness: () => "Session readiness | RM3 Foldkit shell",
    Dashboard: () => "Dashboard | RM3 Foldkit shell",
    LocalSwap: () => "Local swap | RM3 Foldkit shell",
    ObserveActivity: () => "Activity | RM3 Foldkit shell",
    ObserveLogs: () => "Observe logs | RM3 Foldkit shell",
    ObserveRouting: () => "Observe routing | RM3 Foldkit shell",
    Router: () => "Router | RM3 Foldkit shell",
    Providers: () => "Providers | RM3 Foldkit shell",
    Endpoints: () => "Endpoints | RM3 Foldkit shell",
    ControlController: () => "Controller | RM3 Foldkit shell",
    NotFound: ({ path }) => `Not found: ${path} | RM3 Foldkit shell`,
  });

interface ShellNavItem {
  readonly label: string;
  readonly href: string | null;
  readonly active: boolean;
  readonly dataNav?: string;
}

const shellNavItems = (route: Model["route"]): ReadonlyArray<ShellNavItem> => [
  { active: route._tag === "Index", dataNav: "index", href: "/", label: "Overview" },
  {
    active: route._tag === "Diagnostics",
    dataNav: "diagnostics",
    href: "/diagnostics/42",
    label: "Diagnostics",
  },
  {
    active: route._tag === "Observability",
    dataNav: "observability",
    href: "/observe/observability-snapshot",
    label: "Observability",
  },
  {
    active: route._tag === "StoreReceipts",
    dataNav: "store-receipts",
    href: "/observe/store-degradation-receipts",
    label: "Receipts",
  },
  { active: route._tag === "Queues", dataNav: "queues", href: "/observe/queues", label: "Queues" },
  {
    active: route._tag === "LocalLogs",
    dataNav: "local-logs",
    href: "/local/logs",
    label: "Local logs",
  },
  {
    active: route._tag === "RouterCandidates",
    dataNav: "router-candidates",
    href: "/router/candidates",
    label: "Candidates",
  },
  { active: route._tag === "Requests", dataNav: "requests", href: "/requests", label: "Requests" },
  {
    active: route._tag === "RouterDecisions",
    dataNav: "router-decisions",
    href: "/router/decisions",
    label: "Decisions",
  },
  {
    active: route._tag === "SystemPeers",
    dataNav: "system-peers",
    href: "/system/peers",
    label: "System peers",
  },
  {
    active: route._tag === "LocalPeers",
    dataNav: "local-peers",
    href: "/local/peers",
    label: "Local peers",
  },
  { active: route._tag === "Runtime", dataNav: "runtime", href: "/runtime", label: "Runtime" },
  {
    active: route._tag === "Providers",
    dataNav: "providers",
    href: "/control/providers",
    label: "Providers",
  },
  {
    active: route._tag === "Endpoints",
    dataNav: "endpoints",
    href: "/control/endpoints",
    label: "Endpoints",
  },
  {
    active: route._tag === "ControlController",
    dataNav: "control-controller",
    href: "/control/controller",
    label: "Controller",
  },
  {
    active: route._tag === "SessionReadiness",
    dataNav: "session-readiness",
    href: "/session-readiness",
    label: "Readiness",
  },
  {
    active: route._tag === "Dashboard",
    dataNav: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
  },
  { active: route._tag === "LocalSwap", dataNav: "local-swap", href: "/local/swap", label: "Swap" },
  {
    active: route._tag === "ObserveActivity",
    dataNav: "observe-activity",
    href: "/observe/activity",
    label: "Activity",
  },
  {
    active: route._tag === "ObserveLogs",
    dataNav: "observe-logs",
    href: "/observe/logs",
    label: "Observe logs",
  },
  {
    active: route._tag === "ObserveRouting",
    dataNav: "observe-routing",
    href: "/observe/routing",
    label: "Observe routing",
  },
  { active: route._tag === "Router", dataNav: "router", href: "/router", label: "Router" },
  { active: route._tag === "RouterStrategy", dataNav: "router-strategy", href: "/router/strategy", label: "Router strategy" },
  { active: route._tag === "RouterWorkloads", dataNav: "router-workloads", href: "/router/workloads", label: "Workloads" },
  { active: route._tag === "RouterConfig", dataNav: "router-config", href: "/router/config", label: "Router config" },
  { active: route._tag === "RouterAgentStrategy", dataNav: "router-agent-strategy", href: "/router/agent-strategy", label: "Agent strategy" },
  { active: route._tag === "Studio", dataNav: "studio", href: "/studio", label: "Studio" },
  { active: route._tag === "Learning", dataNav: "learning", href: "/learning", label: "Learning" },
  { active: route._tag === "LearningConfiguration", dataNav: "learning-configuration", href: "/learning/configuration", label: "Learning configuration" },
  { active: route._tag === "LearningPacks", dataNav: "learning-packs", href: "/learning/packs", label: "Learning packs" },
  { active: route._tag === "LearningDecisions", dataNav: "learning-decisions", href: "/learning/decisions", label: "Learning decisions" },
  { active: route._tag === "LearningEvidence", dataNav: "learning-evidence", href: "/learning/evidence", label: "Learning evidence" },
  { active: route._tag === "LearningHistory", dataNav: "learning-history", href: "/learning/history", label: "Learning history" },
  { active: route._tag === "LocalLlamaSwapModels", dataNav: "local-llama-swap-models", href: "/local/llama-swap/models", label: "llama-swap models" },
  { active: route._tag === "SystemOperator", dataNav: "system-operator", href: "/system/operator", label: "Operator" },
  { active: route._tag === "SystemExtensions", dataNav: "system-extensions", href: "/system/extensions", label: "Extensions" },
  { active: route._tag === "Models", dataNav: "models", href: "/models", label: "Models" },
  {
    active: route._tag === "ModelsRoles",
    dataNav: "models-roles",
    href: "/models/roles",
    label: "Model roles",
  },
];

const navGroup = (item: ShellNavItem): string => {
  const nav = item.dataNav ?? "";
  if (["index", "diagnostics", "observability"].includes(nav)) return "Overview";
  if (["requests", "store-receipts", "queues", "observe-activity", "observe-logs", "observe-routing", "local-logs"].includes(nav)) return "Observe";
  if (["router", "router-candidates", "router-decisions", "providers", "endpoints", "control-controller"].includes(nav)) return "Router";
  if (["local-peers", "local-swap", "system-peers", "runtime", "session-readiness", "dashboard"].includes(nav)) return "System";
  if (["studio"].includes(nav)) return "Studio";
  if (["learning"].includes(nav)) return "Learning";
  if (["models"].includes(nav)) return "Models";
  return "Other";
};
const shellNav = (route: Model["route"], label: string, h: HtmlBuilder<Message>): Html => {
  const groups = new Map<string, ShellNavItem[]>();
  for (const item of shellNavItems(route)) {
    const group = navGroup(item);
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  return h.nav(
    [h.AriaLabel(label), h.DataAttribute("shell-nav", "")],
    [...groups.entries()].map(([group, items]) =>
      h.section([h.DataAttribute("nav-group", group), h.Class("pb-2")], [
        h.p([h.Class("px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--rm-muted)]")], [group]),
        h.ul(
          [h.Class("flex flex-col gap-0.5")],
          items.map((item) =>
            h.li([], [
              h.a(
                [
                  h.Href(item.href ?? "/"),
                  ...(item.dataNav === undefined ? [] : [h.DataAttribute("nav", item.dataNav)]),
                  ...(item.active ? [h.AriaCurrent("page")] : []),
                  h.DataAttribute("nav-state", item.active ? "active" : "available"),
                  h.Class(
                    `flex min-h-8 items-center rounded-[8px] px-2.5 text-[13px] ${focusRingClass} ${
                      item.active
                        ? "bg-[var(--rm-panel)] font-medium text-[var(--rm-fg)]"
                        : "text-[var(--rm-secondary)] hover:text-[var(--rm-fg)]"
                    }`,
                  ),
                ],
                [item.label],
              ),
            ]),
          ),
        ),
      ]),
    ),
  );
};

const diagnosticsToneClass = (snapshot: DiagnosticsSnapshot): string => {
  switch (snapshot.status) {
    case "disabled":
      return "border-dashed";
    case "denied":
    case "error":
      return "border-[var(--rm-danger)]";
    case "stale":
    case "dropped":
      return "border-[var(--rm-warning)]";
    default:
      return "";
  }
};

const diagnosticsRecords = (snapshot: DiagnosticsSnapshot, h: HtmlBuilder<Message>): Html => {
  if (snapshot.records.length === 0) {
    return null;
  }
  return h.ul(
    [h.Class("mt-3 space-y-1.5"), h.DataAttribute("testid", "diagnostics-records")],
    snapshot.records.map((record) =>
      h.li(
        [
          h.Class(
            "flex flex-wrap items-baseline gap-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px] leading-4",
          ),
        ],
        [
          h.span(
            [h.Class("font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--rm-muted)]")],
            [record.level],
          ),
          h.span([h.Class("break-all font-mono text-[var(--rm-fg)]")], [record.code]),
          h.span([h.Class("ml-auto text-[var(--rm-secondary)]")], [`×${String(record.count)}`]),
        ],
      ),
    ),
  );
};

const diagnosticsBounds = (snapshot: DiagnosticsSnapshot, h: HtmlBuilder<Message>): Html | null => {
  if (snapshot.maxRecords === undefined && snapshot.maxResponseBytes === undefined) {
    return null;
  }
  const cap = [
    snapshot.maxRecords === undefined ? undefined : `${String(snapshot.maxRecords)} records`,
    snapshot.maxResponseBytes === undefined
      ? undefined
      : `${String(snapshot.maxResponseBytes)} bytes`,
    snapshot.maxIdentityBytes === undefined
      ? undefined
      : `identity ≤${String(snapshot.maxIdentityBytes)} B`,
    snapshot.maxCodeBytes === undefined ? undefined : `code ≤${String(snapshot.maxCodeBytes)} B`,
  ]
    .filter((part): part is string => part !== undefined)
    .join(" / ");
  const truncation =
    snapshot.truncated === true
      ? ` · truncated (showing ${String(snapshot.recordCount ?? snapshot.records.length)} of ${String(snapshot.totalAvailable ?? 0)})`
      : "";
  return h.p(
    [h.Class("mt-1 text-[12px] leading-4 text-[var(--rm-secondary)]")],
    [`bounded read: ${cap}${truncation}`],
  );
};

const diagnosticsConditions = (
  snapshot: DiagnosticsSnapshot,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  const lines: Html[] = [];
  if (snapshot.status !== "stale" && snapshot.conditionStale === true) {
    lines.push(
      h.p(
        [h.Class("mt-1 text-[12px] leading-4 text-[var(--rm-secondary)]")],
        [
          `also stale: newest record ${formatAge(snapshot.staleAgeMs)} old (rule ${formatAge(snapshot.staleRuleMs)})`,
        ],
      ),
    );
  }
  if (snapshot.status !== "dropped" && snapshot.conditionDropped === true) {
    lines.push(
      h.p(
        [h.Class("mt-1 text-[12px] leading-4 text-[var(--rm-secondary)]")],
        [
          `also dropped: ${String(snapshot.dropped ?? 0)} record(s) in the last ${formatAge(snapshot.droppedWindowMs)}`,
        ],
      ),
    );
  }
  return lines;
};

const diagnosticsRefresh = (h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type("button"),
      h.Class(`${rm3ButtonClassName("secondary")} mt-3 w-full ${focusRingClass} sm:w-auto`),
      h.DataAttribute("action", "refresh-diagnostics"),
      h.OnClick(Message.DiagnosticsRefreshRequested()),
    ],
    ["Refresh diagnostics"],
  );

const diagnosticsPage = (snapshot: DiagnosticsSnapshot, h: HtmlBuilder<Message>): Html => {
  const showIdentity = snapshot.status !== "loading" && snapshot.status !== "idle";
  return h.section(
    [
      h.Class(
        `mt-4 w-full rounded-lg border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 sm:p-6 ${diagnosticsToneClass(snapshot)}`,
      ),
      h.DataAttribute("diagnostics-state", snapshot.status),
      h.DataAttribute("testid", "diagnostics-panel"),
    ],
    [
      h.div(
        [h.DataAttribute("diagnostics-layout", ""), h.Class("grid gap-4 md:grid-cols-2")],
        [
          h.div(
            [],
            [
              h.p(
                [
                  h.Role("status"),
                  h.AriaLive("polite"),
                  h.AriaBusy(snapshot.status === "loading"),
                  h.Class("text-[14px] leading-[21px] text-[var(--rm-fg)]"),
                ],
                [diagnosticsRenderText(snapshot)],
              ),
              ...(snapshot.status === "stale"
                ? [
                    h.p(
                      [h.Class("mt-1 text-[12px] leading-4 text-[var(--rm-secondary)]")],
                      [
                        `rule ${formatAge(snapshot.staleRuleMs)} · age ${formatAge(snapshot.staleAgeMs)}`,
                      ],
                    ),
                  ]
                : []),
              ...(snapshot.status === "dropped"
                ? [
                    h.p(
                      [h.Class("mt-1 text-[12px] leading-4 text-[var(--rm-secondary)]")],
                      [
                        `loss window ${formatAge(snapshot.droppedWindowMs)} · ${String(snapshot.dropped ?? 0)} dropped`,
                      ],
                    ),
                  ]
                : []),
              ...diagnosticsConditions(snapshot, h),
              diagnosticsRecords(snapshot, h),
            ],
          ),
          h.div(
            [],
            [
              ...(showIdentity
                ? [
                    h.p(
                      [
                        h.Class("text-[12px] leading-4 text-[var(--rm-secondary)]"),
                        h.DataAttribute("testid", "diagnostics-identity"),
                      ],
                      [
                        `instance: ${diagnosticsInstanceLabel(snapshot)} · build: ${diagnosticsBuildLabel(snapshot)}`,
                      ],
                    ),
                  ]
                : []),
              ...(showIdentity ? [diagnosticsBounds(snapshot, h)] : []),
              diagnosticsRefresh(h),
            ],
          ),
        ],
      ),
    ],
  );
};

const observabilityPage = (state: ObservabilityState, h: HtmlBuilder<Message>): Html => {
  const rows =
    state.status === "ok"
      ? state.rows.map((row) =>
          h.li(
            [
              h.Class(
                "flex flex-wrap items-baseline gap-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px] leading-4",
              ),
            ],
            [
              h.span([h.Class("break-all font-mono text-[var(--rm-fg)]")], [row.name]),
              h.span([h.Class("ml-auto font-medium text-[var(--rm-fg)]")], [String(row.count)]),
              h.span(
                [h.Class("text-[11px] text-[var(--rm-secondary)]")],
                [row.incremental ? "incremental" : "snapshot"],
              ),
            ],
          ),
        )
      : [];
  const statusText = (() => {
    switch (state.status) {
      case "loading":
        return "Loading observability snapshot…";
      case "error":
        return state.message ?? "Observability read failed: unknown error";
      case "empty":
        return "No metrics recorded yet.";
      case "ok":
        return `${String(state.rows.length)} metric row(s) in the live registry`;
      case "idle":
        return "Waiting for the observability read.";
    }
  })();
  return h.section(
    [
      h.Class("rm3-next-route mt-4"),
      h.DataAttribute("route", "observability"),
      h.DataAttribute("observability-state", state.status),
      h.DataAttribute("state", state.status),
      ...(state.status === "error" ? [h.Role("alert")] : []),
    ],
    [
      h.p(
        [h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")],
        ["Runtime readback"],
      ),
      h.h2([h.Class("rm3-next-route-title")], ["Observability snapshot"]),
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.AriaBusy(state.status === "loading"),
          h.Class("mt-1 text-[13px] leading-5 text-[var(--rm-secondary)]"),
        ],
        [statusText],
      ),
      ...(state.status === "ok" ? [h.ul([h.Class("mt-3 space-y-1.5")], rows)] : []),
      h.p(
        [h.Class("mt-3 text-[11px] leading-4 text-[var(--rm-muted)]")],
        [
          "Refresh follows the shell's single runtime subscription; this page does not open its own.",
        ],
      ),
    ],
  );
};

const WINDOW_OPTIONS = [
  { label: "Day", windowMs: 86_400_000 },
  { label: "Week", windowMs: 604_800_000 },
  { label: "Month", windowMs: 2_592_000_000 },
  { label: "90 days", windowMs: 7_776_000_000 },
] as const;
const windowLabel = (windowMs: number): string =>
  WINDOW_OPTIONS.find((option) => option.windowMs === windowMs)?.label ?? "Day";
interface OverviewItem { readonly timestamp?: unknown; readonly duration_ms?: unknown; readonly resp_status_code?: unknown; readonly modelId?: unknown; readonly tokens?: unknown; }
interface Bucket { readonly label: string; readonly avg: number; readonly p95: number; readonly success: number; readonly failure: number; readonly tokens: number; readonly empty: boolean; }
export const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};
const bucketRule = (windowMs: number): { bucketMs: number; label: (ms: number) => string } => {
  if (windowMs <= 86_400_000) return { bucketMs: 3_600_000, label: (ms) => new Date(ms).toISOString().slice(11, 13) + ":00" };
  if (windowMs <= 604_800_000) return { bucketMs: 86_400_000, label: (ms) => new Date(ms).toISOString().slice(5, 10) };
  if (windowMs <= 2_592_000_000) return { bucketMs: 86_400_000, label: (ms) => new Date(ms).toISOString().slice(5, 10) };
  return { bucketMs: 604_800_000, label: (ms) => new Date(ms).toISOString().slice(5, 10) };
};
const bucketsFor = (state: ReadbacksState["overviewMetrics"], windowMs: number): { buckets: readonly Bucket[]; models: ReadonlyMap<string, number>; period: number } => {
  const rowData = state.rows[0];
  if (rowData === undefined) return { buckets: [], models: new Map(), period: windowMs };
  const parsed = JSON.parse(rowData.meta) as { items: readonly OverviewItem[]; window: { startAtMs: number; endAtMs: number } };
  const rule = bucketRule(windowMs);
  const start = parsed.window.startAtMs;
  const end = parsed.window.endAtMs;
  const count = Math.max(1, Math.ceil((end - start) / rule.bucketMs));
  const grouped = new Map<number, { durations: number[]; success: number; failure: number; tokens: number }>();
  const models = new Map<string, number>();
  for (const item of parsed.items) {
    const raw = typeof item.timestamp === "string" ? Date.parse(item.timestamp) : Number.NaN;
    if (!Number.isFinite(raw)) continue;
    const index = Math.min(count - 1, Math.max(0, Math.floor((raw - start) / rule.bucketMs)));
    const bucket = grouped.get(index) ?? { durations: [], success: 0, failure: 0, tokens: 0 };
    const duration = Number(item.duration_ms);
    const tokenShape = item.tokens as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
    if (typeof tokenShape === "object" && tokenShape !== null) {
      const inputTokens = Number(tokenShape.input_tokens);
      const outputTokens = Number(tokenShape.output_tokens);
      if (Number.isFinite(inputTokens)) bucket.tokens += inputTokens;
      if (Number.isFinite(outputTokens)) bucket.tokens += outputTokens;
    }
    if (Number.isFinite(duration)) bucket.durations.push(duration);
    const status = Number(item.resp_status_code);
    if (status >= 200 && status < 400) bucket.success += 1;
    else bucket.failure += 1;
    grouped.set(index, bucket);
    const model = typeof item.modelId === "string" && item.modelId.length > 0 ? item.modelId : "unknown";
    models.set(model, (models.get(model) ?? 0) + 1);
  }
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucket = grouped.get(index);
    return {
      empty: bucket === undefined,
      label: rule.label(start + index * rule.bucketMs),
      avg: bucket === undefined || bucket.durations.length === 0 ? 0 : bucket.durations.reduce((sum, value) => sum + value, 0) / bucket.durations.length,
      p95: bucket === undefined ? 0 : percentile(bucket.durations, 95),
      success: bucket?.success ?? 0,
      failure: bucket?.failure ?? 0,
      tokens: bucket?.tokens ?? 0,
    };
  });
  return { buckets, models, period: count };
};
const overviewPage = (
  state: ReadbacksState["overviewMetrics"],
  candidates: ReadbacksState["routerCandidates"],
  windowMs: number,
  h: HtmlBuilder<Message>,
  appliedFilters: OverviewFilters = DEFAULT_OVERVIEW_FILTERS,
  chartInteraction: ChartInteractionState | undefined = undefined,
): Html => {
  const period = windowLabel(windowMs);
  const filterSelect = (
    label: string,
    filter: "source" | "status" | "difficulty" | "breakdown",
    value: string,
    options: readonly string[],
    labelFor: (option: string) => string,
  ) => h.label([h.Class("flex flex-col gap-1 text-[11px] text-[var(--rm-secondary)]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2 text-[12px] text-[var(--rm-fg)]"), h.DataAttribute("overview-filter", filter), h.AriaLabel(label), h.OnChange((next) => Message.OverviewFilterChanged({ filter, value: next }))], options.map((option) => h.option([h.Value(option), ...(option === value ? [h.Selected(true)] : [])], [labelFor(option)])))]);
  const filters = h.div([h.Class("mt-4 flex flex-wrap items-center gap-2"), h.DataAttribute("overview-filters", "")], [
    h.span([h.Class("text-[11px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Time range"]),
    ...WINDOW_OPTIONS.map((option) => h.button([
      h.Type("button"), h.AriaPressed(String(option.windowMs === windowMs)), h.DataAttribute("window", option.label),
      h.Class("min-h-8 rounded-[var(--rm-radius-field)] border px-2.5 text-[12px] " + (option.windowMs === windowMs ? "border-[var(--rm-border)] bg-[var(--rm-panel)] text-[var(--rm-fg)]" : "border-transparent text-[var(--rm-secondary)]")),
      h.OnClick(Message.SelectedOverviewWindow({ windowMs: option.windowMs })),
    ], [option.label])),
  ]);
  const breakdownValues = appliedFilters.breakdown === "all" ? [] : candidates.rows.flatMap((entry) => { try { const meta = JSON.parse(entry.meta) as { endpointId?: unknown; modelId?: unknown; providerId?: unknown }; const raw = appliedFilters.breakdown === "endpoint" ? meta.endpointId : appliedFilters.breakdown === "provider" ? meta.providerId : meta.modelId; return typeof raw === "string" && raw.length > 0 ? [raw] : []; } catch { return []; } });
  const advancedFilters = h.div([h.Class("mt-2 flex flex-wrap items-end gap-2"), h.DataAttribute("overview-filter-row", "")], [
    filterSelect("Breakdown", "breakdown", appliedFilters.breakdown, [...OVERVIEW_BREAKDOWNS], (option) => option === "all" ? "Total" : option === "endpoint" ? "By endpoint variant" : option === "model" ? "By upstream model" : "By provider"),
    ...(appliedFilters.breakdown === "all" ? [] : [h.label([h.Class("flex flex-col gap-1 text-[11px] text-[var(--rm-secondary)]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [appliedFilters.breakdown]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2 text-[12px] text-[var(--rm-fg)]"), h.DataAttribute("overview-filter-value", ""), h.AriaLabel("Breakdown value"), h.OnChange((next) => Message.OverviewFilterChanged({ filter: "breakdownValue", value: next }))], breakdownValues.map((option) => h.option([h.Value(option), ...(option === appliedFilters.breakdownValue ? [h.Selected(true)] : [])], [option])))])]),
    filterSelect("Source filter", "source", appliedFilters.source, [...OVERVIEW_SOURCES], (option) => option === "all" ? "All sources" : option === "local" ? "Local only" : "Remote only"),
    filterSelect("Status", "status", appliedFilters.status, [...OVERVIEW_STATUSES], (option) => option === "all" ? "All statuses" : option === "success" ? "Success only" : option === "failure" ? "Failure only" : "Unknown only"),
    filterSelect("Difficulty", "difficulty", appliedFilters.difficulty, [...OVERVIEW_DIFFICULTIES], (option) => option === "all" ? "All buckets" : option === "easy" ? "Easy only" : option === "medium" ? "Medium only" : "Hard only"),
  ]);
  const header = h.div([], [
    h.p([h.Class("text-[12px] text-[var(--rm-secondary)]"), h.DataAttribute("overview-period", period)], ["Last " + period]),
    filters,
    advancedFilters,
    h.p([h.Class("mt-2 text-[11px] text-[var(--rm-secondary)]"), h.DataAttribute("overview-summary", "")], [overviewSummary(appliedFilters)]),
  ]);
  const { buckets } = bucketsFor(state, windowMs);
  const itemCount = state.rows.reduce((sum, entry) => { try { const meta = JSON.parse(entry.meta) as { items?: unknown }; return sum + (Array.isArray(meta.items) ? meta.items.length : 0); } catch { return sum; } }, 0);
  const chartState: "empty" | "error" | "loading" | "ready" =
    state.status === "loading" ? "loading" : state.status === "error" ? "error" : state.status === "ok" && buckets.some((bucket) => !bucket.empty) ? "ready" : "empty";
  const hasData = chartState === "ready";
  const labels = buckets.length === 0 ? ["No data"] : buckets.map((bucket) => bucket.label);
  const emptyPoints = (): ReadonlyArray<{ readonly label: string; readonly value: null }> => labels.map((label) => ({ label, value: null }));
  const charts = h.div([h.Class("mt-6 grid gap-4"), h.DataAttribute("overview-charts", ""), h.DataAttribute("overview-window", period), h.DataAttribute("overview-buckets", String(buckets.filter((bucket) => !bucket.empty).length)), h.DataAttribute("overview-items", String(itemCount)), h.DataAttribute("overview-labels", String(buckets.length))], [
    candidateSpaceCard(candidates, h),
    telemetryChartCard({ description: "Input, output, and total token flow across the selected telemetry window.", emptyMessage: "No token-bearing requests have been recorded yet.", hasData, h, kind: "area", series: [
      { id: "inputTokens", label: "Input tokens", points: emptyPoints() },
      { id: "outputTokens", label: "Output tokens", points: emptyPoints() },
      { id: "totalTokens", label: "Total tokens", points: buckets.map((bucket) => ({ label: bucket.label, value: bucket.empty ? null : bucket.tokens })) },
    ], state: chartState, title: "Token usage over time" }),
    telemetryChartCard({ description: "Cache-hit token volume and cache-hit rate.", emptyMessage: "No cache activity has been recorded for this slice yet.", hasData, h, kind: "line", series: [
      { id: "cacheHitTokens", label: "Cache hit tokens", points: emptyPoints() },
      { id: "cacheHitTokenRate", label: "Cache hit token rate", points: emptyPoints() },
    ], state: chartState, title: "Cache efficiency trend" }),
    telemetryChartCard({ description: "Authoritative effective cost based on stored request-time pricing facts.", emptyMessage: "No request costs have been recorded for this slice yet.", hasData, h, kind: "line", series: [
      { id: "actualCostUsd", label: "Actual cost", points: emptyPoints() },
      { id: "estimatedCostUsd", label: "Estimated cost", points: emptyPoints() },
      { id: "effectiveCostUsd", label: "Effective cost", points: emptyPoints() },
    ], state: chartState, title: "Effective cost over time" }),
    telemetryChartCard({ description: "Routing-avoided cost, cache-avoided cost, and total avoided spend.", emptyMessage: "No routing or cache savings have been recorded yet.", hasData, h, kind: "area", series: [
      { id: "routingCostSavingsUsd", label: "Routing avoided cost", points: emptyPoints() },
      { id: "cacheCostSavingsUsd", label: "Cache avoided cost", points: emptyPoints() },
      { id: "totalAvoidedCostUsd", label: "Total avoided cost", points: emptyPoints() },
    ], state: chartState, title: "Cost avoided over time" }),
    telemetryChartCard({ description: "Average and p95 latency across the selected window.", emptyMessage: "Latency telemetry has not been recorded for this slice yet.", hasData, h, kind: "line", series: [
      { id: "averageLatencyMs", label: "Average latency", points: buckets.length === 0 ? emptyPoints() : buckets.map((bucket) => ({ label: bucket.label, value: bucket.empty ? null : bucket.avg })) },
      { id: "p95LatencyMs", label: "p95 latency", points: buckets.length === 0 ? emptyPoints() : buckets.map((bucket) => ({ label: bucket.label, value: bucket.empty ? null : bucket.p95 })) },
    ], state: chartState, title: "Latency trend" }),
    telemetryChartCard({ description: "Successful and failed request volume by time bucket.", emptyMessage: "No successful or failed requests have been recorded yet.", hasData, h, kind: "bar", series: [
      { id: "successCount", label: "Success", points: buckets.map((bucket) => ({ label: bucket.label, value: bucket.empty ? null : bucket.success })) },
      { id: "failureCount", label: "Failures", points: buckets.map((bucket) => ({ label: bucket.label, value: bucket.empty ? null : bucket.failure })) },
    ], state: chartState, title: "Success vs failure volume" }),
  ]);
  return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "index"), h.DataAttribute("readback-route", "dashboard"), h.DataAttribute("overview-state", chartState === "ready" ? "success" : chartState), h.DataAttribute("readback-state", state.status === "ok" ? "ok" : state.status)], [
    header,
    overviewStats({ cacheHitRate: "—", h, models: candidates.rows.length, requests: state.rows.length, routerEndpoint: "—" }),
    state.status === "loading" ? h.p([h.AriaBusy(true), h.DataAttribute("overview-state", "loading")], ["Loading telemetry…"]) : state.status === "error" ? h.p([h.Role("alert"), h.DataAttribute("overview-state", "error")], [state.message ?? "Telemetry read failed"]) : null,
    charts,
  ]);
};

const studioField = (label: string, field: StudioField, value: string, h: HtmlBuilder<Message>, multiline = false) =>
  h.label([h.Class("grid gap-1 text-[12px] text-[var(--rm-secondary)]")], [
    h.span([], [label]),
    multiline
      ? h.textarea([
          h.DataAttribute("studio-field", field),
          h.Class("min-h-24 rounded border border-[var(--rm-border)] bg-[var(--rm-bg)] p-2 font-mono text-[12px]"),
          h.Value(value),
          h.OnInput((next) => Message.StudioFieldChanged({ field, value: next })),
        ])
      : h.input([
          h.DataAttribute("studio-field", field),
          h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-bg)] px-2 text-[12px]"),
          h.Value(value),
          h.OnInput((next) => Message.StudioFieldChanged({ field, value: next })),
        ]),
  ]);
const studioPage = (state: StudioState, h: HtmlBuilder<Message>, configuredModels: readonly string[] = []): Html => {
  const tabs = StudioTabSchema.literals.map((tab) =>
    h.button([h.Type("button"), h.Role("tab"), h.AriaSelected(state.tab === tab), h.AriaControls("studio-panel"), h.Tabindex(state.tab === tab ? 0 : -1), h.OnKeyDown((key) => Message.StudioTabKey({ key })), h.DataAttribute("studio-tab", tab), h.AriaPressed(String(state.tab === tab)), h.OnClick(Message.StudioTabSelected({ tab })), h.Class("min-h-8 rounded px-2 text-[12px] " + (state.tab === tab ? "bg-[var(--rm-panel)] text-[var(--rm-fg)]" : "text-[var(--rm-secondary)]"))], [tab === "advanced" ? "Advanced APIs" : tab[0]?.toUpperCase() + tab.slice(1)]),
  );
  const modelValue = configuredModels.includes(state.model) ? state.model : (configuredModels[0] ?? state.model);
  const fields = state.tab === "advanced"
    ? [studioField("JSON body", "advancedBody", state.advancedBody, h, true)]
    : state.tab === "rerank"
      ? [studioField("Model", "model", modelValue, h), studioField("Query", "query", state.query, h), studioField("Documents (one per line)", "documents", state.documents, h, true)]
      : state.tab === "images"
        ? [studioField("Mode", "mode", state.mode, h), studioField("Model", "model", modelValue, h), studioField("Prompt", "prompt", state.prompt, h), studioField("Size", "size", state.size, h)]
        : [studioField("Model", "model", modelValue, h), studioField("Prompt", "prompt", state.prompt, h)];
  return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "studio"), h.DataAttribute("studio-state", state.status)], [
    h.h2([h.Class("rm3-next-route-title")], ["Studio"]),
    h.h3([h.Class("mt-2 text-[14px] font-semibold text-[var(--rm-fg)]")], [studioWorkspaceTitle(state.tab)]),
    familySvg(h),
    ...studioWorkspaceLabels(state.tab).map((label) => h.p([h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], [label])),
    h.h2([h.Class("rm3-next-route-title")], ["Studio"]),
    h.div([h.Class("mt-2 flex flex-wrap gap-1"), h.DataAttribute("studio-tabs", ""), h.Role("tablist"), h.AriaLabel("Studio tabs")], tabs),
    h.div([h.Class("mt-4 grid gap-2"), h.Id("studio-panel"), h.Role("tabpanel"), h.AriaLabel(state.tab), h.DataAttribute("studio-form", state.tab)], fields),
    h.button([h.Type("button"), h.DataAttribute("studio-run", ""), ...(state.status === "loading" ? [h.AriaBusy(true), h.Disabled(true)] : []), h.OnClick(Message.StudioRunRequested({ token: state.token + 1 })), h.Class("mt-3 min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px] text-[var(--rm-on-primary)]")], ["Run"]),
    h.div([h.Class("mt-4"), h.DataAttribute("studio-response", "")], [
      h.h2([h.Class("text-[12px] font-semibold uppercase tracking-[0.12em]")], ["RAW RESPONSE"]),
      state.status === "error"
        ? h.pre([h.Role("alert"), h.DataAttribute("studio-error", ""), h.Class("mt-2 whitespace-pre-wrap text-[12px] text-[var(--rm-error)]")], [state.message ?? "Request failed", "\n", state.responseText])
        : h.pre([h.DataAttribute("studio-raw", state.status), h.Class("mt-2 whitespace-pre-wrap text-[12px]")], [state.responseText]),
    ]),
  ]);
};

const modelsRolesPage = (readbacks: ReadbacksState, h: HtmlBuilder<Message>): Html => {
  const models = readbacks.configuredModels;
  const endpoints = readbacks.modelEndpoints;
  const statuses = [models.status, endpoints.status];
  const loading = statuses.some((status) => status === "loading" || status === "idle");
  const error = statuses.includes("error");
  const empty = models.status === "empty" || models.rows.length === 0 || endpoints.status === "empty";
  const state = loading ? "loading" : error ? "error" : empty ? "empty" : "ok";
  if (state !== "ok") {
    const message = loading
      ? "Loading model roles…"
      : error
        ? (models.message ?? endpoints.message ?? "Model roles read failed")
        : "No configured models.";
    return h.section(
      [h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models-roles"), h.DataAttribute("models-roles-state", state)],
      [
        h.h2([h.Class("rm3-next-route-title")], ["Model roles"]),
        h.p([], [message]),
      ],
    );
  }
  const endpointRoles = endpoints.rows.flatMap((entry) => {
    try {
      const meta = JSON.parse(entry.meta) as { modelId?: string; roleIds?: string[] };
      return meta.modelId === undefined ? [] : [{ modelId: meta.modelId, roles: meta.roleIds ?? [] }];
    } catch {
      return [];
    }
  });
  const rows = models.rows.map((entry) => {
    const roles = [...new Set(endpointRoles.filter((endpoint) => endpoint.modelId === entry.id).flatMap((endpoint) => endpoint.roles))];
    return { id: entry.id, roles };
  });
  return h.section(
    [h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models-roles"), h.DataAttribute("models-roles-state", "ok")],
    [
      h.h2([h.Class("rm3-next-route-title")], ["Model roles"]),
      h.p([], ["Read-only role eligibility projection from configured models and endpoint role metadata."]),
      h.ul(
        [h.Class("rm3-next-role-list")],
        rows.map((row) => h.li([], [row.id + ": " + (row.roles.length > 0 ? row.roles.join(", ") : "no roles")])),
      ),
    ],
  );
};
const modelsPage = (readbacks: ReadbacksState, h: HtmlBuilder<Message>): Html => {
  const models = readbacks.configuredModels;
  const endpoints = readbacks.modelEndpoints;
  if (models.status === "loading" || endpoints.status === "loading") return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "loading")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.p([h.AriaBusy(true)], ["Loading configured models…"])]);
  if (models.status === "error" || endpoints.status === "error") return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "error")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.p([h.Role("alert")], [models.message ?? endpoints.message ?? "Configured models read failed"])]);
  if (models.status === "empty" || models.rows.length === 0) return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "empty")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.p([], ["No configured models."])]);
  const endpointRows = endpoints.rows.flatMap((entry) => { try { return [JSON.parse(entry.meta) as { endpointId?: string; healthStatus?: string; modelId?: string; providerAccountId?: string; reasoningEffort?: string | null; reasoningEffortLevels?: string[]; roleIds?: string[]; status?: string }]; } catch { return []; } });
  const rows = models.rows.flatMap((entry) => {
    let meta: { endpointIds?: string[]; contextWindow?: number | null; id?: string; providerId?: string } = {};
    try { meta = JSON.parse(entry.meta) as typeof meta; } catch { meta = {}; }
    const endpointsForModel = endpointRows.filter((endpoint) => endpoint.modelId === entry.id || (meta.endpointIds ?? []).includes(endpoint.endpointId ?? ""));
    const endpointIds = endpointsForModel.map((endpoint) => endpoint.endpointId).filter(Boolean).join(", ") || "—";
    const health = endpointsForModel.map((endpoint) => endpoint.healthStatus ?? endpoint.status ?? "—").join(", ") || "—";
    const effort = endpointsForModel.map((endpoint) => endpoint.reasoningEffort ?? (endpoint.reasoningEffortLevels?.length ? endpoint.reasoningEffortLevels.join("/") : "unavailable")).join(", ") || "unavailable";
    const roles = endpointsForModel.flatMap((endpoint) => endpoint.roleIds ?? []);
    return [h.li([h.Class("grid gap-1 rounded-[8px] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 text-[12px]"), h.DataAttribute("model-row", entry.id)], [
      h.p([h.Class("font-mono text-[var(--rm-fg)]")], [entry.label]),
      h.p([h.Class("text-[var(--rm-secondary)]")], ["Provider: " + (meta.providerId ?? "—")]),
      h.p([h.Class("text-[var(--rm-secondary)]")], ["Endpoint: " + endpointIds]),
      h.p([h.Class("text-[var(--rm-secondary)]")], ["Status: " + health]),
      h.p([h.Class("text-[var(--rm-secondary)]")], ["Effort: " + effort]),
      h.p([h.Class("text-[var(--rm-secondary)]")], ["Roles: " + (roles.length > 0 ? roles.join(", ") : "—")]),
    ])];
  });
  return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "success")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.ul([h.Class("mt-3 grid gap-2")], rows)]);
};

const finalFamilyPage = (label: string, routeName: string, sections: ReadonlyArray<{ label: string; spec: Parameters<typeof renderReadbackPage>[0]; readback: ReadbacksState[keyof ReadbacksState] }>, h: HtmlBuilder<Message>): Html => {
  const first = sections[0];
  const status = first.readback.status === "idle" ? "loading" : first.readback.status;
  return h.section(
    [h.Class("rm3-next-route mt-4"), h.DataAttribute("route", routeName), h.DataAttribute("final-family-state", status)],
    [
      h.h2([h.Class("rm3-next-route-title")], [label]),
      ...sections.flatMap((section) => [h.h3([], [section.label]), renderReadbackPage(section.spec, section.readback, h)]),
    ],
  );
};
const learningFamilyPage = (label: string, routeName: string, spec: Parameters<typeof renderReadbackPage>[0], readback: ReadbacksState[keyof ReadbacksState], h: HtmlBuilder<Message>): Html => {
  const status = readback.status === "idle" ? "loading" : readback.status;
  return h.section(
    [h.Class("rm3-next-route mt-4"), h.DataAttribute("route", routeName), h.DataAttribute("learning-family-state", status)],
    [h.h2([h.Class("rm3-next-route-title")], [label]), renderReadbackPage(spec, readback, h)],
  );
};
const learningPage = (readbacks: ReadbacksState, learningRanking: LearningRankingState | undefined, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "learning")], [
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Knowledge worker, replay jobs and evaluation jobs. Empty means the capability is available but no work exists."]),
    renderReadbackPage(READBACK_SPECS.learning, readbacks.learning, h),
    h.h3([h.Class("mt-6 text-[14px] font-semibold")], ["Endpoint ladder ranking"]),
    renderLearningRanking(readbacks.learning.rows, learningRanking, h),
    renderReadbackPage(READBACK_SPECS.replayJobs, readbacks.replayJobs, h),
    renderReadbackPage(READBACK_SPECS.evaluationJobs, readbacks.evaluationJobs, h),
  ]);

const runtimeConfigPage = (state: Model["runtimeConfigEditor"], configReadback: ReadbacksState["runtimeConfig"], runtimeReadback: ReadbacksState["runtime"], h: HtmlBuilder<Message>): Html => {
  let snapshotText = "{}";
  const meta = configReadback.rows[0]?.meta;
  if (meta !== undefined) { try { const parsed = JSON.parse(meta) as { config?: unknown }; if (parsed.config !== null && typeof parsed.config === "object") snapshotText = JSON.stringify(parsed.config, null, 2); } catch { snapshotText = "{}"; } }
  const editor = state ?? { diff: [], originalText: snapshotText, status: "not-loaded" as const, text: snapshotText, token: 0 };
  const loaded = editor.status !== "not-loaded" && editor.status !== "loading";
  return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "runtime-config")], [
    renderReadbackPage(READBACK_SPECS.runtime, runtimeReadback, h),
    h.h2([h.Class("mt-6 text-[16px] font-semibold")], ["Runtime config"]),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Edit the JSON config, review the changed top-level keys, then confirm. Save sends PUT and re-reads the applied snapshot."]),
    h.button([h.Type("button"), h.DataAttribute("runtime-config-load", ""), h.OnClick(Message.RuntimeConfigLoadRequested()), h.Class("mt-2 min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Load runtime config"]),
    ...(loaded ? [h.textarea([h.Class("mt-3 min-h-[220px] w-full rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-bg)] p-2 font-mono text-[12px] text-[var(--rm-fg)]"), h.DataAttribute("runtime-config-editor", ""), h.Value(editor.text), h.OnInput((text) => Message.RuntimeConfigTextChanged({ text }))])] : [h.p([h.DataAttribute("runtime-config-not-loaded", ""), h.Class("mt-3 text-[12px] text-[var(--rm-secondary)]")], ["Runtime config not loaded. Click Load runtime config first."])]),
    ...(loaded ? [
    h.button([h.Type("button"), h.DataAttribute("runtime-config-save", ""), h.AriaDisabled(editor.status === "pending"), h.OnClick(Message.RuntimeConfigSaveRequested()), h.Class("mt-2 min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px] text-[var(--rm-on-primary)] disabled:opacity-50")], [editor.status === "pending" ? "Saving…" : "Review changes"]),] : []),
    ...(editor.status === "invalid" || editor.status === "error" ? [h.p([h.Role("alert"), h.DataAttribute("runtime-config-error", editor.status), h.Class("mt-2 text-[12px] text-[var(--rm-error)]")], [editor.message ?? "Invalid config"])] : []),
    ...(editor.status === "confirming" ? [h.div([h.DataAttribute("runtime-config-confirm", ""), h.Class("mt-3 rounded border border-[var(--rm-border)] p-3")], [h.p([h.Class("text-[12px] font-semibold")], ["Changed top-level keys"]), h.ul([h.Class("mt-1 list-disc pl-5 text-[12px]")], editor.diff.map((entry) => h.li([], [entry]))), ...(editor.message === undefined ? [] : [h.p([h.Class("mt-1 text-[12px]")], [editor.message])]), h.button([h.Type("button"), h.DataAttribute("runtime-config-confirm-save", ""), h.OnClick(Message.RuntimeConfigConfirmRequested({ token: editor.token + 1 })), h.Class("mt-2 min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px] text-[var(--rm-on-primary)]")], ["Confirm save"])])] : []),
    ...(editor.notice === undefined ? [] : [h.p([h.Role("status"), h.DataAttribute("runtime-config-notice", ""), h.Class("mt-2 text-[12px] text-[var(--rm-secondary)]")], [editor.notice])]),
  ]);
};

interface RouteViewContext {
  readonly route: Model["route"];
  readonly diagnostics: DiagnosticsSnapshot;
  readonly observability: ObservabilityState;
  readonly readbacks: ReadbacksState;
  readonly controls: ControlsState;
  readonly overviewWindowMs: number;
  readonly studio: StudioState;
  readonly overviewFilters: OverviewFilters | undefined;
  readonly runtimeConfigEditor: Model["runtimeConfigEditor"];
  readonly deviceAuth: DeviceAuthState;
  readonly deviceAuthDialog: Model["deviceAuthDialog"];
  readonly providerAccount: ProviderAccountState;
  readonly endpointAdmission: EndpointAdmissionState;
  readonly chartInteraction: ChartInteractionState | undefined;
  readonly learningRanking: LearningRankingState | undefined;
  readonly requestsRanking: RequestsRankingState | undefined;
  readonly requestsRankingMetricListbox: Model["requestsRankingMetricListbox"];
  readonly requestsRankingTargetListbox: Model["requestsRankingTargetListbox"];
  readonly h: HtmlBuilder<Message>;
}

const routeContent = (ctx: RouteViewContext): Html => {
  const {
    route,
    diagnostics,
    observability,
    readbacks,
    controls,
    overviewWindowMs,
    studio,
    overviewFilters,
    runtimeConfigEditor,
    deviceAuth,
    deviceAuthDialog,
    providerAccount,
    endpointAdmission,
    chartInteraction,
    learningRanking,
    requestsRanking,
    requestsRankingMetricListbox,
    requestsRankingTargetListbox,
    h,
  } = ctx;
  const routeRegistry = {
    Diagnostics: (route) => {
      const { id } = route;
      return h.section(
        [h.Class("rm3-next-route"), h.DataAttribute("route", "diagnostics")],
        [
          h.h2([h.Class("rm3-next-route-title")], ["Diagnostics: " + id]),
          diagnosticsPage(diagnostics, h),
        ],
      );
    },
    Observability: () => observabilitySnapshotRoute(observability, h),
    StoreReceipts: () => storeDegradationReceiptsRoute(readbacks.storeReceipts, h),
    Queues: () => renderReadbackPage(READBACK_SPECS.queues, readbacks.queues, h),
    LocalLogs: () => familyPage("Llama-swap logs", "local-logs", "Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise.", [{ label: "Structured local log history", spec: READBACK_SPECS.localLogs, readback: readbacks.localLogs, note: "The ledger is bounded for scanability; parsed rows carry request correlation." }, { label: "Raw log streams", note: "Raw stdout/stderr streams stay in the host log store and are not reconstructed here." }], h),
    RouterCandidates: () => routerCandidatesPage(readbacks, h),
    Requests: () => telemetryRequestsRoute(readbacks.requests, requestsRanking, requestsRankingMetricListbox, requestsRankingTargetListbox, h),
    RequestDetail: () => renderReadbackPage(READBACK_SPECS.requestDetail, readbacks.requestDetail, h),
    RouterDecisions: () => routerDecisionsPage(readbacks, h),
    RouterDecisionDetail: () =>
      renderReadbackPage(READBACK_SPECS.routerDecisionDetail, readbacks.routerDecisionDetail, h),
    LocalPeers: () => familyPage("Local endpoints", "local-peers", "role-model probes each server at /v1/models before peer models can be registered.", [{ label: "Endpoint inventory", spec: READBACK_SPECS.localPeers, readback: readbacks.localPeers }, { label: "Add peer endpoint", note: "Register a peer server URL to use peer-backed local models." }], h),
    SystemPeers: () => familyPage("Peer topology", "system-peers", "Peer-backed model groups observed in the current runtime listing.", [{ label: "Peer inventory", spec: READBACK_SPECS.systemPeers, readback: readbacks.systemPeers }, { label: "Peer config", note: "Proxy targets and auth posture are configured on the host." }, { label: "Contract fields", note: "Peer readback fields: id, url, auth and readiness." }], h),
    LocalPeerModels: () => familyPage("Peer models", "local-peer-models", "Models registered behind the local peers.", [{ label: "Registered models", spec: READBACK_SPECS.localPeerModels, readback: readbacks.localPeerModels }], h),
    QueuesConfiguration: () => renderReadbackPage(READBACK_SPECS.queueConfig, readbacks.queueConfig, h),
    IntegrationsDownstream: () => renderReadbackPage(READBACK_SPECS.downstreamOpenAI, readbacks.downstreamOpenAI, h),
    IntegrationsUpstream: () => renderReadbackPage(READBACK_SPECS.integrationProviders, readbacks.integrationProviders, h),
    Benchmark: () => benchmarkRoute(readbacks.benchmarkSuite, h),
    StorageRetention: () => familyPage("Storage & retention", "storage-retention", "Physical and logical storage, retention classes and manual pruning.", [{ label: "Logical classes", note: "Logical classes group rows by retention policy." }, { label: "Retention policy", note: "Category totals, receipts and byte counts are reported by the retention readback." }, { label: "Manual pruning", note: "Prune is manual; the host enforces retention records before deletion." }, { label: "Retention transactions", spec: READBACK_SPECS.storageRetention, readback: readbacks.storageRetention }], h),
    Studio: () => studioRoute({ h, readbacks, studio, studioPage }),
    Learning: () => learningOverviewRoute(readbacks.learning, learningRanking, h),
    LearningConfiguration: () => learningConfigurationPage(readbacks.learningConfiguration, h),
    LearningPacks: () => learningPacksPage(readbacks.learningPacks, h),
    LearningDecisions: () => learningDecisionsPage(readbacks.learningDecisions, h),
    LearningEvidence: () => learningEvidencePage(readbacks.learningEvidence, h),
    LearningHistory: () => learningHistoryPage(readbacks.learningHistory, h),
    LocalPolicy: () => localPolicyPage(readbacks.localPolicy, h),
    LocalLlamaSwapModels: () => familyPage("Llama-swap models", "local-llama-swap-models", "Load a runtime-config-declared model, assign route roles, and manage the in-memory llama-swap inventory.", [{ label: "Load model", note: "Model must already be declared in runtime config. Loading triggers the managed swap." }, { label: "Loaded models", spec: READBACK_SPECS.localLlamaSwapModels, readback: readbacks.localLlamaSwapModels }], h),
    SystemOperator: () => familyPage("Operator controls", "system-operator", "Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored.", [{ label: "Operator status", spec: READBACK_SPECS.operatorStatus, readback: readbacks.operatorStatus }, { label: "Trace lineage", spec: READBACK_SPECS.operatorTraceRoots, readback: readbacks.operatorTraceRoots }, { label: "Replay Jobs", spec: READBACK_SPECS.replayJobs, readback: readbacks.replayJobs }, { label: "Evaluation Jobs", spec: READBACK_SPECS.evaluationJobs, readback: readbacks.evaluationJobs }, { label: "Shadow Learning", note: "This page does not enable production learning; shadow-learning actions stay bounded to the readback." }], h),
    SystemExtensions: () => familyPage("Extensions", "system-extensions", "Extension boundary, replay automation, contribution posture and the extension inventory.", [{ label: "Extension boundary", note: "The host enforces the extension boundary before any extension code runs." }, { label: "Replay automation", note: "Replay automation is configured per extension and reported by the host." }, { label: "Contribution posture", note: "Contribution posture records whether an extension may contribute runtime behavior." }, { label: "Recommendation ledger", note: "Recommendation receipts are recorded in the ledger when an extension produces one." }, { label: "Extension inventory", spec: READBACK_SPECS.extensions, readback: readbacks.extensions }], h),
    Models: () => modelsRoute(readbacks.configuredModels, readbacks.modelEndpoints, h),
    ModelsRoles: () => modelsRolesRoute(readbacks.configuredModels, h),
    RouterStrategy: () => routerStrategyPage("router-strategy", readbacks, h),
    RouterWorkloads: () => routerWorkloadsPage(readbacks, h),
    RouterConfig: () => routerConfigPage(readbacks, h),
    RouterAgentStrategy: () => routerAgentStrategyPage(readbacks, h),
    LocalChoose: () => localChoosePage(readbacks, h),
    Runtime: () => runtimeRoute({ h, readbacks, runtimeConfigEditor, runtimeConfigPage }),
    SessionReadiness: () =>
      renderReadbackPage(READBACK_SPECS.sessionReadiness, readbacks.sessionReadiness, h),
    Dashboard: () => renderReadbackPage(READBACK_SPECS.dashboard, readbacks.dashboard, h),
    LocalSwap: () => familyPage("Llama-swap swap history", "local-swap", "Most recent swap events first.", [{ label: "Event ledger", spec: READBACK_SPECS.localSwap, readback: readbacks.localSwap }, { label: "Ledger semantics", note: "Initial load · Swap reason · Timeline order: events appear when the managed host loads a first model, swaps to a new one, or records the operator-visible reason." }], h),
    ObserveActivity: () => observeActivityRoute(readbacks.observeActivity, h),
    ObserveLogs: () => observeLogsRoute(readbacks.observeLogs, h),
    ObserveRouting: () => observeRoutingRoute(readbacks.observeRouting, h),
    Router: () => routerOverviewPage(readbacks, h),
    Providers: () => providersPage({ controls, deviceAuth, deviceAuthDialog, h, providerAccount }),
    Endpoints: () => endpointsRoute({ controls, endpointAdmission, h }),
    ControlController: () => controlControllerPage(controls, h),
    Index: () => indexRoute({ chartInteraction, h, overviewFilters, overviewPage, overviewWindowMs, readbacks }),
    NotFound: (route) => {
      const { path } = route;
      return h.section(
        [
          h.Class("rm3-next-route mt-4"),
          h.DataAttribute("route", "not-found"),
          h.DataAttribute("state", "error"),
          h.Role("alert"),
        ],
        [
          h.p(
            [
              h.Class(
                "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]",
              ),
            ],
            ["Not found"],
          ),
          h.h2([h.Class("rm3-next-route-title")], [`Not found: ${path}`]),
          h.p(
            [h.Class("mt-2 max-w-[60ch] text-[14px] leading-[21px] text-[var(--rm-secondary)]")],
            ["This runtime route does not exist. Return to the operator shell to continue."],
          ),
          h.a(
            [
              h.Href("/"),
              h.Class(
                `mt-3 inline-flex text-[13px] font-semibold text-[var(--rm-accent)] ${focusRingClass}`,
              ),
            ],
            ["Back to overview"],
          ),
        ],
      );
    },
  } satisfies {
    [K in AppRoute["_tag"]]: (route: Extract<AppRoute, { readonly _tag: K }>) => Html;
  };
  // SAFETY: the registry is keyed by this exact tag and each entry accepts that tag's payload,
  // so the selected handler can receive the same route value used for selection.
  const renderRoute = routeRegistry[route._tag] as (route: AppRoute) => Html;
  return renderRoute(route);
};

const railRow = (label: string, value: string | null, reason: string, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class("flex items-baseline justify-between gap-2 py-0.5"), h.DataAttribute("rail-row", label.toLowerCase())],
    [
      h.span([h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]),
      value === null
        ? h.span([h.AriaLabel(reason), h.DataAttribute("rail-value", "dash")], ["—", h.span([h.Class("sr-only")], [reason])])
        : h.span([h.Class("truncate text-[11px] text-[var(--rm-fg)]"), h.DataAttribute("rail-value", label.toLowerCase())], [value]),
    ],
  );
const railValue = (state: Model["readbacks"]["dashboard"], label: string): string | null =>
  state.rows.find((entry) => entry.label === label)?.value ?? null;
const shellRail = (model: Model, h: HtmlBuilder<Message>): Html => {
  const models = model.readbacks.models;
  const dashboard = model.readbacks.dashboard;
  const health = model.readbacks.health;
  const router = model.readbacks.router;
  const modelsValue = models.status === "ok" ? String(models.rows.length) : models.status === "empty" ? "0" : null;
  const requestsValue = dashboard.status === "empty" ? "0" : railValue(dashboard, "Requests");
  const cached = railValue(dashboard, "Cached requests");
  const cacheValue =
    requestsValue !== null && cached !== null && Number(requestsValue) > 0
      ? `${String(Math.round((Number(cached) / Number(requestsValue)) * 100))}%`
      : null;
  const endpointRow = health.rows.find((entry) => entry.label === "Endpoint")?.value;
  const endpointValue =
    typeof window === "undefined"
      ? endpointRow ?? null
      : endpointRow !== undefined && endpointRow.startsWith("http")
        ? `${new URL(window.location.origin).origin}/v1`
        : null;
  const modeValue =
    health.rows.find((entry) => entry.label === "Execution mode")?.value ??
    router.rows.find((entry) => entry.label === "executionMode")?.value ??
    null;
  let perModel: ReadonlyArray<[string, number]> = [];
  const metricsRow = model.readbacks.overviewMetrics.rows[0];
  if (metricsRow !== undefined) {
    try {
      const parsed = JSON.parse(metricsRow.meta) as { items?: ReadonlyArray<{ modelId?: unknown }> };
      const counts = new Map<string, number>();
      for (const item of parsed.items ?? []) {
        const id = typeof item.modelId === "string" && item.modelId.length > 0 ? item.modelId : "unknown";
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      perModel = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    } catch { perModel = []; }
  }
  return h.div(
    [h.Class("mt-3 border-t border-[var(--rm-border)] px-2.5 pt-3"), h.DataAttribute("shell-rail", "")],
    [
      h.p([h.Class("pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Runtime"]),
      railRow("Models", modelsValue, "Model count unavailable: models read is loading or failed", h),
      railRow("Requests", requestsValue, "Request count unavailable: telemetry summary is loading or failed", h),
      railRow("Cache", cacheValue, "Cache percentage unavailable: no requests in the window or telemetry is loading", h),
      railRow("Router", endpointValue, "Router endpoint unavailable: health read is loading or failed", h),
      railRow("Mode", modeValue, "Execution mode unavailable: health/router read is loading or failed", h),
      ...perModel.map(([id, count]) =>
        h.div([h.DataAttribute("rail-model", id), h.Class("flex justify-between gap-2 py-0.5 text-[10px] text-[var(--rm-secondary)]")], [h.span([], [id]), h.span([h.DataAttribute("rail-model-count", String(count))], [String(count)])]),
      ),
    ],
  );
};

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model.route),
  body: h.div(
    [
      h.Class("flex min-h-screen w-full bg-[var(--rm-bg)] text-[var(--rm-fg)]"),
      h.DataAttribute("shell-state", "success"),
      h.DataAttribute("theme", model.theme),
      h.DataAttribute("refresh-revision", String(model.refresh.lastAppliedRevision)),
      h.DataAttribute("refresh-state", model.refresh.status),
    ],
    [
      // S181: bypass block. The sidebar repeats on every route, so a keyboard user must be able to
      // jump past it (WCAG 2.4.1). Visually hidden until focused. It is a CHILD, not an attribute:
      // placing it in the attribute array made Foldkit treat it as an attribute builder and the app
      // crashed with "handler is not a function" (caught by loading the page, not by the build).
      h.a([h.Href("#main-content"), h.Class("sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-[var(--rm-accent)] focus:px-3 focus:py-2 focus:text-[12px] focus:text-[var(--rm-on-primary)]")], ["Skip to content"]),
      h.aside(
        [
          h.Class(
            "hidden w-60 shrink-0 flex-col border-r border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 md:flex",
          ),
          h.DataAttribute("shell-sidebar", ""),
        ],
        [
          h.p(
            [
              h.Class(
                "whitespace-nowrap px-2.5 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]",
              ),
            ],
            ["Runtime UI"],
          ),
          shellRail(model, h),
          shellNav(model.route, "Primary navigation", h),
          h.div(
            [
              h.Class(
                "mt-auto border-t border-[var(--rm-border)] px-2.5 pt-3 text-[12px] leading-4 text-[var(--rm-secondary)]",
              ),
            ],
            [
              h.p([], [model.theme === "dark" ? "Dark shell" : "Light shell"]),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class("flex min-w-0 flex-1 flex-col")],
        [
          h.header(
            [
              h.Class(
                "flex min-h-14 items-center justify-between gap-3 border-b border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2",
              ),
            ],
            [
              h.div(
                [h.Class("min-w-0")],
                [
                  h.p([h.Class("text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Runtime"]),
                  h.h1(
                    [h.Class("truncate text-[15px] font-medium text-[var(--rm-fg)]"), h.DataAttribute("shell-route", model.route._tag)],
                    [model.route._tag === "Index" ? "Runtime overview" : routeTitle(model.route).split(" | ")[0] ?? ""],
                  ),
                ],
              ),
              uiButtonView(
                {
                  onClick: Message.ToggledTheme(),
                  toView: ({ button }) =>
                    h.button([h.Class("rm3-theme-toggle shrink-0"), ...button], ["Toggle theme"]),
                  type: "button",
                },
                h,
              ),
            ],
          ),
          h.nav(
            [
              h.Class(
                "border-b border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1 md:hidden",
              ),
              h.AriaLabel("Primary navigation mobile"),
              h.DataAttribute("shell-nav", ""),
            ],
            [
              h.ul(
                [h.Class("flex flex-wrap gap-1")],
                shellNavItems(model.route).map((item) =>
                  h.li(
                    [],
                    [
                      item.href === null
                        ? h.span(
                            [
                              h.AriaDisabled(true),
                              h.DataAttribute("nav-state", "pending"),
                              h.Class(
                                "flex min-h-9 items-center px-2 text-[12px] text-[var(--rm-muted)]",
                              ),
                            ],
                            [item.label],
                          )
                        : h.a(
                            [
                              h.Href(item.href),
                              ...(item.dataNav === undefined
                                ? []
                                : [h.DataAttribute("nav", item.dataNav)]),
                              ...(item.active ? [h.AriaCurrent("page")] : []),
                              h.DataAttribute("nav-state", item.active ? "active" : "available"),
                              h.Class(
                                `flex min-h-9 items-center rounded-[var(--rm-radius-field)] px-2.5 text-[12px] ${focusRingClass} ${
                                  item.active
                                    ? "bg-[var(--rm-panel)] font-medium text-[var(--rm-fg)]"
                                    : "text-[var(--rm-secondary)]"
                                }`,
                              ),
                            ],
                            [item.label],
                          ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          h.main(
            [
              h.Class("rm3-next-shell ml-3 min-w-0 flex-1 max-w-[1138px] py-4"),
              h.DataAttribute("shell-main", ""),
              h.Id("main-content"),
              h.DataAttribute("refresh-revision", String(model.refresh.lastAppliedRevision)),
              h.DataAttribute("refresh-state", model.refresh.status),
            ],
            [
              ...(model.refresh.status === "stale"
                ? [
                    h.p(
                      [
                        h.Role("status"),
                        h.AriaLive("polite"),
                        h.DataAttribute("refresh-state", "stale"),
                        h.Class(
                          "rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-3 py-2 text-[12px] leading-4 text-[var(--rm-fg)]",
                        ),
                      ],
                      [
                        model.refresh.message === undefined
                          ? "Stale: waiting for a runtime snapshot resync."
                          : `Stale: ${model.refresh.message}.`,
                      ],
                    ),
                  ]
                : []),
              routeContent({
                route: model.route,
                diagnostics: model.diagnostics,
                observability: model.observability,
                readbacks: model.readbacks,
                controls: model.controls,
                overviewWindowMs: model.overviewWindowMs ?? 86400000,
                studio: model.studio ?? studioIdle(),
                overviewFilters: model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS,
                runtimeConfigEditor: model.runtimeConfigEditor,
                deviceAuth: model.deviceAuth ?? initialDeviceAuthState(),
                deviceAuthDialog: model.deviceAuthDialog,
                providerAccount: model.providerAccount ?? initialProviderAccountState(),
                endpointAdmission: model.endpointAdmission ?? initialEndpointAdmissionState(),
                chartInteraction: model.chartInteraction,
                learningRanking: model.learningRanking,
                requestsRanking: model.requestsRanking,
                requestsRankingMetricListbox: model.requestsRankingMetricListbox,
                requestsRankingTargetListbox: model.requestsRankingTargetListbox,
                h,
              }),
            ],
          ),
        ],
      ),
    ],
  ),
});