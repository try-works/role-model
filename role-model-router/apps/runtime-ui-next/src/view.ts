import { view as uiButtonView } from "@role-model-router/foldkit-ui/button";
import type { Document, Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { rm3ButtonClassName, view as rm3ButtonView } from "@role-model/ui/foldkit-button";

import { CONTROL_SPECS, type ControlsState } from "./control";
import { renderControlPage } from "./control-view";
import {
  type DiagnosticsSnapshot,
  diagnosticsBuildLabel,
  diagnosticsInstanceLabel,
  diagnosticsRenderText,
  formatAge,
} from "./diagnostics";
import { Message } from "./message";
import type { Model } from "./model";
import type { ObservabilityState } from "./observability";
import { view as chartView } from "@role-model/ui/foldkit-chart";

import { READBACK_SPECS, type ReadbacksState, renderReadbackPage } from "./readback";
import { AppRoute } from "./route";

const focusRingClass =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rm-accent-subtle)]";

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
  { active: false, href: null, label: "Studio" },
  { active: false, href: null, label: "Local" },
  { active: false, href: null, label: "Remote" },
  { active: false, href: null, label: "Models" },
  { active: false, href: null, label: "Router" },
  { active: false, href: null, label: "Observe" },
  { active: false, href: null, label: "Connect" },
  { active: false, href: null, label: "System" },
  { active: false, href: null, label: "Learning" },
];

