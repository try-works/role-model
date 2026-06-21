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
  title: "Image workflows",
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
  title: "Audio workflows",
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
  title: "Rerank",
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
  title: "Advanced APIs",
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
  label: "Routing Strategy",
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
  label: "Runtime Config",
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

const routerConfigRoute = createRoute({
  id: "router-config",
  to: "/app/router/config",
  label: "Config",
  section: "Router",
  icon: SlidersHorizontal,
  template: "registry-detail",
  title: "Routing config",
  description:
    "Read-only routing provenance surface spanning persisted posture, controller context, guidance, and policy-source inputs.",
});

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
    "Canonical runtime telemetry rows with direct drill-in to request captures, endpoint profile context, and tooling receipts.",
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
    "Canonical telemetry detail with usage, cache, capture, endpoint profile, and tooling receipts aligned in one inspector.",
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
  label: "Session readiness",
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
  title: "Peers",
  description:
    "Peer inventory and policy page for remote model sources, auth posture, timeouts, filters, and peer-backed topology decisions.",
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
  routerConfigRoute,
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
    ],
  },
] as const;

export const runtimeTheme = {
  maxContentWidth: "1440px",
  radii: {
    sm: "8px",
    md: "11px",
    lg: "18px",
    pill: "9999px",
    shell: "18px",
    panel: "18px",
    field: "11px",
    badge: "9999px",
  },
  colors: {
    light: {
      bg: "#f5f5f7",
      surface: "#ffffff",
      surfaceStrong: "#ffffff",
      panel: "#fafafc",
      fg: "#1d1d1f",
      secondary: "rgba(29, 29, 31, 0.72)",
      muted: "rgba(29, 29, 31, 0.48)",
      border: "#e0e0e0",
      borderStrong: "#d2d2d7",
      accent: "#0066CC",
      accentFocus: "#0071E3",
      accentOnDark: "#2997FF",
      accentMuted: "rgba(0, 102, 204, 0.72)",
      accentSubtle: "rgba(0, 102, 204, 0.14)",
      accentGhost: "rgba(0, 102, 204, 0.08)",
      dividerSoft: "#f0f0f0",
      hairline: "#e0e0e0",
      chipTranslucent: "rgba(210, 210, 215, 0.64)",
      telemetryLocal: "#1d1d1f",
      telemetryRemote: "#0066CC",
      telemetryHealthy: "#166534",
      telemetryDegraded: "#b45309",
      telemetryRaw: "#7a7a7a",
      error: "#C8102E",
      errorMuted: "rgba(200, 16, 46, 0.72)",
      errorSubtle: "rgba(200, 16, 46, 0.14)",
      errorGhost: "rgba(200, 16, 46, 0.08)",
      success: "#166534",
      successMuted: "rgba(22, 101, 52, 0.72)",
      successSubtle: "rgba(22, 101, 52, 0.14)",
      warning: "#b45309",
      warningMuted: "rgba(180, 83, 9, 0.72)",
      warningSubtle: "rgba(180, 83, 9, 0.14)",
    },
    dark: {
      bg: "#000000",
      surface: "#272729",
      surfaceStrong: "#2a2a2c",
      panel: "#252527",
      fg: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.72)",
      muted: "rgba(255, 255, 255, 0.48)",
      border: "rgba(255, 255, 255, 0.12)",
      borderStrong: "rgba(255, 255, 255, 0.18)",
      accent: "#0066CC",
      accentFocus: "#0071E3",
      accentOnDark: "#2997FF",
      accentMuted: "rgba(0, 102, 204, 0.72)",
      accentSubtle: "rgba(41, 151, 255, 0.18)",
      accentGhost: "rgba(41, 151, 255, 0.10)",
      dividerSoft: "rgba(255, 255, 255, 0.1)",
      hairline: "rgba(255, 255, 255, 0.12)",
      chipTranslucent: "rgba(210, 210, 215, 0.24)",
      telemetryLocal: "#FFFFFF",
      telemetryRemote: "#2997FF",
      telemetryHealthy: "#86efac",
      telemetryDegraded: "#fbbf24",
      telemetryRaw: "#cccccc",
      error: "#FB7185",
      errorMuted: "rgba(251, 113, 133, 0.72)",
      errorSubtle: "rgba(251, 113, 133, 0.18)",
      errorGhost: "rgba(251, 113, 133, 0.10)",
      success: "#86EFAC",
      successMuted: "rgba(134, 239, 172, 0.72)",
      successSubtle: "rgba(134, 239, 172, 0.18)",
      warning: "#FBBF24",
      warningMuted: "rgba(251, 191, 36, 0.72)",
      warningSubtle: "rgba(251, 191, 36, 0.18)",
    },
  },
} as const;

