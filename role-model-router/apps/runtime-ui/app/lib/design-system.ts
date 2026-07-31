import {
  Activity,
  Boxes,
  Cable,
  Cpu,
  Gauge,
  GitBranch,
  Image,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Logs,
  type LucideIcon,
  Mic,
  Network,
  PanelsTopLeft,
  SlidersHorizontal,
  Speech,
  Telescope,
  Terminal,
  Waypoints,
} from "lucide-react";

export type RuntimeLayoutTemplate =
  | "summary-board"
  | "studio-workspace"
  | "registry-detail"
  | "model-inventory"
  | "ledger-inspector"
  | "dual-console"
  | "contract-reference"
  | "matrix-grid"
  | "system-topology";

export interface RuntimeRouteDefinition {
  readonly id: string;
  readonly to: string;
  readonly label: string;
  readonly section: string;
  readonly icon: LucideIcon;
  readonly template: RuntimeLayoutTemplate;
  readonly title: string;
  readonly description: string;
}

export interface RuntimeNavigationSection {
  readonly title: string;
  readonly icon: LucideIcon;
  /** Optional hub path for the section sidebar entry (e.g. Local → Choose). */
  readonly hubTo?: string;
  readonly items: readonly RuntimeRouteDefinition[];
}

function createRoute(definition: RuntimeRouteDefinition): RuntimeRouteDefinition {
  return definition;
}

const overviewSummaryRoute = createRoute({
  id: "overview-summary",
  to: "/app",
  label: "Summary",
  section: "Overview",
  icon: LayoutDashboard,
  template: "summary-board",
  title: "Runtime overview",
  description:
    "Current runtime state, endpoint inventory, controller posture, and recent request flow with a separate recent telemetry window.",
});

const studioChatRoute = createRoute({
  id: "studio-chat",
  to: "/app/studio/chat",
  label: "Chat",
  section: "Studio",
  icon: Speech,
  template: "studio-workspace",
  title: "Chat workspace",
  description:
    "Compose routed chat requests and inspect assistant output, tool calls, and execution receipts side by side.",
});

const studioImagesRoute = createRoute({
  id: "studio-images",
  to: "/app/studio/images",
  label: "Images",
  section: "Studio",
  icon: Image,
  template: "studio-workspace",
  title: "Images workspace",
  description:
    "Image generation workspace for OpenAI-style and SDAPI-style request modes inside one repo-owned studio surface.",
});

const studioAudioRoute = createRoute({
  id: "studio-audio",
  to: "/app/studio/audio",
  label: "Audio",
  section: "Studio",
  icon: Mic,
  template: "studio-workspace",
  title: "Audio workspace",
  description:
    "Speech generation, voice discovery, and transcription share one audio workspace so the operator flow does not split into duplicate pages.",
});

const studioRerankRoute = createRoute({
  id: "studio-rerank",
  to: "/app/studio/rerank",
  label: "Rerank",
  section: "Studio",
  icon: SlidersHorizontal,
  template: "studio-workspace",
  title: "Rerank workspace",
  description:
    "Ranked-input evaluation workspace for query, candidate, and ordered-score inspection without leaving the studio section.",
});

const studioAdvancedRoute = createRoute({
  id: "studio-advanced",
  to: "/app/studio/advanced",
  label: "Advanced APIs",
  section: "Studio",
  icon: Telescope,
  template: "studio-workspace",
  title: "Advanced workspace",
  description:
    "Contract-and-request workspace for responses, messages, token counting, embeddings, completion, and infill families that stay under Studio.",
});

const localChooseRoute = createRoute({
  id: "local-choose",
  to: "/app/local/choose",
  label: "Local",
  section: "Local",
  icon: Cpu,
  template: "registry-detail",
  title: "Choose local backend",
  description:
    "Peer and llama-swap are different ways to run models on this machine. Pick the workflow that matches how you host inference.",
});

const localPeerModelsRoute = createRoute({
  id: "local-peer-models",
  to: "/app/local/peer-models",
  label: "Peer models",
  section: "Local",
  icon: Cpu,
  template: "registry-detail",
  title: "Peer models",
  description: "Register models from your endpoints with the router and assign runtime roles.",
});

const localLlamaSwapModelsRoute = createRoute({
  id: "local-llama-swap-models",
  to: "/app/local/llama-swap/models",
  label: "Models",
  section: "Local",
  icon: Cpu,
  template: "registry-detail",
  title: "Llama-swap models",
  description:
    "Load and swap models managed by the role-model llama-swap process. Assign runtime roles per model.",
});

const localSwapRoute = createRoute({
  id: "local-llama-swap-swap",
  to: "/app/local/llama-swap/swap",
  label: "Swap history",
  section: "Local",
  icon: Activity,
  template: "ledger-inspector",
  title: "Llama-swap swap history",
  description: "Chronological llama-swap load and swap events.",
});

