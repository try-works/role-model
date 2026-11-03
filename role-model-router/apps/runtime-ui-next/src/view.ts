import { view as uiButtonView } from "@role-model-router/foldkit-ui/button";
import type { Document, Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import { rm3ButtonClassName, view as rm3ButtonView } from "@role-model/ui/foldkit-button";

import { CONTROL_SPECS, type ControlsState } from "./control";
import { renderControlPage } from "./control-view";
import { chartInteractionForRoute, chartStateForReadback, type ChartInteractionState } from "./chart-interaction";
import { type LearningRankingState } from "./learning-ranking";
import { renderLearningRanking } from "./learning-ranking-view";
import { controlControllerPage, routerAgentStrategyPage, routerCandidatesPage, routerConfigPage, routerDecisionsPage, routerOverviewPage, routerStrategyPage, routerWorkloadsPage } from "./router-family-view";
import { endpointsPage, familyPage, familySvg, localChoosePage, providersPage, studioWorkspaceLabels, studioWorkspaceTitle, type FamilyRouteState } from "./families-view";
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
import { chartPointKeyAction, type ChartSeries, view as chartView } from "@role-model/ui/foldkit-chart";

import { READBACK_SPECS, type ReadbacksState, localPolicyControls, localPolicyDraftFromReadback, localPolicyFromReadback, renderReadbackPage } from "./readback";
import { endpointsRoute, providersRoute } from "./features/control/routes";
import { requestsRoute } from "./features/requests-ranking/routes";
import { integrationsDownstreamRoute, integrationsUpstreamRoute, observeQueuesRoute } from "./features/s563-pages";
import {
  learningConfigurationRoute,
  learningDecisionsRoute,
  learningEvidenceRoute,
  learningHistoryRoute,
  learningRoute,
  learningPacksRoute,
} from "./features/learning-ranking/routes";
import { studioRoute } from "./features/studio/routes";
import { runtimeConfigRoute, runtimeRoute } from "./features/runtime/routes";
import { indexRoute } from "./features/overview/routes";
import { candidateSpaceCard, overviewStats, telemetryChartCard } from "./features/overview/charts";
import { bucketsFor, percentile, windowForRange, type Bucket } from "./features/overview/chart-data";
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
import {
  agentSupplement,
  endpointsSupplement,
  llamaModelsSupplement,
  localPeersSupplement,
  peersSupplement,
  queuesSupplement,
  runtimeSupplement,
  sessionSupplement,
  swapSupplement,
  workloadsSupplement,
} from "./features/density/supplements";
import { type StudioField, type StudioState, StudioTabSchema, studioIdle } from "./studio";
import { card as layoutCard } from "./features/s563-layout";
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
    [h.Class("rm3-next-route"), h.DataAttribute("route", "local-policy"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("local-policy-state", readback.status)],
    [
      h.h2([h.Class("rm3-next-route-title")], ["Llama-swap host policy"]),
      familySvg(h),
      h.h3([h.Class("mt-2 text-sm font-medium leading-5 text-foreground")], ["Policy configuration"]),
      h.h3([h.Class("mt-4 text-sm font-medium leading-5 text-foreground")], ["Raw policy"]),
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["TTL (seconds) · Max concurrency · Auto-unload idle models"]),
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
    RuntimeConfig: () => "Runtime config | RM3 Foldkit shell",
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

interface ShellSection {
  readonly label: string;
  readonly href: string;
  readonly nav: string;
  readonly tags: ReadonlyArray<Model["route"]["_tag"]>;
}

/**
 * S560: the reference shell navigation. The shipped React shell renders ONE flat link per
 * navigation section (app-shell.tsx maps runtimeNavigationSections to Sidebar navItems); it does
 * not expand sub-pages, show a runtime rail, or group pages into invented sections.
 */
const shellSections: ReadonlyArray<ShellSection> = [
  { href: "/", label: "Overview", nav: "index", tags: ["Index", "Diagnostics"] },
  { href: "/studio", label: "Studio", nav: "studio", tags: ["Studio"] },
  {
    href: "/local/choose",
    label: "Local",
    nav: "local",
    tags: ["LocalChoose", "LocalPeers", "LocalPeerModels", "LocalLlamaSwapModels", "LocalPolicy", "LocalSwap", "LocalLogs"],
  },
  { href: "/control/providers", label: "Remote", nav: "remote", tags: ["Providers"] },
  { href: "/models", label: "Models", nav: "models", tags: ["Models", "ModelsRoles", "Benchmark"] },
  {
    href: "/router",
    label: "Router",
    nav: "router",
    tags: ["Router", "RouterCandidates", "RouterDecisions", "RouterDecisionDetail", "RouterStrategy", "RouterWorkloads", "RouterConfig", "RouterAgentStrategy", "ControlController"],
  },
  {
    href: "/requests",
    label: "Observe",
    nav: "observe",
    tags: ["Requests", "RequestDetail", "Queues", "QueuesConfiguration", "StoreReceipts", "ObserveActivity", "ObserveLogs", "ObserveRouting", "Observability"],
  },
  { href: "/control/endpoints", label: "Connect", nav: "connect", tags: ["Endpoints", "IntegrationsDownstream", "IntegrationsUpstream"] },
  {
    href: "/system/session-readiness",
    label: "System",
    nav: "system",
    tags: ["SystemPeers", "Runtime", "RuntimeConfig", "SessionReadiness", "Dashboard", "SystemOperator", "SystemExtensions", "StorageRetention"],
  },
  {
    href: "/learning",
    label: "Learning",
    nav: "learning",
    tags: ["Learning", "LearningConfiguration", "LearningPacks", "LearningDecisions", "LearningEvidence", "LearningHistory"],
  },
];

/** Reference page titles (design-system.ts createRoute titles; studio tabs are per-tab). */
const STUDIO_PAGE_TITLES = {
  advanced: "Advanced workspace",
  audio: "Audio workspace",
  chat: "Chat workspace",
  images: "Images workspace",
  rerank: "Rerank workspace",
} as const;

const shellPageTitle = (model: Model): string =>
  AppRoute.match(model.route, {
    Diagnostics: () => "Diagnostics",
    Index: () => "Runtime overview",
    Observability: () => "Observability snapshot",
    StoreReceipts: () => "Store degradation receipts",
    Queues: () => "Queue state",
    LocalLogs: () => "Llama-swap logs",
    RouterCandidates: () => "Candidate inventory",
    Requests: () => "Telemetry request ledger",
    RequestDetail: () => "Telemetry request detail",
    RouterDecisions: () => "Routing decisions",
    RouterDecisionDetail: () => "Routing decision detail",
    LocalPeers: () => "Local endpoints",
    SystemPeers: () => "Peer topology",
    LocalPeerModels: () => "Peer models",
    QueuesConfiguration: () => "Queue configuration",
    IntegrationsDownstream: () => "Connect your application",
    IntegrationsUpstream: () => "Upstream passthrough",
    LocalChoose: () => "Choose local backend",
    Studio: () => STUDIO_PAGE_TITLES[(model.studio ?? studioIdle()).tab],
    Learning: () => "Learning overview",
    LearningConfiguration: () => "Learning configuration",
    LearningPacks: () => "Learned packs",
    LearningDecisions: () => "Decision receipts",
    LearningEvidence: () => "Cohort evidence",
    LearningHistory: () => "Learning history",
    LocalLlamaSwapModels: () => "Llama-swap models",
    LocalPolicy: () => "Llama-swap host policy",
    SystemOperator: () => "Operator controls",
    SystemExtensions: () => "Extension boundary",
    Models: () => "Configured models",
    ModelsRoles: () => "Runtime roles",
    Benchmark: () => "Capability benchmark",
    StorageRetention: () => "Storage & retention",
    Runtime: () => "Runtime topology",
    RuntimeConfig: () => "Runtime config",
    SessionReadiness: () => "Session readiness",
    Dashboard: () => "Dashboard",
    LocalSwap: () => "Llama-swap swap history",
    RouterStrategy: () => "Routing strategy",
    RouterWorkloads: () => "Workloads",
    RouterConfig: () => "Runtime config",
    RouterAgentStrategy: () => "Agent strategy",
    ObserveActivity: () => "Host activity and metrics",
    ObserveLogs: () => "Host logs",
    ObserveRouting: () => "Routing analytics",
    Router: () => "Routing overview",
    Providers: () => "Remote providers",
    Endpoints: () => "Available models & endpoints",
    ControlController: () => "Routing controller",
    NotFound: ({ path }) => "Not found: " + path,
  });

interface ShellNavEntry {
  readonly href: string;
  readonly label: string;
  readonly tab?: string;
  readonly tag?: Model["route"]["_tag"];
}

/** Section sub-navigation: the reference renders a segmented control above the page content. */
const shellSectionNav: Readonly<Record<string, ReadonlyArray<ShellNavEntry>>> = {
  Studio: [
    { href: "/studio?tab=chat", label: "Chat", tab: "chat" },
    { href: "/studio?tab=images", label: "Images", tab: "images" },
    { href: "/studio?tab=audio", label: "Audio", tab: "audio" },
    { href: "/studio?tab=rerank", label: "Rerank", tab: "rerank" },
    { href: "/studio?tab=advanced", label: "Advanced APIs", tab: "advanced" },
  ],
  Local: [
    { href: "/local/peers", label: "Endpoints", tag: "LocalPeers" },
    { href: "/local/peer-models", label: "Peer models", tag: "LocalPeerModels" },
    { href: "/local/llama-swap/models", label: "Models", tag: "LocalLlamaSwapModels" },
    { href: "/local/swap", label: "Swap history", tag: "LocalSwap" },
    { href: "/local/llama-swap/policy", label: "Host policy", tag: "LocalPolicy" },
    { href: "/local/logs", label: "Logs", tag: "LocalLogs" },
  ],
  Models: [
    { href: "/models", label: "Models", tag: "Models" },
    { href: "/models/roles", label: "Roles", tag: "ModelsRoles" },
    { href: "/system/benchmark", label: "Benchmark", tag: "Benchmark" },
  ],
  Router: [
    { href: "/router", label: "Overview", tag: "Router" },
    { href: "/router/strategy", label: "Routing strategy", tag: "RouterStrategy" },
    { href: "/router/agent-strategy", label: "Agent strategy", tag: "RouterAgentStrategy" },
    { href: "/router/workloads", label: "Workloads", tag: "RouterWorkloads" },
    { href: "/control/controller", label: "Controller", tag: "ControlController" },
    { href: "/router/candidates", label: "Candidates", tag: "RouterCandidates" },
    { href: "/router/decisions", label: "Decisions", tag: "RouterDecisions" },
  ],
  Observe: [
    { href: "/requests", label: "Requests", tag: "Requests" },
    { href: "/observe/routing", label: "Routing", tag: "ObserveRouting" },
    { href: "/observe/queues", label: "Queues", tag: "Queues" },
    { href: "/observe/store-degradation-receipts", label: "Degradation receipts", tag: "StoreReceipts" },
    { href: "/observe/observability-snapshot", label: "Observability", tag: "Observability" },
    { href: "/observe/activity", label: "Activity", tag: "ObserveActivity" },
    { href: "/observe/logs", label: "Logs", tag: "ObserveLogs" },
  ],
  Connect: [
    { href: "/control/endpoints", label: "Registry", tag: "Endpoints" },
    { href: "/integrations/downstream", label: "Downstream", tag: "IntegrationsDownstream" },
    { href: "/integrations/upstream", label: "Upstream", tag: "IntegrationsUpstream" },
  ],
  System: [
    { href: "/session-readiness", label: "Readiness", tag: "SessionReadiness" },
    { href: "/runtime", label: "Runtime", tag: "Runtime" },
    { href: "/runtime/config", label: "Config", tag: "RuntimeConfig" },
    { href: "/system/peers", label: "Peers", tag: "SystemPeers" },
    { href: "/system/extensions", label: "Extensions", tag: "SystemExtensions" },
    { href: "/system/storage-retention", label: "Storage", tag: "StorageRetention" },
  ],
  Learning: [
    { href: "/learning", label: "Overview", tag: "Learning" },
    { href: "/learning/configuration", label: "Configuration", tag: "LearningConfiguration" },
    { href: "/learning/packs", label: "Packs", tag: "LearningPacks" },
    { href: "/learning/decisions", label: "Decisions", tag: "LearningDecisions" },
    { href: "/learning/evidence", label: "Evidence", tag: "LearningEvidence" },
    { href: "/learning/history", label: "History", tag: "LearningHistory" },
  ],
};

const shellSecondaryNav = (model: Model, h: HtmlBuilder<Message>): Html | null => {
  const section = shellSectionFor(model.route);
  const entries = shellSectionNav[section.label] ?? [];
  if (entries.length <= 1) return null;
  const active = model.route._tag === "Studio" ? (model.studio ?? studioIdle()).tab : model.route._tag;
  // Reference AppShell only mounts the section nav when the current URL is one of the section items.
  // Section hub pages (Local choose, System operator) show no tab bar.
  const isSectionItem = entries.some((entry) => (entry.tab === undefined ? entry.tag === active : entry.tab === active));
  if (!isSectionItem) return null;
  return h.nav(
    [
      h.AriaLabel(section.label + " secondary navigation"),
      h.DataAttribute("shell-secondary-nav", ""),
      h.Class("flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1"),
    ],
    entries.map((entry) => {
      const isActive = entry.tab === undefined ? entry.tag === active : entry.tab === active;
      return h.a(
        [
          h.Href(entry.href),
          ...(isActive ? [h.AriaCurrent("page"), h.DataAttribute("active", "true")] : []),
          h.Class(
            "flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 font-sans text-sm leading-[18px] " +
              (isActive
                ? "bg-primary font-semibold text-primary-foreground"
                : "font-normal text-muted-foreground hover:text-foreground"),
          ),
        ],
        [entry.label],
      );
    }),
  );
};

const shellSectionFor = (route: Model["route"]): ShellSection =>
  shellSections.find((section) => section.tags.includes(route._tag)) ?? shellSections[0]!;

const shellNavLinkClass = (active: boolean): string =>
  active
    ? "flex items-center rounded-md bg-sidebar-active px-2.5 py-1.5 text-left font-sans text-sm leading-5 font-medium text-foreground"
    : "flex items-center rounded-md px-2.5 py-1.5 text-left font-sans text-sm leading-5 font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

const shellNav = (route: Model["route"], label: string, h: HtmlBuilder<Message>): Html => {
  const active = shellSectionFor(route).nav;
  return h.nav(
    [
      h.AriaLabel(label),
      h.DataAttribute("shell-nav", ""),
      h.Class("flex min-h-0 flex-1 flex-col gap-px overflow-hidden p-2"),
    ],
    shellSections.map((section) =>
      h.a(
        [
          h.Href(section.href),
          h.DataAttribute("nav", section.nav),
          ...(section.nav === active
            ? [h.DataAttribute("active", "true"), h.AriaCurrent("page")]
            : []),
          h.Class(shellNavLinkClass(section.nav === active)),
        ],
        [section.label],
      ),
    ),
  );
};

const eyebrowClass =
  "font-mono text-[11px] leading-4 tracking-[0.08em] text-muted-foreground uppercase";

/** Sidebar inventory rows: configured models (label + live request count from telemetry). */
const sidebarInventoryRows = (
  model: Model,
): ReadonlyArray<{ readonly label: string; readonly count: number }> => {
  const counts = new Map<string, number>();
  const metricsRow = model.readbacks.overviewMetrics.rows[0];
  if (metricsRow !== undefined) {
    try {
      const parsed = JSON.parse(metricsRow.meta) as {
        items?: ReadonlyArray<{ modelId?: unknown }>;
      };
      for (const item of parsed.items ?? []) {
        const id = typeof item.modelId === "string" ? item.modelId : undefined;
        if (id !== undefined) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    } catch {
      // A malformed telemetry payload leaves every row at zero requests.
    }
  }
  return model.readbacks.models.rows.slice(0, 8).map((entry) => {
    let id = entry.id;
    try {
      const meta = JSON.parse(entry.meta) as { id?: unknown };
      if (typeof meta.id === "string") {
        id = meta.id;
      }
    } catch {
      // Non-JSON meta keeps the readback row id.
    }
    return { label: entry.label, count: counts.get(id) ?? counts.get(entry.id) ?? 0 };
  });
};

const sidebarCacheState = (
  model: Model,
): { readonly label: string; readonly percent: number | null } => {
  const requests = Number(railValue(model.readbacks.dashboard, "Requests"));
  const cached = Number(railValue(model.readbacks.dashboard, "Cached requests"));
  const sampled =
    model.readbacks.dashboard.status === "ok" &&
    Number.isFinite(requests) &&
    requests > 0 &&
    Number.isFinite(cached);
  return sampled
    ? {
        label: String(Math.round((cached / requests) * 100)) + "%",
        percent: Math.round((cached / requests) * 100),
      }
    : { label: "no live samples", percent: null };
};

const sidebarRouterAlias = (model: Model): string => {
  const row =
    model.readbacks.router.rows.find((entry) => entry.label === "alias") ??
    model.readbacks.router.rows.find((entry) => entry.label === "activeAlias");
  return row?.value ?? "—";
};

const sidebarRouterEndpoint = (model: Model): string => {
  const endpointRow = model.readbacks.health.rows.find((entry) => entry.label === "Endpoint")?.value;
  const origin = typeof window === "undefined" ? undefined : window.location.origin;
  const candidate = endpointRow !== undefined && /^https?:\/\//.test(endpointRow) ? endpointRow : origin;
  if (candidate === undefined) return "—";
  const host = candidate.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return host.length === 0 ? "—" : host + "/v1";
};

const sidebarFooter = (model: Model, h: HtmlBuilder<Message>): Html => {
  const rows = sidebarInventoryRows(model);
  const cache = sidebarCacheState(model);
  return h.div(
    [h.DataAttribute("slot", "role-model-sidebar-footer"), h.Class("flex shrink-0 flex-col")],
    [
      h.div(
        [h.DataAttribute("slot", "role-model-model-inventory"), h.Class("flex shrink-0 flex-col gap-1 border-t border-sidebar-border p-2")],
        [
          h.div(
            [h.Class("flex h-6 w-full shrink-0 items-center justify-between px-2.5")],
            [h.span([h.Class(eyebrowClass)], ["Models"]), h.span([h.Class(eyebrowClass + " text-right")], ["Requests"])],
          ),
          ...rows.map((row) =>
            h.div(
              [h.Class("flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5")],
              [
                h.span([h.Attribute("aria-hidden", "true"), h.Class("size-2 shrink-0 rounded-full bg-chart-cache")], []),
                h.span([h.Class("min-w-0 flex-1 truncate font-mono text-xs leading-4 text-foreground")], [row.label]),
                h.span([h.Class("shrink-0 text-right font-mono text-[11px] leading-4 text-muted-foreground tabular-nums")], [String(row.count)]),
              ],
            ),
          ),
        ],
      ),
      h.div(
        [h.DataAttribute("slot", "role-model-cache"), h.Class("flex shrink-0 flex-col gap-1.5 border-t border-sidebar-border p-2")],
        [
          h.div(
            [h.Class("flex h-6 shrink-0 items-center justify-between gap-2 px-2.5")],
            [h.span([h.Class(eyebrowClass)], ["Cache"]), h.span([h.Class("shrink-0 text-right font-mono text-[11px] leading-4 text-foreground tabular-nums")], [cache.label])],
          ),
          h.div(
            [h.Class("mx-2.5 mb-1 flex h-1.5 shrink-0 items-center overflow-hidden rounded-full bg-border")],
            cache.percent === null
              ? []
              : [h.div([h.Class("h-full shrink-0 rounded-full bg-chart-cache"), h.Attribute("style", "width: " + String(cache.percent) + "%")], [])],
          ),
        ],
      ),
      h.div(
        [h.DataAttribute("slot", "role-model-router-endpoint"), h.Class("flex shrink-0 flex-col gap-1 border-t border-sidebar-border p-2")],
        [
          h.div([h.Class("flex h-6 shrink-0 items-center px-2.5")], [h.span([h.Class(eyebrowClass)], ["Router endpoint"])]),
          h.div([h.Class("flex min-h-5 items-center overflow-hidden px-2.5")], [h.span([h.Class("truncate font-mono text-xs leading-4 text-foreground")], [sidebarRouterEndpoint(model)])]),
          h.div([h.Class("flex min-h-5 items-center overflow-hidden px-2.5 pb-1")], [h.span([h.Class("truncate font-mono text-xs leading-4 text-muted-foreground")], [sidebarRouterAlias(model)])]),
        ],
      ),
    ],
  );
};

const sunIcon = (h: HtmlBuilder<Message>): Html =>
  h.svg([h.Attribute("viewBox", "0 0 24 24"), h.Attribute("fill", "none"), h.Attribute("width", "16"), h.Attribute("height", "16"), h.Attribute("aria-hidden", "true")], [
    h.circle([h.Attribute("cx", "12"), h.Attribute("cy", "12"), h.Attribute("r", "4"), h.Attribute("stroke", "currentColor"), h.Attribute("stroke-width", "1.5")], []),
    h.path([h.Attribute("d", "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"), h.Attribute("stroke", "currentColor"), h.Attribute("stroke-width", "1.5"), h.Attribute("stroke-linecap", "round")], []),
  ]);

const moonIcon = (h: HtmlBuilder<Message>): Html =>
  h.svg([h.Attribute("viewBox", "0 0 24 24"), h.Attribute("fill", "none"), h.Attribute("width", "16"), h.Attribute("height", "16"), h.Attribute("aria-hidden", "true")], [
    h.path([h.Attribute("d", "M21 14.3A9 9 0 1 1 9.7 3 7 7 0 0 0 21 14.3z"), h.Attribute("stroke", "currentColor"), h.Attribute("stroke-width", "1.5"), h.Attribute("stroke-linecap", "round"), h.Attribute("stroke-linejoin", "round")], []),
  ]);

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
      h.Class("rm3-next-route"),
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
export { percentile };
const overviewPage = (
  state: ReadbacksState["overviewMetrics"],
  candidates: ReadbacksState["routerCandidates"],
  windowMs: number,
  h: HtmlBuilder<Message>,
  appliedFilters: OverviewFilters = DEFAULT_OVERVIEW_FILTERS,
  chartInteraction: ChartInteractionState | undefined = undefined,
): Html => {
  const period = windowLabel(windowMs);
  const filterFieldClass = "flex shrink-0 flex-col gap-1.5";
  const filterLabelClass = "font-sans text-xs font-normal leading-4 text-muted-foreground";
  const filterControlClass =
    "flex h-[34px] items-center justify-between gap-2 rounded-md border border-input bg-secondary px-2.5 text-left font-sans text-sm text-foreground";
  const filterSelect = (
    label: string,
    filter: "source" | "status" | "difficulty" | "breakdown",
    value: string,
    options: readonly string[],
    labelFor: (option: string) => string,
  ) =>
    h.label([h.Class(filterFieldClass)], [
      h.span([h.Class(filterLabelClass)], [label]),
      h.select(
        [
          h.Class(filterControlClass),
          h.DataAttribute("overview-filter", filter),
          h.AriaLabel(label),
          h.OnChange((next) => Message.OverviewFilterChanged({ filter, value: next })),
        ],
        options.map((option) => h.option([h.Value(option), ...(option === value ? [h.Selected(true)] : [])], [labelFor(option)])),
      ),
    ]);
  const breakdownValues = appliedFilters.breakdown === "all" ? [] : candidates.rows.flatMap((entry) => { try { const meta = JSON.parse(entry.meta) as { endpointId?: unknown; modelId?: unknown; providerId?: unknown }; const raw = appliedFilters.breakdown === "endpoint" ? meta.endpointId : appliedFilters.breakdown === "provider" ? meta.providerId : meta.modelId; return typeof raw === "string" && raw.length > 0 ? [raw] : []; } catch { return []; } });
  const filterButtonClass = (active: boolean): string =>
    "flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 font-sans text-sm leading-[18px] " +
    (active ? "bg-primary font-semibold text-primary-foreground" : "font-normal text-muted-foreground hover:text-foreground");
  const header = h.div(
    [h.Class("flex w-full flex-wrap items-end justify-between gap-4"), h.DataAttribute("overview-filters", "")],
    [
      h.div([h.Class(filterFieldClass)], [
        h.div([h.Class(filterLabelClass)], ["Time range"]),
        h.div(
          [
            h.Class("flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1"),
            h.Attribute("role", "group"),
            h.AriaLabel("Time range"),
          ],
          WINDOW_OPTIONS.map((option) =>
            h.button(
              [
                h.Type("button"),
                h.AriaPressed(String(option.windowMs === windowMs)),
                h.DataAttribute("window", option.label),
                h.Class(filterButtonClass(option.windowMs === windowMs)),
                h.OnClick(Message.SelectedOverviewWindow({ windowMs: option.windowMs })),
              ],
              [option.label],
            ),
          ),
        ),
      ]),
      h.div([h.Class("flex flex-wrap items-end gap-3"), h.DataAttribute("overview-filter-row", "")], [
        filterSelect("Breakdown", "breakdown", appliedFilters.breakdown, [...OVERVIEW_BREAKDOWNS], (option) => option === "all" ? "Total" : option === "endpoint" ? "By endpoint variant" : option === "model" ? "By upstream model" : "By provider"),
        ...(appliedFilters.breakdown === "all" ? [] : [h.label([h.Class(filterFieldClass)], [h.span([h.Class(filterLabelClass)], ["Breakdown value"]), h.select([h.Class(filterControlClass), h.DataAttribute("overview-filter-value", ""), h.AriaLabel("Breakdown value"), h.OnChange((next) => Message.OverviewFilterChanged({ filter: "breakdownValue", value: next }))], breakdownValues.map((option) => h.option([h.Value(option), ...(option === appliedFilters.breakdownValue ? [h.Selected(true)] : [])], [option])))])]),
        filterSelect("Source filter", "source", appliedFilters.source, [...OVERVIEW_SOURCES], (option) => option === "all" ? "All sources" : option === "local" ? "Local only" : "Remote only"),
        filterSelect("Status", "status", appliedFilters.status, [...OVERVIEW_STATUSES], (option) => option === "all" ? "All statuses" : option === "success" ? "Success only" : option === "failure" ? "Failure only" : "Unknown only"),
        filterSelect("Difficulty", "difficulty", appliedFilters.difficulty, [...OVERVIEW_DIFFICULTIES], (option) => option === "all" ? "All buckets" : option === "easy" ? "Easy only" : option === "medium" ? "Medium only" : "Hard only"),
        h.p([h.Class("sr-only"), h.DataAttribute("overview-summary", "")], [overviewSummary(appliedFilters)]),
        h.p([h.Class("sr-only"), h.DataAttribute("overview-period", period)], ["Last " + period]),
      ]),
    ],
  );
  const { buckets } = bucketsFor(state, windowMs);
  const itemCount = state.rows.reduce((sum, entry) => { try { const meta = JSON.parse(entry.meta) as { items?: unknown }; return sum + (Array.isArray(meta.items) ? meta.items.length : 0); } catch { return sum; } }, 0);
  const chartState: "empty" | "error" | "loading" | "ready" =
    state.status === "loading" ? "loading" : state.status === "error" ? "error" : state.status === "ok" && buckets.some((bucket) => !bucket.empty) ? "ready" : "empty";
  const labels = buckets.length === 0 ? ["No data"] : buckets.map((bucket) => bucket.label);
  const point = (bucket: Bucket, value: number): number | null => (bucket.empty ? null : value);
  const seriesValues = (series: ReadonlyArray<ChartSeries>): ReadonlyArray<number | null> =>
    series.flatMap((entry) => entry.points.map((entryPoint) => entryPoint.value));
  const hasSeriesData = (series: ReadonlyArray<ChartSeries>): boolean =>
    seriesValues(series).some((value) => value !== null && Number.isFinite(value));
  const chartStatus = (hasData: boolean): "empty" | "error" | "loading" | "ready" =>
    state.status === "loading" ? "loading" : state.status === "error" ? "error" : hasData ? "ready" : "empty";
  const emptyPoints = (): ReadonlyArray<{ readonly label: string; readonly value: null }> => labels.map((label) => ({ label, value: null }));
  // Data binding (owner-reported blank-chart regression): tokens/cache/latency/volume are derived from the
  // per-request metrics items. The metrics payload carries no cost facts, so the two cost charts keep an
  // honest empty state INSIDE the plot instead of drawing a measured-looking blank axis.
  const tokenSeries: ReadonlyArray<ChartSeries> = [
    { id: "inputTokens", label: "Input tokens", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.inputTokens) })) },
    { id: "outputTokens", label: "Output tokens", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.outputTokens) })) },
    { id: "totalTokens", label: "Total tokens", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.tokens) })) },
  ];
  const cacheSeries: ReadonlyArray<ChartSeries> = [
    { id: "cacheHitTokens", label: "Cache hit tokens", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.cacheTokens) })) },
    {
      id: "cacheHitTokenRate",
      label: "Cache hit token rate",
      points: buckets.map((bucket) => ({
        label: bucket.label,
        value: bucket.empty || bucket.inputTokens + bucket.cacheTokens === 0
          ? null
          : Math.round((bucket.cacheTokens / (bucket.inputTokens + bucket.cacheTokens)) * 100),
      })),
    },
  ];
  const latencySeries: ReadonlyArray<ChartSeries> = [
    { id: "averageLatencyMs", label: "Average latency", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.avg) })) },
    { id: "p95LatencyMs", label: "p95 latency", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.p95) })) },
  ];
  const volumeSeries: ReadonlyArray<ChartSeries> = [
    { id: "successCount", label: "Success", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.success) })) },
    { id: "failureCount", label: "Failures", points: buckets.map((bucket) => ({ label: bucket.label, value: point(bucket, bucket.failure) })) },
  ];
  const costSeries: ReadonlyArray<ChartSeries> = [
    { id: "actualCostUsd", label: "Actual cost", points: emptyPoints() },
    { id: "estimatedCostUsd", label: "Estimated cost", points: emptyPoints() },
    { id: "effectiveCostUsd", label: "Effective cost", points: emptyPoints() },
  ];
  const avoidedSeries: ReadonlyArray<ChartSeries> = [
    { id: "routingCostSavingsUsd", label: "Routing avoided cost", points: emptyPoints() },
    { id: "cacheCostSavingsUsd", label: "Cache avoided cost", points: emptyPoints() },
    { id: "totalAvoidedCostUsd", label: "Total avoided cost", points: emptyPoints() },
  ];
  const chartInput = (input: {
    readonly description: string;
    readonly emptyMessage: string;
    readonly kind: "area" | "bar" | "line";
    readonly series: ReadonlyArray<ChartSeries>;
    readonly title: string;
  }): Html => {
    const hasData = hasSeriesData(input.series);
    return telemetryChartCard({ ...input, hasData, h, state: chartStatus(hasData) });
  };
  const charts = h.div([
    h.Class("grid w-full grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2"),
    h.DataAttribute("overview-charts", ""),
    h.DataAttribute("overview-buckets", String(buckets.filter((bucket) => !bucket.empty).length)),
    h.DataAttribute("overview-items", String(itemCount)),
    h.DataAttribute("overview-labels", String(labels.length)),
    h.DataAttribute("overview-window", period),
  ], [
    h.div([h.Class("min-w-0 bg-card col-span-1 md:col-span-2")], [candidateSpaceCard(candidates, h)]),
    h.div([h.Class("min-w-0 bg-card col-span-1 md:col-span-2")], [chartInput({ description: "Input, output, and total token flow across the selected telemetry window.", emptyMessage: "No token-bearing requests have been recorded yet.", kind: "area", series: tokenSeries, title: "Token usage over time" })]),
    h.div([h.Class("min-w-0 bg-card col-span-1 md:col-span-2")], [chartInput({ description: "Cache-hit token volume and cache-hit rate.", emptyMessage: "No cache activity has been recorded for this slice yet.", kind: "line", series: cacheSeries, title: "Cache efficiency trend" })]),
    h.div([h.Class("min-w-0 bg-card col-span-1")], [chartInput({ description: "Authoritative effective cost based on stored request-time pricing facts.", emptyMessage: "No request costs have been recorded for this slice yet.", kind: "line", series: costSeries, title: "Effective cost over time" })]),
    h.div([h.Class("min-w-0 bg-card col-span-1")], [chartInput({ description: "Routing-avoided cost, cache-avoided cost, and total avoided spend.", emptyMessage: "No routing or cache savings have been recorded yet.", kind: "area", series: avoidedSeries, title: "Cost avoided over time" })]),
    h.div([h.Class("min-w-0 bg-card col-span-1")], [chartInput({ description: "Average and p95 latency across the selected window.", emptyMessage: "Latency telemetry has not been recorded for this slice yet.", kind: "line", series: latencySeries, title: "Latency trend" })]),
    h.div([h.Class("min-w-0 bg-card col-span-1")], [chartInput({ description: "Successful and failed request volume by time bucket.", emptyMessage: "No successful or failed requests have been recorded yet.", kind: "bar", series: volumeSeries, title: "Success vs failure volume" })]),
  ]);
  return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "index"), h.DataAttribute("readback-route", "dashboard"), h.DataAttribute("overview-state", chartState === "ready" ? "success" : chartState), h.DataAttribute("readback-state", state.status === "ok" ? "ok" : state.status)], [
    header,
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
    ? [studioField("Endpoint family", "mode", "Responses", h), studioField("Model", "model", modelValue, h), studioField("JSON payload", "advancedBody", state.advancedBody, h, true)]
    : state.tab === "rerank"
      ? [studioField("Contract /v1/rerank", "mode", "rerank", h), studioField("Model", "model", modelValue, h), studioField("Query", "query", state.query, h), studioField("Candidate documents", "documents", state.documents, h, true)]
      : state.tab === "images"
        ? [studioField("Image request modes · Mode", "mode", state.mode, h), studioField("Model", "model", modelValue, h), studioField("Prompt", "prompt", state.prompt, h), studioField("Size", "size", state.size, h)]
        : state.tab === "audio"
          ? [studioField("Audio mode and request · Mode", "mode", "Speech synthesis", h), studioField("Model", "model", modelValue, h), h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([h.Class("font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Voice"]), h.select([h.AriaLabel("Voice"), h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2 text-[12px]")], [h.option([], ["Select…"]), h.option([], ["Alloy"]), h.option([], ["Nova"])])]), studioField("Input", "prompt", state.prompt, h, true)]
          : [studioField("Model", "model", modelValue, h), studioField("Prompt", "prompt", state.prompt, h)];
  const ctaLabel = state.tab === "images" ? "Run image request" : state.tab === "audio" ? "Run audio request" : state.tab === "rerank" ? "Submit rerank request" : state.tab === "advanced" ? "Submit advanced request" : "Run request";
  const resultStage = state.tab === "images"
    ? { title: "Image result stage", inventory: "GENERATED IMAGES", empty: "Run an image request to populate the result stage." }
    : state.tab === "audio"
      ? { title: "Audio result stage", inventory: "VOICE INVENTORY", empty: "Run a speech or transcription request to populate the audio stage. Voice inventory is unavailable on this runtime host." }
      : state.tab === "rerank"
        ? { title: "Ranked results", inventory: "CONTRACT DETAILS", empty: "Submit a rerank request to populate ordered scores." }
        : state.tab === "advanced"
          ? { title: "Response workspace", inventory: "REQUEST TEMPLATE", empty: "{\"model\": \"deepseek.personal.deepseek-api-key.global.deepseek-flash-high\", \"input\": \"Explain the current contract family.\"}" }
          : { title: "Result workspace", inventory: "RESULT", empty: "No result yet." };
  const workspaceTitle = studioWorkspaceTitle(state.tab);
  const labels = studioWorkspaceLabels(state.tab);
  const requestTitle = labels[0] ?? workspaceTitle;
  const resultTitle = labels[1] ?? "Result workspace";
  const rawResponse = h.div([h.DataAttribute("studio-response", "")], [
    h.h2([h.Class("text-[12px] font-semibold uppercase tracking-[0.12em]")], ["RAW RESPONSE"]),
    state.status === "error"
      ? h.pre([h.Role("alert"), h.DataAttribute("studio-error", ""), h.Class("mt-2 whitespace-pre-wrap text-[12px] text-[var(--rm-error)]")], [state.message ?? "Request failed", "\n", state.responseText])
      : h.pre([h.DataAttribute("studio-raw", state.status), h.Class("mt-2 whitespace-pre-wrap text-[12px]")], [state.responseText]),
  ]);
  return h.section([h.Class("rm3-next-route mt-4 space-y-6"), h.DataAttribute("route", "studio"), h.DataAttribute("studio-state", state.status), h.DataAttribute("page-layout", "reference")], [
    h.h3([h.Class("sr-only")], [workspaceTitle]),
    h.div([h.Class("grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]")], [
      layoutCard(requestTitle, undefined, [
        h.div([h.Class("mb-4 flex flex-wrap gap-1 rounded-md border border-border bg-secondary p-1"), h.DataAttribute("studio-tabs", ""), h.Role("tablist"), h.AriaLabel("Studio tabs")], tabs),
        h.div([h.Class("grid gap-2"), h.Id("studio-panel"), h.Role("tabpanel"), h.AriaLabel(state.tab), h.DataAttribute("studio-form", state.tab)], fields),
        h.button([h.Type("button"), h.DataAttribute("studio-run", ""), ...(state.status === "loading" ? [h.AriaBusy(true), h.Disabled(true)] : []), h.OnClick(Message.StudioRunRequested({ token: state.token + 1 })), h.Class("mt-3 inline-flex h-[34px] items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], [ctaLabel]),
      ], h),
      layoutCard(resultTitle, undefined, [
        h.div([h.DataAttribute("studio-result-stage", state.tab)], [
          h.p([h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground")], [resultStage.inventory]),
          h.p([h.Class("mt-2 text-sm leading-5 text-muted-foreground")], [resultStage.empty]),
          ...(state.tab === "images" ? [h.p([h.Class("mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]")], ["RAW RESPONSE"]), h.pre([h.Class("mt-1 whitespace-pre-wrap text-xs")], ["{ \"status\": \"No image request yet\" }"])] : []),
          ...(state.tab === "rerank" ? [h.p([h.Class("mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]")], ["CONTRACT DETAILS"]), h.pre([h.Class("mt-1 whitespace-pre-wrap text-xs")], ["{ \"status\": \"No rerank request yet\" }"])] : []),
          ...(state.tab === "advanced" ? [h.p([h.Class("mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]")], ["REQUEST TEMPLATE"]), h.pre([h.Class("mt-1 whitespace-pre-wrap text-xs")], ["{ \"model\": \"deepseek.personal.deepseek-api-key.global.deepseek-flash-high\", \"input\": \"Explain the current contract family.\" }"])] : []),
          ...(state.tab === "audio" ? [h.p([h.Class("mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]")], ["VOICE INVENTORY"]), h.p([h.Class("mt-1 text-sm leading-5 text-muted-foreground")], ["Voice inventory is unavailable on this runtime host."])] : []),
        ]),
      ], h),
    ]),
    layoutCard("Raw response", "The request result as returned by the runtime.", [rawResponse], h),
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
      [h.Class("rm3-next-route"), h.DataAttribute("route", "models-roles"), h.DataAttribute("models-roles-state", state)],
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
    [h.Class("rm3-next-route"), h.DataAttribute("route", "models-roles"), h.DataAttribute("models-roles-state", "ok")],
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
  if (models.status === "loading" || endpoints.status === "loading") return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "loading")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.p([h.AriaBusy(true)], ["Loading configured models…"])]);
  if (models.status === "error" || endpoints.status === "error") return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "error")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.p([h.Role("alert")], [models.message ?? endpoints.message ?? "Configured models read failed"])]);
  if (models.status === "empty" || models.rows.length === 0) return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "empty")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.p([], ["No configured models."])]);
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
  return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", "success")], [h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]), h.ul([h.Class("mt-3 grid gap-2")], rows)]);
};

const finalFamilyPage = (label: string, routeName: string, sections: ReadonlyArray<{ label: string; spec: Parameters<typeof renderReadbackPage>[0]; readback: ReadbacksState[keyof ReadbacksState] }>, h: HtmlBuilder<Message>): Html => {
  const first = sections[0];
  const status = first.readback.status === "idle" ? "loading" : first.readback.status;
  return h.section(
    [h.Class("rm3-next-route"), h.DataAttribute("route", routeName), h.DataAttribute("final-family-state", status)],
    [
      h.h2([h.Class("rm3-next-route-title")], [label]),
      ...sections.flatMap((section) => [h.h3([], [section.label]), renderReadbackPage(section.spec, section.readback, h)]),
    ],
  );
};
const learningFamilyPage = (label: string, routeName: string, spec: Parameters<typeof renderReadbackPage>[0], readback: ReadbacksState[keyof ReadbacksState], h: HtmlBuilder<Message>): Html => {
  const status = readback.status === "idle" ? "loading" : readback.status;
  return h.section(
    [h.Class("rm3-next-route"), h.DataAttribute("route", routeName), h.DataAttribute("learning-family-state", status)],
    [h.h2([h.Class("rm3-next-route-title")], [label]), renderReadbackPage(spec, readback, h)],
  );
};
const learningPage = (readbacks: ReadbacksState, learningRanking: LearningRankingState | undefined, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "learning")], [
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
  return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "runtime-config")], [
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
  readonly routerPosture: Model["routerPosture"];
  readonly retention: Model["retention"];
  readonly operatorLearningMode: Model["operatorLearningMode"];
  readonly endpointAdmission: EndpointAdmissionState;
  readonly chartInteraction: ChartInteractionState | undefined;
  readonly learningRanking: LearningRankingState | undefined;
  readonly learningReplayAutoQueue: Model["learningReplayAutoQueue"];
  readonly modelsView: Model["modelsView"];
  readonly learningOperatorToken: Model["learningOperatorToken"];
  readonly requestsFilters: Model["requestsFilters"];
  readonly observeRoutingFilters: Model["observeRoutingFilters"];
  readonly observeLogsSource: Model["observeLogsSource"];
  readonly localLogsAutoRefresh: Model["localLogsAutoRefresh"];
  readonly familyState: FamilyRouteState;
  readonly learningPackAction: Model["learningPackAction"];
  readonly learningDecisionFilters: Model["learningDecisionFilters"];
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
    routerPosture,
    retention,
    operatorLearningMode,
    endpointAdmission,
    chartInteraction,
    learningRanking,
    learningReplayAutoQueue,
    modelsView,
    learningOperatorToken,
    requestsFilters,
    observeRoutingFilters,
    observeLogsSource,
    localLogsAutoRefresh,
    familyState,
    learningPackAction,
    learningDecisionFilters,
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
    Queues: () => h.div([h.DataAttribute("page-layout", "reference")], [observeQueuesRoute(readbacks.queues, h)]),
    LocalLogs: () => familyPage("Llama-swap logs", "local-logs", "Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise.", [{ label: "Structured local log history", spec: READBACK_SPECS.localLogs, readback: readbacks.localLogs, note: "The ledger is bounded for scanability; parsed rows carry request correlation.", columns: ["Time", "Source", "Level", "Message", "Request"], rows: (row) => [row.label, row.value, row.meta, "—", "—"] }, { label: "Raw log streams", note: "Raw stdout/stderr streams stay in the host log store and are not reconstructed here." }], h, undefined, undefined, familyState),
    RouterCandidates: () => routerCandidatesPage(readbacks, h),
    Requests: () => telemetryRequestsRoute(readbacks.requests, readbacks.overviewMetrics, windowForRange(requestsFilters?.range), requestsRanking, requestsRankingMetricListbox, requestsRankingTargetListbox, h, requestsFilters),
    RequestDetail: () => renderReadbackPage(READBACK_SPECS.requestDetail, readbacks.requestDetail, h),
    RouterDecisions: () => routerDecisionsPage(readbacks, h),
    RouterDecisionDetail: () =>
      renderReadbackPage(READBACK_SPECS.routerDecisionDetail, readbacks.routerDecisionDetail, h),
    LocalPeers: () => familyPage("Local endpoints", "local-peers", "role-model probes each server at /v1/models before peer models can be registered.", [
      { label: "Local endpoints", note: "role-model probes each server at /v1/models before peer models can be registered. No peer endpoints configured." },
      { label: "Endpoint inventory", spec: READBACK_SPECS.localPeers, readback: readbacks.localPeers, columns: ["Endpoint", "Status", "Type", "Actions"], rows: (row) => [row.label, row.value, "OpenAI-compatible peer", "—"] },
      { label: "Add peer endpoint", note: "Base URL of your OpenAI-compatible API (with or without /v1). Optional bearer token if the server requires auth.", children: [
        h.div([h.Class("grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]")], [
          h.label([h.Class("flex flex-col gap-1 font-sans text-xs text-muted-foreground")], [h.span([], ["Name"]), h.input([h.Id("peer-endpoint-name"), h.AriaLabel("Name"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")])]),
          h.label([h.Class("flex flex-col gap-1 font-sans text-xs text-muted-foreground")], [h.span([], ["Endpoint URL"]), h.input([h.Id("peer-endpoint-url"), h.AriaLabel("Endpoint URL"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")])]),
          h.label([h.Class("flex flex-col gap-1 font-sans text-xs text-muted-foreground")], [h.span([], ["Auth token (optional)"]), h.input([h.Id("peer-endpoint-token"), h.Type("password"), h.AriaLabel("Auth token (optional)"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")])]),
        ]),
        h.button([h.Type("button"), h.Class("mt-4 inline-flex h-[34px] items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Add endpoint"]),
      ] },
    ], h, undefined, undefined, familyState),
    SystemPeers: () => peersSupplement(familyPage("Peer topology", "system-peers", "Peer-backed model groups observed in the current runtime listing.", [{ label: "Peer inventory", spec: READBACK_SPECS.systemPeers, readback: readbacks.systemPeers }, { label: "Peer config", note: "Proxy targets and auth posture are configured on the host." }, { label: "Contract fields", note: "Peer readback fields: id, url, auth and readiness." }], h), readbacks.systemPeers, h),
    LocalPeerModels: () => familyPage("Peer models", "local-peer-models", "Models registered behind the local peers.", [{ label: "Register model", note: "Register a model from a peer endpoint and assign runtime roles." , children: [h.div([h.Class("grid gap-4 md:grid-cols-2")], [h.label([h.Class("flex flex-col gap-1 font-sans text-xs text-muted-foreground")], [h.span([], ["Model ID"]), h.input([h.Id("peer-model-id"), h.AriaLabel("Model ID"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")])]), h.label([h.Class("flex flex-col gap-1 font-sans text-xs text-muted-foreground")], [h.span([], ["Endpoint"]), h.input([h.Id("peer-model-endpoint"), h.AriaLabel("Endpoint"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")])])]), h.button([h.Type("button"), h.Class("mt-4 inline-flex h-[34px] items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Register model"])] }, { label: "Registered models", spec: READBACK_SPECS.localPeerModels, readback: readbacks.localPeerModels, columns: ["Model", "Endpoint", "Roles", "Actions"], rows: (row) => [row.label, row.value, row.meta, "—"] }], h, undefined, undefined, familyState),
    QueuesConfiguration: () => renderReadbackPage(READBACK_SPECS.queueConfig, readbacks.queueConfig, h),
    IntegrationsDownstream: () => integrationsDownstreamRoute(readbacks.downstreamOpenAI, readbacks.configuredModels, h),
    IntegrationsUpstream: () => integrationsUpstreamRoute(readbacks.integrationProviders, readbacks.configuredModels, h),
    Benchmark: () => benchmarkRoute(readbacks.benchmarkSuite, readbacks.benchmarkSummary, readbacks.benchmarkRuns, h, modelsView, readbacks.modelEndpoints, readbacks.benchmarkPreferences, readbacks.benchmarkActiveRun),
    StorageRetention: () => familyPage("Storage & retention", "storage-retention", "Physical and logical storage, retention classes and manual pruning.", [{ label: "Logical classes", note: "Logical classes group rows by retention policy." }, { label: "Retention policy", note: "Category totals, receipts and byte counts are reported by the retention readback." }, { label: "Manual pruning", note: "Prune is manual; the host enforces retention records before deletion." }, { label: "Retention transactions", spec: READBACK_SPECS.storageRetention, readback: readbacks.storageRetention }], h, retention),
    Studio: () => studioRoute({ h, readbacks, studio, studioPage }),
    Learning: () => learningOverviewRoute(readbacks.learning, readbacks.replayJobs, readbacks.evaluationJobs, learningRanking, learningReplayAutoQueue, h, learningOperatorToken),
    LearningConfiguration: () => learningConfigurationPage(readbacks.learningConfiguration, h, learningOperatorToken, learningPackAction),
    LearningPacks: () => learningPacksPage(readbacks.learningPacks, h, learningOperatorToken, learningPackAction),
    LearningDecisions: () => learningDecisionsPage(readbacks.learningDecisions, h, learningOperatorToken, learningDecisionFilters),
    LearningEvidence: () => learningEvidencePage(readbacks.learningEvidence, h, learningOperatorToken, learningPackAction),
    LearningHistory: () => learningHistoryPage(readbacks.learningHistory, h, learningOperatorToken, learningPackAction),
    LocalPolicy: () => localPolicyPage(readbacks.localPolicy, h),
    LocalLlamaSwapModels: () => llamaModelsSupplement(familyPage("Llama-swap models", "local-llama-swap-models", "Load a runtime-config-declared model, assign route roles, and manage the in-memory llama-swap inventory. Role summary: loaded models and assigned roles.", [
      { label: "Load model", note: "Model must already be declared in runtime config. Loading triggers the managed swap.", children: [h.div([h.Class("flex flex-wrap items-end gap-3")], [h.label([h.Class("flex flex-col gap-1 font-sans text-xs text-muted-foreground")], [h.span([], ["Model ID"]), h.input([h.Id("llama-model-id"), h.AriaLabel("Model ID"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")])]), h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Load model"])])] },
      { label: "Loaded models", spec: READBACK_SPECS.localLlamaSwapModels, readback: readbacks.localLlamaSwapModels, columns: ["Model", "Status", "Roles", "Actions"], rows: (row) => [row.label, row.value, row.meta, "—"] },
    ], h, undefined, undefined, familyState), readbacks.localLlamaSwapModels, h),
    SystemOperator: () => familyPage("Operator Controls", "system-operator", "Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored.", [{ label: "Operator status", spec: READBACK_SPECS.operatorStatus, readback: readbacks.operatorStatus }, { label: "Trace lineage", spec: READBACK_SPECS.operatorTraceRoots, readback: readbacks.operatorTraceRoots }, { label: "Replay Jobs", spec: READBACK_SPECS.replayJobs, readback: readbacks.replayJobs }, { label: "Evaluation Jobs", spec: READBACK_SPECS.evaluationJobs, readback: readbacks.evaluationJobs }, { label: "Shadow Learning", note: "This page does not enable production learning; shadow-learning actions stay bounded to the readback." }], h, retention, operatorLearningMode, familyState),
    SystemExtensions: () => familyPage("Extensions", "system-extensions", "Extension boundary, replay automation, contribution posture and the extension inventory.", [{ label: "Extension boundary", note: "The host enforces the extension boundary before any extension code runs." }, { label: "Replay automation", note: "Replay automation is configured per extension and reported by the host." }, { label: "Contribution posture", note: "Contribution posture records whether an extension may contribute runtime behavior." }, { label: "Recommendation ledger", note: "Recommendation receipts are recorded in the ledger when an extension produces one." }, { label: "Extension inventory", spec: READBACK_SPECS.extensions, readback: readbacks.extensions }], h, undefined, undefined, familyState),
    Models: () => modelsRoute(readbacks.configuredModels, readbacks.modelEndpoints, h, modelsView, readbacks.rolePolicy, readbacks.providerAccounts),
    ModelsRoles: () => modelsRolesRoute(readbacks.configuredModels, readbacks.modelEndpoints, h, modelsView, readbacks.rolePolicy),
    RouterStrategy: () => routerStrategyPage("router-strategy", readbacks, routerPosture, h),
    RouterWorkloads: () => workloadsSupplement(routerWorkloadsPage(readbacks, routerPosture, h), readbacks.routerConfig, h),
    RouterConfig: () => routerConfigPage(readbacks, routerPosture, h),
    RouterAgentStrategy: () => agentSupplement(routerAgentStrategyPage(readbacks, routerPosture, h), readbacks.routerConfig, h),
    LocalChoose: () => localChoosePage(readbacks, h),
    Runtime: () => runtimeRoute({ h, readbacks, runtimeConfigEditor, runtimeConfigPage }),
    RuntimeConfig: () => runtimeConfigRoute({ h, readbacks, runtimeConfigEditor, runtimeConfigPage }),
    SessionReadiness: () => sessionSupplement(renderReadbackPage(READBACK_SPECS.sessionReadiness, readbacks.sessionReadiness, h), readbacks.sessionReadiness, h),
    Dashboard: () => renderReadbackPage(READBACK_SPECS.dashboard, readbacks.dashboard, h),
    LocalSwap: () => familyPage("Llama-swap swap history", "local-swap", "Most recent swap events first.", [{ label: "Event ledger", spec: READBACK_SPECS.localSwap, readback: readbacks.localSwap, columns: ["Time", "Event", "Model", "Reason"], rows: (row) => [row.label, row.value, row.meta, "—"] }, { label: "Ledger semantics", note: "Initial load · Swap reason · Timeline order: events appear when the managed host loads a first model, swaps to a new one, or records the operator-visible reason." }], h),
    ObserveActivity: () => observeActivityRoute(readbacks.observeActivity, h),
    ObserveLogs: () => observeLogsRoute(readbacks.observeLogs, h, observeLogsSource ?? "All sources"),
    ObserveRouting: () => observeRoutingRoute(readbacks.observeRouting, readbacks.overviewMetrics, windowForRange(observeRoutingFilters?.range), h, observeRoutingFilters),
    Router: () => routerOverviewPage(readbacks, h),
    Providers: () => providersPage({ controls, deviceAuth, deviceAuthDialog, h, providerAccount, readbacks }),
    Endpoints: () => endpointsPage({ controls, endpointAdmission, h, readbacks }),
    ControlController: () => controlControllerPage(controls, h),
    Index: () => indexRoute({ chartInteraction, h, overviewFilters, overviewPage, overviewWindowMs, readbacks }),
    NotFound: (route) => {
      const { path } = route;
      return h.section(
        [
          h.Class("rm3-next-route"),
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
export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model.route),
  body: h.div(
    [
      h.Class("flex h-screen w-full overflow-hidden bg-background text-foreground"),
      h.DataAttribute("shell-state", "success"),
      h.DataAttribute("theme", model.theme),
      h.DataAttribute("refresh-revision", String(model.refresh.lastAppliedRevision)),
      h.DataAttribute("refresh-state", model.refresh.status),
    ],
    [
      // S181: bypass block. The sidebar repeats on every route, so a keyboard user must be able to
      // jump past it (WCAG 2.4.1). Visually hidden until focused.
      h.a([h.Href("#main-content"), h.Class("sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-[var(--rm-accent)] focus:px-3 focus:py-2 focus:text-[12px] focus:text-[var(--rm-on-primary)]")], ["Skip to content"]),
      h.aside(
        [
          h.Class("hidden h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-xs leading-4 md:flex"),
          h.DataAttribute("shell-sidebar", ""),
        ],
        [
          h.div(
            [h.Class("flex h-12 shrink-0 items-center border-b border-sidebar-border px-4")],
            [h.span([h.Class("font-sans text-sm leading-[18px] font-semibold tracking-[-0.02em] text-foreground")], ["role-model"])],
          ),
          shellNav(model.route, "Primary navigation", h),
          sidebarFooter(model, h),
        ],
      ),
      h.div(
        [h.Class("flex min-h-0 min-w-0 flex-1 flex-col bg-background")],
        [
          h.nav(
            [
              h.Class("flex min-h-11 shrink-0 gap-1 overflow-x-auto border-b border-border bg-background px-2 py-1 md:hidden"),
              h.AriaLabel("Primary navigation mobile"),
              h.DataAttribute("shell-nav-mobile", ""),
            ],
            shellSections.map((section) =>
              h.a(
                [
                  h.Href(section.href),
                  h.DataAttribute("nav", section.nav),
                  ...(shellSectionFor(model.route).nav === section.nav ? [h.AriaCurrent("page")] : []),
                  h.Class(
                    "flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm " +
                      (shellSectionFor(model.route).nav === section.nav
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground"),
                  ),
                ],
                [section.label],
              ),
            ),
          ),
          h.header(
            [
              h.Class("flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4"),
              h.DataAttribute("slot", "role-model-sub-page-header"),
            ],
            [
              h.h1(
                [
                  h.Class("min-w-0 truncate font-sans text-sm leading-[18px] font-medium tracking-tight text-foreground"),
                  h.DataAttribute("shell-route", model.route._tag),
                ],
                [shellPageTitle(model)],
              ),
              h.div(
                [h.Class("flex shrink-0 items-center gap-2")],
                [
                  h.button(
                    [
                      h.Type("button"),
                      h.DataAttribute("slot", "role-model-theme-toggle"),
                      h.AriaLabel(model.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"),
                      h.Class("inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent " + focusRingClass),
                      h.OnClick(Message.ToggledTheme()),
                    ],
                    [model.theme === "dark" ? sunIcon(h) : moonIcon(h)],
                  ),
                ],
              ),
            ],
          ),
          h.main(
            [
              h.Class("flex min-h-0 flex-1 flex-col overflow-auto"),
              h.DataAttribute("slot", "role-model-page-content"),
              h.DataAttribute("shell-main", ""),
              h.Id("main-content"),
              h.DataAttribute("refresh-revision", String(model.refresh.lastAppliedRevision)),
              h.DataAttribute("refresh-state", model.refresh.status),
            ],
            [
              h.div(
                [h.Class("mx-auto flex w-full flex-col gap-6 px-4 py-5 max-w-[1216px]"), h.DataAttribute("shell-content", "")],
                [
                  (shellSecondaryNav(model, h) ?? h.span([], [])),
                  ...(model.refresh.status === "stale"
                    ? [
                        h.p(
                          [
                            h.Role("status"),
                            h.AriaLive("polite"),
                            h.DataAttribute("refresh-state", "stale"),
                            h.Class("rounded-md border border-border bg-muted px-3 py-2 text-sm leading-5 text-foreground"),
                          ],
                          [
                            model.refresh.message === undefined
                              ? "Stale: waiting for a runtime snapshot resync."
                              : "Stale: " + model.refresh.message + ".",
                          ],
                        ),
                      ]
                    : []),
                  routeContent({
                    route: model.route,
                    learningReplayAutoQueue: model.learningReplayAutoQueue,
    modelsView: model.modelsView,
    learningOperatorToken: model.learningOperatorToken,
    requestsFilters: model.requestsFilters,
    observeRoutingFilters: model.observeRoutingFilters,
    observeLogsSource: model.observeLogsSource,
    localLogsAutoRefresh: model.localLogsAutoRefresh,
    familyState: { localLlamaSwapMessage: model.localLlamaSwapMessage, localLlamaSwapModelId: model.localLlamaSwapModelId, localLogsAutoRefresh: model.localLogsAutoRefresh, localPeerModelId: model.localPeerModelId, localPeerModelMessage: model.localPeerModelMessage, localPeersDraft: model.localPeersDraft, localPeersMessage: model.localPeersMessage, learningOperatorToken: model.learningOperatorToken, operatorLearningMode: model.operatorLearningMode, systemExtensionsMessage: model.systemExtensionsMessage, systemOperatorMessage: model.systemOperatorMessage, systemOperatorReplayCount: model.systemOperatorReplayCount, systemOperatorTraceRoot: model.systemOperatorTraceRoot },
    learningPackAction: model.learningPackAction,
    learningDecisionFilters: model.learningDecisionFilters,
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
                    routerPosture: model.routerPosture,
                    retention: model.retention,
                    operatorLearningMode: model.operatorLearningMode,
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
    ],
  ),
});