export const chartColors = {
  local: "var(--rm-chart-local)",
  remote: "var(--rm-chart-remote)",
  tokens: "var(--rm-chart-tokens)",
  cacheHit: "var(--rm-chart-cache-hit)",
  cacheRate: "var(--rm-chart-cache-rate)",
  latency: "var(--rm-chart-latency)",
  cost: "var(--rm-chart-cost)",
  failure: "var(--rm-chart-failure)",
  success: "var(--rm-chart-success)",
  neutral1: "var(--rm-chart-neutral-1)",
  neutral2: "var(--rm-chart-neutral-2)",
  ink: "var(--rm-chart-ink)",
  cyan: "var(--rm-chart-cyan)",
  highlightPink: "var(--rm-chart-highlight-pink)",
  violet: "var(--rm-chart-violet)",
  linkBlue: "var(--rm-chart-link-blue)",
  linkDeep: "var(--rm-chart-link-deep)",
  linkSoft: "var(--rm-chart-link-soft)",
  error: "var(--rm-chart-error)",
  errorDeep: "var(--rm-chart-error-deep)",
  errorSoft: "var(--rm-chart-error-soft)",
  warning: "var(--rm-chart-warning)",
  warningDeep: "var(--rm-chart-warning-deep)",
  warningSoft: "var(--rm-chart-warning-soft)",
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

export const eyebrowClassName =
  "text-[11px] font-normal uppercase tracking-[0.24em] text-[var(--rm-muted)]";

export const navLabelClassName = "text-[15px] font-normal leading-[20px] tracking-[-0.016em]";

export const utilityLabelClassName = "text-[14px] font-normal leading-[18px] tracking-[-0.016em]";

export const bodyTextClassName = "text-[17px] font-normal leading-[25px] tracking-[-0.022em]";

export const bodyStrongTextClassName =
  "text-[17px] font-semibold leading-[21px] tracking-[-0.022em]";

export const displayTitleClassName =
  "[font-family:var(--rm-font-display)] text-[34px] font-semibold leading-[40px] tracking-[-0.022em]";

export const sectionTitleClassName =
  "[font-family:var(--rm-font-display)] text-[21px] font-semibold leading-[25px] tracking-[0.011em]";

export const largeValueClassName =
  "[font-family:var(--rm-font-display)] text-[28px] font-normal leading-8 tracking-[0.007em] md:text-[34px] md:leading-[40px] md:tracking-[-0.022em]";

export const fieldClassName =
  "w-full rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] px-[20px] py-3 text-[17px] font-normal leading-[25px] tracking-[-0.022em] text-[var(--rm-fg)] outline-none transition placeholder:text-[var(--rm-muted)] focus:border-[var(--rm-accent-focus)] focus:ring-2 focus:ring-[var(--rm-accent-subtle)]";

export const selectFieldClassName =
  "w-full min-h-[44px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] py-2 pl-[20px] pr-10 text-[17px] font-normal leading-[25px] tracking-[-0.022em] text-[var(--rm-fg)] outline-none transition focus:border-[var(--rm-accent-focus)] focus:ring-2 focus:ring-[var(--rm-accent-subtle)]";

export const selectChevronStyle = {
  appearance: "none",
  backgroundImage: "var(--rm-select-chevron)",
  backgroundPosition: "right 16px center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "12px 8px",
} as const;

export const primaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-[var(--rm-radius-pill)] border border-[var(--rm-accent)] bg-[var(--rm-accent)] px-[22px] py-[11px] text-[17px] font-normal leading-[17px] tracking-[-0.022em] text-[var(--rm-on-primary)] transition hover:border-[var(--rm-accent-focus)] hover:bg-[var(--rm-accent-focus)] active:scale-95 disabled:opacity-60";

export const secondaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-[var(--rm-radius-pill)] border border-[var(--rm-border-strong)] bg-[var(--rm-panel)] px-[22px] py-[11px] text-[17px] font-normal leading-[17px] tracking-[-0.022em] text-[var(--rm-accent-ink)] transition hover:border-[var(--rm-accent)] hover:bg-[var(--rm-accent-ghost)] hover:text-[var(--rm-accent-ink)] active:scale-95 disabled:opacity-60";

export const utilityButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-[var(--rm-radius-md)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-[15px] py-2 text-[14px] font-normal leading-[18px] tracking-[-0.016em] text-[var(--rm-fg)] transition hover:border-[var(--rm-border-strong)] hover:bg-[var(--rm-panel)]";

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