const localPolicyRoute = createRoute({
  id: "local-llama-swap-policy",
  to: "/app/local/llama-swap/policy",
  label: "Host policy",
  section: "Local",
  icon: SlidersHorizontal,
  template: "registry-detail",
  title: "Llama-swap host policy",
  description: "TTL, auto-unload, and concurrency for the managed llama-swap runtime.",
});

const localLogsRoute = createRoute({
  id: "local-llama-swap-logs",
  to: "/app/local/llama-swap/logs",
  label: "Logs",
  section: "Local",
  icon: Terminal,
  template: "dual-console",
  title: "Llama-swap logs",
  description: "Live proxy and upstream logs from the llama-swap process.",
});

const localMatrixRoute = createRoute({
  id: "local-llama-swap-matrix",
  to: "/app/local/llama-swap/matrix",
  label: "Matrix",
  section: "Local",
  icon: LayoutGrid,
  template: "matrix-grid",
  title: "Llama-swap matrix",
  description: "Grid of concurrently loaded llama-swap models.",
});

const localPeersRoute = createRoute({
  id: "local-endpoints",
  to: "/app/local/endpoints",
  label: "Endpoints",
  section: "Local",
  icon: Network,
  template: "registry-detail",
  title: "Local endpoints",
  description:
    "Register OpenAI-compatible servers you operate. Required before loading peer models.",
});

const controlProvidersRoute = createRoute({
  id: "remote-providers",
  to: "/app/remote/providers",
  label: "Providers",
  section: "Remote",
  icon: PanelsTopLeft,
  template: "registry-detail",
  title: "Remote providers",
  description:
    "Choose a LiteLLM-backed provider, select the models available for that provider, and complete setup from one onboarding surface.",
});

const controlRoutingStrategyRoute = createRoute({
  id: "router-strategy",
  to: "/app/router/strategy",
  label: "Routing strategy",
  section: "Router",
  icon: GitBranch,
  template: "registry-detail",
  title: "Routing strategy",
  description:
    "Editable routing posture for the persisted scoring strategy and execution mode, with controller context and direct verification links.",
});

const controlRuntimeConfigRoute = createRoute({
  id: "system-runtime-config",
  to: "/app/system/runtime-config",
  label: "Config",
  section: "System",
  icon: SlidersHorizontal,
  template: "registry-detail",
  title: "Runtime config",
  description:
    "Edit the unified runtime contract for local llama-swap models, remote LiteLLM providers, and process policy through one repo-owned route.",
});

const controlControllerRoute = createRoute({
  id: "router-controller",
  to: "/app/router/controller",
  label: "Controller",
  section: "Router",
  icon: Waypoints,
  template: "registry-detail",
  title: "Routing controller",
  description:
    "Choose the concrete endpoint/model pair that acts as the global routing controller.",
});

const connectRegistryRoute = createRoute({
  id: "connect-registry",
  to: "/app/connect",
  label: "Registry",
  section: "Connect",
  icon: Cpu,
  template: "registry-detail",
  title: "Available models & endpoints",
  description:
    "Models and endpoints client applications can call through role-model after remote provider onboarding.",
});

const controlRolesRoute = createRoute({
  id: "models-roles",
  to: "/app/models/roles",
  label: "Roles",
  section: "Models",
  icon: LayoutGrid,
  template: "registry-detail",
  title: "Runtime roles",
  description:
    "Author full router-grade role definitions and task allowlists from the live runtime policy surface instead of relying on seeded role catalogs.",
});

const controlModelsRoute = createRoute({
  id: "models-inventory",
  to: "/app/models",
  label: "Models",
  section: "Models",
  icon: Boxes,
  template: "model-inventory",
  title: "Configured models",
  description:
    "Unified local and remote model inventory with model-side role assignment, controller state, and links into the live runtime policy surface.",
});

const controlBenchmarkRoute = createRoute({
  id: "models-benchmark",
  to: "/app/models/benchmark",
  label: "Benchmark",
  section: "Models",
  icon: Telescope,
  template: "registry-detail",
  title: "Capability benchmark",
  description:
    "Grade configured local and remote models, persist observed capability profiles, and explain how benchmark scores inform routing.",
});

const routerOverviewRoute = createRoute({
  id: "router-overview",
  to: "/app/router",
  label: "Overview",
  section: "Router",
  icon: GitBranch,
  template: "registry-detail",
  title: "Routing overview",
  description:
    "First-class operator summary for routing posture, decision flow, and the live handoff between config, candidates, and request outcomes.",
});

/** Fixed Decision #15 — not a live Router catalog/SegmentedControl route. */
export const runtimeLegacyRedirectRoutes = [
  {
    from: "/app/router/config",
    to: "/app/router/strategy",
    reason: "RM3 Router IA has no Config segment; legacy deep links redirect to Strategy.",
  },
] as const;