const shellNav = (route: Model["route"], label: string, h: HtmlBuilder<Message>): Html =>
  h.nav(
    [h.AriaLabel(label), h.DataAttribute("shell-nav", "")],
    [
      h.ul(
        [h.Class("flex flex-wrap gap-1 md:flex-col md:gap-0.5")],
        shellNavItems(route).map((item) =>
          h.li(
            [],
            [
              item.href === null
                ? h.span(
                    [
                      h.AriaDisabled(true),
                      h.DataAttribute("nav-state", "pending"),
                      h.Class(
                        "flex min-h-9 items-center rounded-[var(--rm-radius-field)] px-2.5 text-[13px] text-[var(--rm-muted)]",
                      ),
                    ],
                    [item.label],
                  )
                : h.a(
                    [
                      h.Href(item.href),
                      ...(item.dataNav === undefined ? [] : [h.DataAttribute("nav", item.dataNav)]),
                      ...(item.active ? [h.AriaCurrent("page")] : []),
                      h.DataAttribute("nav-state", item.active ? "active" : "available"),
                      h.Class(
                        `flex min-h-9 items-center rounded-[var(--rm-radius-field)] px-2.5 text-[13px] ${focusRingClass} ${
                          item.active
                            ? "bg-[var(--rm-panel)] font-medium text-[var(--rm-fg)]"
                            : "text-[var(--rm-secondary)] hover:text-[var(--rm-fg)]"
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
  );

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
      h.h1([h.Class("rm3-next-route-title")], ["Observability snapshot"]),
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
const overviewPage = (
  state: ReadbacksState["dashboard"],
  windowMs: number,
  h: HtmlBuilder<Message>,
): Html => {
  const period = windowLabel(windowMs);
  const filters = h.div(
    [h.Class("mt-3 flex flex-wrap gap-1"), h.DataAttribute("overview-filters", "")],
    WINDOW_OPTIONS.map((option) =>
      h.button(
        [
          h.Type("button"),
          h.AriaPressed(String(option.windowMs === windowMs)),
          h.DataAttribute("window", option.label),
          h.Class(
            `min-h-8 rounded-[var(--rm-radius-field)] border px-2.5 text-[12px] ${option.windowMs === windowMs ? "border-[var(--rm-border)] bg-[var(--rm-panel)] text-[var(--rm-fg)]" : "border-transparent text-[var(--rm-secondary)]"}`,
          ),
          h.OnClick(Message.SelectedOverviewWindow({ windowMs: option.windowMs })),
        ],
        [option.label],
      ),
    ),
  );
  const header = h.div([], [
    h.p([h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Runtime overview"]),
    h.h1([h.Class("rm3-next-route-title")], ["Index page"]),
    h.p([h.Class("text-[12px] text-[var(--rm-secondary)]"), h.DataAttribute("overview-period", period)], [`Last ${period}`]),
    filters,
  ]);
  if (state.status === "loading") {
    return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "index"), h.DataAttribute("readback-route", "dashboard")], [header, h.p([h.AriaBusy(true), h.DataAttribute("overview-state", "loading"), h.DataAttribute("readback-state", "loading")], ["Loading telemetry…"])]);
  }
  if (state.status === "error") {
    return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "index"), h.DataAttribute("readback-route", "dashboard")], [header, h.p([h.Role("alert"), h.DataAttribute("overview-state", "error"), h.DataAttribute("readback-state", "error")], [state.message ?? "Telemetry read failed"])]);
  }
  if (state.status === "empty") {
    return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "index"), h.DataAttribute("readback-route", "dashboard")], [header, h.p([h.DataAttribute("overview-state", "empty"), h.DataAttribute("readback-state", "empty")], [`No telemetry requests in the last ${period.toLowerCase()}.`])]);
  }
  const latency = state.rows.find((entry) => entry.label === "Latency");
  const requests = state.rows.find((entry) => entry.label === "Requests");
  const avg = Number(latency?.value);
  const p95 = Number(latency?.meta.match(/p95 ([\d.]+) ms/)?.[1]);
  const success = Number(requests?.meta.match(/(\d+) success/ )?.[1] ?? 0);
  const failure = Number(requests?.meta.match(/(\d+) failed/)?.[1] ?? 0);
  const charts = h.div([h.Class("mt-4 grid gap-4"), h.DataAttribute("overview-charts", "")], [
    chartView({ title: "Latency (ms)", description: `Average and p95 for the last ${period.toLowerCase()}.`, series: [
      { id: "latency", label: "Latency", points: [{ label: "Average", value: avg }, { label: "p95", value: p95 }] },
    ], state: { status: "ready" }, yUnit: "ms" }, h),
    chartView({ title: "Success vs failure", description: `Request outcomes for the last ${period.toLowerCase()}.`, series: [
      { id: "outcomes", label: "Requests", points: [{ label: "Success", value: success }, { label: "Failure", value: failure }] },
    ], state: { status: "ready" }, yUnit: "requests" }, h),
  ]);
  return h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "index"), h.DataAttribute("readback-route", "dashboard"), h.DataAttribute("overview-state", "success"), h.DataAttribute("readback-state", "ok"), h.DataAttribute("state", "success")], [header, charts]);
};

const routeContent = (
  route: Model["route"],
  diagnostics: DiagnosticsSnapshot,
  observability: ObservabilityState,
  readbacks: ReadbacksState,
  controls: ControlsState,
  overviewWindowMs: number,
  h: HtmlBuilder<Message>,
) =>
  AppRoute.match(route, {
    Diagnostics: ({ id }) =>
      h.section(
        [h.Class("rm3-next-route"), h.DataAttribute("route", "diagnostics")],
        [
          h.h1([h.Class("rm3-next-route-title")], [`Diagnostics: ${id}`]),
          diagnosticsPage(diagnostics, h),
        ],
      ),
    Observability: () => observabilityPage(observability, h),
    StoreReceipts: () =>
      renderReadbackPage(READBACK_SPECS.storeReceipts, readbacks.storeReceipts, h),
    Queues: () => renderReadbackPage(READBACK_SPECS.queues, readbacks.queues, h),
    LocalLogs: () => renderReadbackPage(READBACK_SPECS.localLogs, readbacks.localLogs, h),
    RouterCandidates: () =>
      renderReadbackPage(READBACK_SPECS.routerCandidates, readbacks.routerCandidates, h),
    Requests: () => renderReadbackPage(READBACK_SPECS.requests, readbacks.requests, h),
    RequestDetail: () => renderReadbackPage(READBACK_SPECS.requestDetail, readbacks.requestDetail, h),
    RouterDecisions: () =>
      renderReadbackPage(READBACK_SPECS.routerDecisions, readbacks.routerDecisions, h),
    RouterDecisionDetail: () =>
      renderReadbackPage(READBACK_SPECS.routerDecisionDetail, readbacks.routerDecisionDetail, h),
    LocalPeers: () => renderReadbackPage(READBACK_SPECS.localPeers, readbacks.localPeers, h),
    SystemPeers: () => renderReadbackPage(READBACK_SPECS.systemPeers, readbacks.systemPeers, h),
    LocalPeerModels: () => renderReadbackPage(READBACK_SPECS.localPeerModels, readbacks.localPeerModels, h),
    QueuesConfiguration: () => renderReadbackPage(READBACK_SPECS.queueConfig, readbacks.queueConfig, h),
    IntegrationsDownstream: () => renderReadbackPage(READBACK_SPECS.downstreamOpenAI, readbacks.downstreamOpenAI, h),
    IntegrationsUpstream: () => renderReadbackPage(READBACK_SPECS.integrationProviders, readbacks.integrationProviders, h),
    Benchmark: () => renderReadbackPage(READBACK_SPECS.benchmarkSuite, readbacks.benchmarkSuite, h),
    StorageRetention: () => renderReadbackPage(READBACK_SPECS.storageRetention, readbacks.storageRetention, h),
    LocalChoose: () => h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route","local-choose")], [h.h1([h.Class("rm3-next-route-title")], ["Local choose"]), h.p([], ["Choose peer-backed models or llama-swap models."])]),
    Runtime: () => renderReadbackPage(READBACK_SPECS.runtime, readbacks.runtime, h),
    SessionReadiness: () =>
      renderReadbackPage(READBACK_SPECS.sessionReadiness, readbacks.sessionReadiness, h),
    Dashboard: () => renderReadbackPage(READBACK_SPECS.dashboard, readbacks.dashboard, h),
    LocalSwap: () => renderReadbackPage(READBACK_SPECS.localSwap, readbacks.localSwap, h),
    ObserveActivity: () =>
      renderReadbackPage(READBACK_SPECS.observeActivity, readbacks.observeActivity, h),
    ObserveLogs: () => renderReadbackPage(READBACK_SPECS.observeLogs, readbacks.observeLogs, h),
    ObserveRouting: () =>
      renderReadbackPage(READBACK_SPECS.observeRouting, readbacks.observeRouting, h),
    Router: () => renderReadbackPage(READBACK_SPECS.router, readbacks.router, h),
    Providers: () => renderControlPage(CONTROL_SPECS.providers, controls.providers, h),
    Endpoints: () => renderControlPage(CONTROL_SPECS.endpoints, controls.endpoints, h),
    ControlController: () =>
      renderControlPage(CONTROL_SPECS.controlController, controls.controlController, h),
    Index: () => overviewPage(readbacks.dashboard, overviewWindowMs, h),
    NotFound: ({ path }) =>
      h.section(
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
          h.h1([h.Class("rm3-next-route-title")], [`Not found: ${path}`]),
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
      ),
  });

const railRow = (label: string, value: string | null, reason: string, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class("flex items-baseline justify-between gap-2 py-0.5"), h.DataAttribute("rail-row", label.toLowerCase())],
    [
      h.span([h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]),
      value === null
        ? h.span([h.AriaLabel(reason), h.DataAttribute("rail-value", "dash")], ["—"])
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
  return h.div(
    [h.Class("mt-3 border-t border-[var(--rm-border)] px-2.5 pt-3"), h.DataAttribute("shell-rail", "")],
    [
      h.p([h.Class("pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Runtime"]),
      railRow("Models", modelsValue, "Model count unavailable: models read is loading or failed", h),
      railRow("Requests", requestsValue, "Request count unavailable: telemetry summary is loading or failed", h),
      railRow("Cache", cacheValue, "Cache percentage unavailable: no requests in the window or telemetry is loading", h),
      railRow("Router", endpointValue, "Router endpoint unavailable: health read is loading or failed", h),
      railRow("Mode", modeValue, "Execution mode unavailable: health/router read is loading or failed", h),
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
      h.aside(
        [
          h.Class(
            "hidden w-56 shrink-0 border-r border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 md:flex md:flex-col",
          ),
          h.DataAttribute("shell-sidebar", ""),
        ],
        [
          h.p(
            [
              h.Class(
                "px-2.5 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]",
              ),
            ],
            ["Runtime UI"],
          ),
          shellNav(model.route, "Primary navigation", h),
          shellRail(model, h),
          h.div(
            [
              h.Class(
                "mt-auto border-t border-[var(--rm-border)] px-2.5 pt-3 text-[12px] leading-4 text-[var(--rm-secondary)]",
              ),
            ],
            [
              h.p([h.DataAttribute("clicks", String(model.clicks))], [`Clicks: ${model.clicks}`]),
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
                  h.p(
                    [
                      h.Class(
                        "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]",
                      ),
                    ],
                    ["Runtime"],
                  ),
                  h.p(
                    [
                      h.Class("truncate text-[14px] font-medium text-[var(--rm-fg)]"),
                      h.DataAttribute("shell-route", model.route._tag),
                    ],
                    [
                      AppRoute.match(model.route, {
                        Diagnostics: ({ id }) => `Diagnostics ${id}`,
                        Index: () => "Overview",
                        Observability: () => "Observability",
                        StoreReceipts: () => "Store receipts",
                        Queues: () => "Queues",
                        LocalLogs: () => "Local logs",
                        RouterCandidates: () => "Router candidates",
                        Requests: () => "Requests",
    RequestDetail: () => "Request detail",
                        RouterDecisions: () => "Router decisions",
    RouterDecisionDetail: () => "Router decision detail",
                        LocalPeers: () => "Local peers",
                        SystemPeers: () => "System peers",
    LocalPeerModels: () => "Peer models",
    QueuesConfiguration: () => "Queue configuration",
    IntegrationsDownstream: () => "Downstream integration",
    IntegrationsUpstream: () => "Upstream integration",
    LocalChoose: () => "Local choose",
    Benchmark: () => "Benchmark",
    StorageRetention: () => "Storage retention",
                        Runtime: () => "Runtime",
                        SessionReadiness: () => "Session readiness",
                        Dashboard: () => "Dashboard",
                        LocalSwap: () => "Local swap",
                        ObserveActivity: () => "Activity",
                        ObserveLogs: () => "Observe logs",
                        ObserveRouting: () => "Observe routing",
                        Router: () => "Router",
                        Providers: () => "Providers",
                        Endpoints: () => "Endpoints",
                        ControlController: () => "Controller",
                        NotFound: () => "Not found",
                      }),
                    ],
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
              h.Class("rm3-next-shell mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6"),
              h.DataAttribute("shell-main", ""),
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
              routeContent(
                model.route,
                model.diagnostics,
                model.observability,
                model.readbacks,
                model.controls,
                model.overviewWindowMs ?? 86400000,
                h,
              ),
              h.div(
                [h.Class("mt-6 flex flex-wrap items-center gap-3")],
                [
                  rm3ButtonView(
                    {
                      children: [`Clicked ${model.clicks} time(s)`],
                      onClick: Message.Clicked(),
                      variant: "primary",
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  ),
});