const routerCandidatesRoute = createRoute({
  id: "router-candidates",
  to: "/app/router/candidates",
  label: "Candidates",
  section: "Router",
  icon: Network,
  template: "ledger-inspector",
  title: "Candidate inventory",
  description:
    "Comparable local and remote endpoint inventory with health, role coverage, and observed routing signals in one operator surface.",
});

const routerDecisionsRoute = createRoute({
  id: "router-decisions",
  to: "/app/router/decisions",
  label: "Decisions",
  section: "Router",
  icon: ListChecks,
  template: "ledger-inspector",
  title: "Routing decisions",
  description:
    "Explainable routing ledger keyed by recent requests with direct drill-in to chosen endpoint, fallback posture, and policy summary.",
});

const routerDecisionDetailRoute = createRoute({
  id: "router-decision-detail",
  to: "/app/router/decisions/:requestId",
  label: "Decision detail",
  section: "Router",
  icon: ListChecks,
  template: "ledger-inspector",
  title: "Routing decision detail",
  description:
    "Explainable routing detail for one request, including scored candidates, routing diagnostics, and links into Observe request traces.",
});

const observeActivityRoute = createRoute({
  id: "observe-activity",
  to: "/app/observe/activity",
  label: "Activity",
  section: "Observe",
  icon: Activity,
  template: "ledger-inspector",
  title: "Host activity and metrics",
  description:
    "A preserved raw-host ledger for metrics, captures, tooling, and controller changes that stays adjacent to the canonical telemetry pages.",
});

const observeRequestsRoute = createRoute({
  id: "observe-requests",
  to: "/app/observe/requests",
  label: "Requests",
  section: "Observe",
  icon: ListChecks,
  template: "ledger-inspector",
  title: "Telemetry request ledger",
  description:
    "Canonical runtime telemetry rows with direct drill-in to request captures, endpoint profile context, and tooling receipts. Raw-host Activity and Logs stay in Observe navigation rather than an in-page adjacent-tools card.",
});

const observeRoutingRoute = createRoute({
  id: "observe-routing",
  to: "/app/observe/routing",
  label: "Routing",
  section: "Observe",
  icon: GitBranch,
  template: "ledger-inspector",
  title: "Routing analytics",
  description:
    "Historical routing mix, difficulty, model selection, and avoided-cost analytics from persisted request-time telemetry facts.",
});

const observeRequestDetailRoute = createRoute({
  id: "observe-request-detail",
  to: "/app/observe/requests/:requestId",
  label: "Request detail",
  section: "Observe",
  icon: ListChecks,
  template: "ledger-inspector",
  title: "Telemetry request detail",
  description:
    "Canonical telemetry detail with usage, cache, capture, endpoint profile, and tooling receipts aligned in one inspector. Raw-host Activity and Logs stay in Observe navigation rather than an in-page adjacent-tools card.",
});

const observeLogsRoute = createRoute({
  id: "observe-logs",
  to: "/app/observe/logs",
  label: "Logs",
  section: "Observe",
  icon: Logs,
  template: "dual-console",
  title: "Host logs",
  description:
    "Preserved raw-host logs stay adjacent to canonical telemetry with request-level handoffs when correlation exists.",
});

const integrationsDownstreamRoute = createRoute({
  id: "connect-downstream",
  to: "/app/connect/downstream",
  label: "Downstream",
  section: "Connect",
  icon: Cable,
  template: "contract-reference",
  title: "Connect your application",
  description:
    "OpenAI-compatible downstream contract, auth modes, and model discovery for applications calling role-model.",
});

const integrationsUpstreamRoute = createRoute({
  id: "connect-upstream",
  to: "/app/connect/upstream",
  label: "Upstream",
  section: "Connect",
  icon: GitBranch,
  template: "contract-reference",
  title: "Upstream passthrough",
  description:
    "Upstream passthrough boundaries, auth modes, and model-specific targets without duplicating editable control surfaces.",
});

const systemRuntimeRoute = createRoute({
  id: "system-runtime",
  to: "/app/system/runtime",
  label: "Runtime",
  section: "System",
  icon: Gauge,
  template: "system-topology",
  title: "Runtime topology",
  description:
    "Bridge lifecycle, validation floor, controller posture, version facts, and tooling runtime contracts in one system view.",
});

const systemSessionReadinessRoute = createRoute({
  id: "system-session-readiness",
  to: "/app/system/session-readiness",
  // Paper System page nav: short segment labels; page title stays long.
  label: "Readiness",
  section: "System",
  icon: ListChecks,
  template: "system-topology",
  title: "Session readiness",
  description:
    "Bootstrap stage receipts, credential readiness, routable inventory, remote health outcomes, and alias drift warnings after restart.",
});

const systemPeersRoute = createRoute({
  id: "system-peers",
  to: "/app/system/peers",
  label: "Peers",
  section: "System",
  icon: Waypoints,
  template: "system-topology",
  title: "Peer topology",
  description:
    "Peer inventory and policy page for remote model sources, auth posture, timeouts, filters, and peer-backed topology decisions.",
});

const systemExtensionsRoute = createRoute({
  id: "system-extensions",
  to: "/app/system/extensions",
  label: "Extensions",
  section: "System",
  icon: Boxes,
  template: "system-topology",
  title: "Extension boundary",
  description:
    "Installed package lifecycle, scoped permissions, compatibility, retention, and bounded degradation without making routing depend on private workers.",
});

const systemStorageRetentionRoute = createRoute({
  id: "system-storage-retention",
  to: "/app/system/storage-retention",
  label: "Storage",
  section: "System",
  icon: LayoutGrid,
  template: "system-topology",
  title: "Storage & retention",
  description:
    "Usage by data class and tier, managed-policy conflicts, dry-run pruning, immutable receipts, progress, and rollback-safe controls.",
});

const runtimeRouteDefinitions = [
  overviewSummaryRoute,
  studioChatRoute,
  studioImagesRoute,
  studioAudioRoute,
  studioRerankRoute,
  studioAdvancedRoute,
  localChooseRoute,
  localPeersRoute,
  localPeerModelsRoute,
  localLlamaSwapModelsRoute,
  localSwapRoute,
  localPolicyRoute,
  localLogsRoute,
  localMatrixRoute,
  controlProvidersRoute,
  controlRoutingStrategyRoute,
  controlRuntimeConfigRoute,
  controlControllerRoute,
  connectRegistryRoute,
  controlRolesRoute,
  controlModelsRoute,
  controlBenchmarkRoute,
  routerOverviewRoute,
  routerCandidatesRoute,
  routerDecisionsRoute,
  routerDecisionDetailRoute,
  observeActivityRoute,
  observeRequestsRoute,
  observeRoutingRoute,
  observeLogsRoute,
  integrationsDownstreamRoute,
  integrationsUpstreamRoute,
  systemRuntimeRoute,
  systemSessionReadinessRoute,
  systemPeersRoute,
  systemExtensionsRoute,
  systemStorageRetentionRoute,
] as const;

export const runtimeNavigationSections: readonly RuntimeNavigationSection[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [overviewSummaryRoute],
  },
  {
    title: "Studio",
    icon: Speech,
    items: [
      studioChatRoute,
      studioImagesRoute,
      studioAudioRoute,
      studioRerankRoute,
      studioAdvancedRoute,
    ],
  },
  {
    title: "Local",
    icon: Cpu,
    hubTo: "/app/local/choose",
    items: [
      localPeersRoute,
      localPeerModelsRoute,
      localLlamaSwapModelsRoute,
      localSwapRoute,
      localPolicyRoute,
      localLogsRoute,
      localMatrixRoute,
    ],
  },
  {
    title: "Remote",
    icon: PanelsTopLeft,
    items: [controlProvidersRoute],
  },
  {
    title: "Models",
    icon: Boxes,
    items: [controlModelsRoute, controlRolesRoute, controlBenchmarkRoute],
  },
  {
    title: "Router",
    icon: GitBranch,
    items: [
      routerOverviewRoute,
      controlRoutingStrategyRoute,
      controlControllerRoute,
      routerCandidatesRoute,
      routerDecisionsRoute,
    ],
  },
  {
    title: "Observe",
    icon: Activity,
    items: [observeRequestsRoute, observeRoutingRoute, observeActivityRoute, observeLogsRoute],
  },
  {
    title: "Connect",
    icon: Cable,
    items: [connectRegistryRoute, integrationsDownstreamRoute, integrationsUpstreamRoute],
  },
  {
    title: "System",
    icon: Gauge,
    items: [
      systemSessionReadinessRoute,
      systemRuntimeRoute,
      controlRuntimeConfigRoute,
      systemPeersRoute,
      systemExtensionsRoute,
      systemStorageRetentionRoute,
    ],
  },
] as const;

/** Wave 1 RM3 authority twin. Live CSS may still use transitional `--rm-*` until Wave 2. */
export const runtimeTheme = {
  maxContentWidth: "1216px",
  radii: {
    sm: "5px",
    md: "6px",
    lg: "8px",
    pill: "9999px",
    shell: "0px",
    panel: "8px",
    field: "6px",
    badge: "9999px",
  },
  colors: {
    light: {
      bg: "#FFFFFF",
      panelMuted: "#FAFAFA",
      surface: "#FFFFFF",
      surfaceStrong: "#FFFFFF",
      panel: "#FAFAFA",
      fg: "#111111",
      secondary: "#666666",
      muted: "#888888",
      border: "#EAEAEA",
      borderStrong: "#D4D4D4",
      accent: "#0A0A0A",
      accentInk: "#0A0A0A",
      accentFocus: "#888888",
      accentOnDark: "#FFFFFF",
      accentMuted: "rgba(10, 10, 10, 0.72)",
      accentSubtle: "rgba(10, 10, 10, 0.08)",
      accentGhost: "rgba(10, 10, 10, 0.04)",
      dividerSoft: "#EAEAEA",
      hairline: "#EAEAEA",
      chipTranslucent: "rgba(17, 17, 17, 0.06)",
      onPrimary: "#FFFFFF",
      telemetryLocal: "#111111",
      telemetryRemote: "#666666",
      telemetryHealthy: "#166534",
      telemetryDegraded: "#B67A11",
      telemetryRaw: "#666666",
      error: "#B4261A",
      errorMuted: "rgba(180, 38, 26, 0.76)",
      errorSubtle: "rgba(180, 38, 26, 0.14)",
      errorGhost: "rgba(180, 38, 26, 0.10)",
      success: "#166534",
      successMuted: "rgba(22, 101, 52, 0.76)",
      successSubtle: "rgba(22, 101, 52, 0.10)",
      warning: "#B67A11",
      warningMuted: "rgba(182, 122, 17, 0.78)",
      warningSubtle: "rgba(182, 122, 17, 0.14)",
      info: "#666666",
      advisory: "#888888",
    },
    dark: {
      bg: "#0A0A0A",
      surface: "#0F0F0F",
      surfaceStrong: "#141414",
      panel: "#141414",
      panelMuted: "#141414",
      fg: "#EDEDED",
      secondary: "#9A9A9A",
      muted: "#9A9A9A",
      border: "#1F1F1F",
      borderStrong: "#333333",
      accent: "#FFFFFF",
      accentInk: "#EDEDED",
      accentFocus: "#777777",
      accentOnDark: "#FFFFFF",
      accentMuted: "rgba(237, 237, 237, 0.72)",
      accentSubtle: "rgba(255, 255, 255, 0.08)",
      accentGhost: "rgba(255, 255, 255, 0.04)",
      dividerSoft: "rgba(237, 237, 237, 0.08)",
      hairline: "#1F1F1F",
      chipTranslucent: "rgba(237, 237, 237, 0.08)",
      onPrimary: "#0A0A0A",
      telemetryLocal: "#EDEDED",
      telemetryRemote: "#9A9A9A",
      telemetryHealthy: "#059669",
      telemetryDegraded: "#D9A441",
      telemetryRaw: "#9A9A9A",
      error: "#E0726A",
      errorMuted: "rgba(224, 114, 106, 0.82)",
      errorSubtle: "rgba(224, 114, 106, 0.20)",
      errorGhost: "rgba(224, 114, 106, 0.10)",
      success: "#059669",
      successMuted: "rgba(5, 150, 105, 0.82)",
      successSubtle: "rgba(5, 150, 105, 0.14)",
      warning: "#D9A441",
      warningMuted: "rgba(217, 164, 65, 0.82)",
      warningSubtle: "rgba(217, 164, 65, 0.12)",
      info: "#9A9A9A",
      advisory: "#9A9A9A",
    },
  },
} as const;

export const chartColors = {
  local: "var(--rm3-chart-local)",
  remote: "var(--rm3-chart-remote)",
  tokens: "var(--rm3-chart-throughput)",
  cacheHit: "var(--rm3-chart-cache)",
  cacheRate: "var(--rm3-chart-throughput)",
  latency: "var(--rm3-chart-latency)",
  cost: "var(--rm3-chart-cost)",
  failure: "var(--rm3-chart-error)",
  success: "var(--rm3-chart-green)",
  neutral1: "var(--rm3-chart-4)",
  neutral2: "var(--rm3-chart-nodata)",
  ink: "var(--rm3-chart-local)",
  cyan: "var(--rm3-chart-azure)",
  highlightPink: "var(--rm3-chart-pink)",
  violet: "var(--rm3-chart-violet)",
  linkBlue: "var(--rm3-chart-1)",
  linkDeep: "var(--rm3-chart-remote)",
  linkSoft: "var(--rm3-royal-blue-100)",
  error: "var(--rm3-chart-error)",
  errorDeep: "var(--rm3-chart-error)",
  errorSoft: "var(--rm3-coral)",
  warning: "var(--rm3-chart-amber)",
  warningDeep: "var(--rm3-di-serria-700)",
  warningSoft: "var(--rm3-di-serria-50)",
} as const;

export const chartAxisTickStyle = {
  fill: "var(--rm-muted)",
  fontSize: 12,
} as const;

export const chartAxisCategoryTickStyle = {
  fill: "var(--rm-secondary)",
  fontSize: 13,
} as const;

export const chartBarRadius: [number, number, number, number] = [8, 8, 0, 0];

export const chartRankingBarRadius: [number, number, number, number] = [0, 8, 8, 0];

export const chartHorizontalRankingLegend = {
  placement: "bottom",
  axisCategoryWidth: 0,
} as const;

export const telemetryChartLayoutContract = {
  leftAxisGutter: { min: 40, max: 88 },
  rightAxisReserve: { min: 34, max: 64 },
  legendInset: 12,
  plotMargin: { top: 4, right: 0, bottom: 0, left: 0 },
  plotHeight: 280,
  tickCharacterWidth: 7,
  tickHorizontalPadding: 16,
} as const;

export interface ResolvedTelemetryChartLayout {
  readonly leftAxisGutter: number;
  readonly rightAxisReserve: number;
  readonly legendInset: number;
  readonly plotMargin: typeof telemetryChartLayoutContract.plotMargin;
  readonly plotHeight: number;
}

function resolveChartAxisWidth(
  labels: readonly string[],
  bounds: { readonly min: number; readonly max: number },
): number {
  const widestLabelLength = labels.reduce(
    (widest, label) => Math.max(widest, [...label].length),
    0,
  );
  return Math.min(
    bounds.max,
    Math.max(
      bounds.min,
      widestLabelLength * telemetryChartLayoutContract.tickCharacterWidth +
        telemetryChartLayoutContract.tickHorizontalPadding,
    ),
  );
}

export function resolveTelemetryChartLayout(input: {
  readonly leftTickLabels: readonly string[];
  readonly rightTickLabels?: readonly string[];
}): ResolvedTelemetryChartLayout {
  const rightTickLabels = input.rightTickLabels ?? [];
  return {
    leftAxisGutter: resolveChartAxisWidth(
      input.leftTickLabels,
      telemetryChartLayoutContract.leftAxisGutter,
    ),
    rightAxisReserve:
      rightTickLabels.length > 0
        ? resolveChartAxisWidth(rightTickLabels, telemetryChartLayoutContract.rightAxisReserve)
        : 0,
    legendInset: telemetryChartLayoutContract.legendInset,
    plotMargin: telemetryChartLayoutContract.plotMargin,
    plotHeight: telemetryChartLayoutContract.plotHeight,
  };
}

export function formatTelemetryChartTick(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) < 1 ? 2 : 0,
  }).format(value);
}

export const telemetryChartStates = {
  loading: {
    label: "Loading",
    tone: "muted",
    copy: "Loading chart data.",
  },
  refreshing: {
    label: "Refreshing",
    tone: "muted",
    copy: "Refreshing chart data while keeping the last populated view visible.",
  },
  empty: {
    label: "Empty",
    tone: "muted",
    copy: "No telemetry rows match the current filters.",
  },
  unsupported: {
    label: "Unsupported",
    tone: "warning",
    copy: "The selected metric or dimension is not supported by this telemetry slice.",
  },
  partial: {
    label: "Partial",
    tone: "warning",
    copy: "Some matching rows do not carry the selected metric or dimension.",
  },
  truncated: {
    label: "Truncated",
    tone: "warning",
    copy: "The backend explicitly limited the telemetry slice.",
  },
  error: {
    label: "Error",
    tone: "error",
    copy: "Telemetry analytics could not be loaded.",
  },
  populated: {
    label: "Populated",
    tone: "neutral",
    copy: "Chart values come from backend-owned telemetry analytics.",
  },
} as const;

export function getTelemetryChartStatePillTone(
  stateKind: keyof typeof telemetryChartStates,
): "neutral" | "warning" | "error" {
  const tone = telemetryChartStates[stateKind].tone;
  if (tone === "warning") {
    return "warning";
  }
  if (tone === "error") {
    return "error";
  }
  return "neutral";
}

export const shellQuickLinks = [
  { label: "Controller JSON", href: "/api/role-model/controller" },
  { label: "Runtime JSON", href: "/api/role-model/runtime/summary" },
  { label: "Providers JSON", href: "/api/role-model/providers" },
  { label: "Logs", href: "/logs" },
  { label: "Metrics", href: "/api/metrics" },
] as const;

export const cardClassName =
  "rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-[var(--rm-shadow-card)]";

export const raisedPanelClassName =
  "rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface-strong)]";

export const mutedPanelClassName =
  "rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)]";

export const insetPanelClassName = `${mutedPanelClassName} p-4 text-[14px] font-normal leading-[21px] tracking-[0em] text-[var(--rm-secondary)]`;

/** RM3 chart empty / unsupported body — dashed muted panel, never warning amber. */
export const chartEmptyStateClassName =
  "w-full rounded-md border border-dashed border-border bg-transparent px-4 py-3 text-sm font-normal leading-5 text-muted-foreground";

export const chartErrorStateClassName =
  "w-full rounded-md border border-[color-mix(in_srgb,var(--rm-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--rm-error)_6%,transparent)] px-4 py-3 text-sm font-normal leading-5 text-[var(--rm-error)]";

export const errorNoticeClassName =
  "rounded-[var(--rm-radius-panel)] border border-[var(--rm-error)] bg-[var(--rm-error-ghost)] p-6 text-[14px] font-normal leading-[21px] tracking-[0em] text-[var(--rm-error)]";

export const eyebrowClassName =
  "text-[12px] font-normal uppercase leading-4 tracking-[0.08em] text-[var(--rm-muted)]";

/** Mono uppercase eyebrow — table headers, MetricStrip keys, source labels (Paper DS). */
export const monoEyebrowClassName =
  "font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-[var(--rm-muted)]";

export const navLabelClassName = "text-[13px] font-normal leading-[18px] tracking-[0em]";
export const navLabelTextStyle = {
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: "18px",
  letterSpacing: "0em",
} as const;
export const pillLabelClassName = navLabelClassName;

export function getPrimarySectionLinkClassName(isActive: boolean): string {
  return [
    `flex min-h-[41px] items-center rounded-[var(--rm3-radius-lg)] px-3 py-2.5 transition-colors ${navLabelClassName}`,
    isActive
      ? "bg-[var(--rm-surface-strong)] text-[var(--rm-fg)]"
      : "text-[var(--rm-secondary)] hover:bg-[var(--rm-surface-strong)] hover:text-[var(--rm-fg)]",
  ].join(" ");
}

export function getSecondaryNavigationLinkClassName(isActive: boolean): string {
  return [
    `inline-flex min-h-[31px] items-center rounded-[var(--rm-radius-pill)] px-3.5 py-1.5 ${navLabelClassName} transition-colors`,
    isActive
      ? "bg-primary !text-primary-foreground"
      : "bg-[var(--rm-panel-muted)] text-[var(--rm-secondary)] hover:text-[var(--rm-fg)]",
  ].join(" ");
}

export const utilityLabelClassName =
  "text-[12px] font-normal uppercase leading-4 tracking-[0.08em]";

/** RM3 form field labels — Paper Remote/Studio: sans 12/16 foreground.
 * PageFilters use the same voice muted (`pageFilterLabelClassName` in `@role-model/ui`).
 */
export const fieldLabelClassName = "font-sans text-xs leading-4 text-foreground";

export const supportingTextClassName =
  "font-sans text-[13px] font-normal leading-[18px] text-[var(--rm-secondary)]";

export const rightAlignedSupportingTextClassName =
  "text-right text-[14px] leading-[21px] text-[var(--rm-secondary)]";

export const foregroundEmphasisClassName = "font-semibold text-[var(--rm-fg)]";

export const utilityStrongTextClassName =
  "text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";

export const inlineTitleClassName = "text-[16px] font-semibold leading-[22px] text-[var(--rm-fg)]";

export const compactTitleClassName = "text-[15px] font-semibold leading-5 text-[var(--rm-fg)]";

export const metaTextClassName = "text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]";

/** Text-link / inline action — RM3 has no colored accent; underline is the affordance. */
export const accentActionTextClassName =
  "text-[13px] font-normal leading-[18px] text-foreground underline underline-offset-2";

export const bodyTextClassName = "text-[14px] font-normal leading-[21px] tracking-[0em]";

export const bodyStrongTextClassName = "text-[14px] font-semibold leading-[21px] tracking-[0em]";

export const panelBodyTextClassName = `${bodyTextClassName} text-[var(--rm-secondary)]`;

export const displayTitleClassName =
  "[font-family:var(--rm-font-display)] text-[22px] font-normal leading-[28px] tracking-[-0.018em]";

export const sectionTitleClassName =
  "text-sm font-semibold leading-5 tracking-tight text-foreground";

export const largeValueClassName =
  "[font-family:var(--rm-font-display)] text-[22px] font-semibold leading-[28px] tracking-[-0.018em]";

export const monoUtilityStrongTextClassName =
  "break-words font-mono text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";

export const modalEyebrowClassName = eyebrowClassName;

export const modalTitleClassName =
  "[font-family:var(--rm-font-display)] text-[28px] font-normal leading-[34px] tracking-[-0.022em] text-[var(--rm-fg)]";

export const monoCodeValueClassName =
  "font-mono text-[28px] font-normal leading-[34px] tracking-[0.28em] text-[var(--rm-fg)]";

export const monoMetaTextClassName =
  "break-all font-mono text-[13px] font-normal leading-[18px] text-[var(--rm-muted)]";

export const inlineLinkClassName =
  "text-[13px] font-normal leading-[18px] text-foreground underline underline-offset-2";

/** RM3 form fields — Paper Remote/Forms: bg-background · border-input · 34px · 13px/18px. */
export const fieldClassName =
  "w-full min-h-[34px] rounded-md border border-input bg-background px-3 py-1.5 font-sans !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const selectFieldClassName =
  "w-full h-[34px] min-h-[34px] rounded-md border border-input bg-background py-0 pl-3 pr-9 text-left font-sans !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const selectChevronStyle = {
  appearance: "none",
  backgroundImage: "var(--rm-select-chevron)",
  backgroundPosition: "right 16px center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "12px 8px",
} as const;

/** Primary CTA — Paper Studio/Forms: 36px · radius-md · 13px (not 44px pill). */
export const primaryButtonClassName =
  "inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-[var(--rm-radius-field)] border border-primary bg-primary px-3.5 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] !text-primary-foreground transition hover:border-[var(--rm-accent-focus)] hover:bg-[var(--rm-accent-focus)] active:scale-95 disabled:opacity-60";

/** Studio composer CTA — Paper Run request is full rail width. */
export const primaryButtonBlockClassName = `${primaryButtonClassName} w-full`;

export const secondaryButtonClassName =
  "inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[var(--rm-fg)] transition hover:border-[var(--rm-accent)] hover:bg-[var(--rm-accent-ghost)] hover:text-[var(--rm-fg)] active:scale-95 disabled:opacity-60";

/** Companion control beside SelectField — match select trigger height/radius, not pill CTAs. */
export const compactFieldButtonClassName =
  "inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-panel)] px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[var(--rm-accent-ink)] transition hover:border-[var(--rm-accent)] hover:bg-[var(--rm-accent-ghost)] hover:text-[var(--rm-accent-ink)] active:scale-95 disabled:opacity-60";

export const compactFieldButtonEmphasisClassName =
  "inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-[var(--rm-radius-field)] border border-primary bg-primary px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] !text-primary-foreground transition hover:border-[var(--rm-accent-focus)] hover:bg-[var(--rm-accent-focus)] active:scale-95 disabled:opacity-60";

export const utilityButtonClassName =
  "inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3.5 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[var(--rm-fg)] transition hover:border-[var(--rm-border-strong)] hover:bg-[var(--rm-panel)]";

export function getSelectablePanelClassName(selected: boolean): string {
  return [
    "w-full rounded-[var(--rm-radius-panel)] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rm-accent-subtle)]",
    selected
      ? "border-[var(--rm-accent)] bg-[var(--rm-accent-ghost)] text-[var(--rm-fg)]"
      : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-secondary)] hover:border-[var(--rm-fg)]",
  ].join(" ");
}

export const codeBlockClassName =
  "max-w-full overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 text-xs leading-6 text-[var(--rm-secondary)]";

export const listRowClassName =
  "flex flex-col gap-3 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 md:flex-row md:items-start md:justify-between";

export function getRuntimeRouteDefinition(pathname: string): RuntimeRouteDefinition | undefined {
  if (pathname === "/app/local/peers") {
    return localPeersRoute;
  }
  if (pathname === "/app/control/providers") {
    return controlProvidersRoute;
  }
  if (pathname === "/app/control/routing-strategy") {
    return controlRoutingStrategyRoute;
  }
  if (pathname === "/app/control/runtime-config") {
    return controlRuntimeConfigRoute;
  }
  if (pathname === "/app/control/controller") {
    return controlControllerRoute;
  }
  if (pathname === "/app/providers") {
    return controlProvidersRoute;
  }
  if (pathname === "/app/control/endpoints") {
    return connectRegistryRoute;
  }
  if (pathname === "/app/control/roles") {
    return controlRolesRoute;
  }
  if (pathname === "/app/control/models") {
    return controlModelsRoute;
  }
  if (pathname === "/app/control/benchmark") {
    return controlBenchmarkRoute;
  }
  if (pathname === "/app/integrations/downstream") {
    return integrationsDownstreamRoute;
  }
  if (pathname === "/app/integrations/upstream") {
    return integrationsUpstreamRoute;
  }
  if (pathname === "/app/workbench") {
    return studioChatRoute;
  }
  if (pathname === "/app/runtime") {
    return systemRuntimeRoute;
  }
  if (pathname === "/app/control/session-readiness") {
    return systemSessionReadinessRoute;
  }
  if (pathname === "/app/connect") {
    return connectRegistryRoute;
  }
  if (pathname === "/app/connect/downstream") {
    return integrationsDownstreamRoute;
  }
  if (pathname === "/app/connect/upstream") {
    return integrationsUpstreamRoute;
  }
  if (pathname === "/app/endpoints") {
    return connectRegistryRoute;
  }
  if (pathname === "/app/endpoints/downstream") {
    return integrationsDownstreamRoute;
  }
  if (pathname === "/app/endpoints/upstream") {
    return integrationsUpstreamRoute;
  }
  if (pathname === "/app/observe") {
    return observeRequestsRoute;
  }
  if (pathname === "/app/observe/routing") {
    return observeRoutingRoute;
  }
  if (pathname === "/app/requests") {
    return observeRequestsRoute;
  }
  if (pathname.startsWith("/app/requests/")) {
    return observeRequestDetailRoute;
  }
  if (pathname.startsWith("/app/observe/requests/")) {
    return observeRequestDetailRoute;
  }
  if (pathname.startsWith("/app/router/decisions/")) {
    return routerDecisionDetailRoute;
  }
  return runtimeRouteDefinitions.find((route) => route.to === pathname);
}
