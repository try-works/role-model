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
  title: "Unified telemetry",
  description:
    "A telemetry-first overview of local and remote runtime posture, comparison rows, controller state, and recent request flow.",
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
  description: "Register OpenAI-compatible servers you operate. Required before loading peer models.",
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
  title: "Logs",
  description:
    "Preserved log surfaces remain accessible from a repo-owned shell with a cleaner operator frame.",
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
  observeLogsRoute,
  integrationsDownstreamRoute,
  integrationsUpstreamRoute,
  systemRuntimeRoute,
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
    items: [observeActivityRoute, observeRequestsRoute, observeLogsRoute],
  },
  {
    title: "Connect",
    icon: Cable,
    items: [connectRegistryRoute, integrationsDownstreamRoute, integrationsUpstreamRoute],
  },
  {
    title: "System",
    icon: Gauge,
    items: [systemRuntimeRoute, controlRuntimeConfigRoute, systemPeersRoute],
  },
] as const;

export const runtimeTheme = {
  maxContentWidth: "1480px",
  radii: {
    shell: "0px",
    panel: "0px",
    field: "0px",
    badge: "0px",
  },
  colors: {
    light: {
      bg: "#fafaf9",
      surface: "#f5f5f4",
      surfaceStrong: "#f5f5f4",
      panel: "#e7e5e4",
      fg: "#1c1917",
      secondary: "rgba(28, 25, 23, 0.70)",
      muted: "rgba(28, 25, 23, 0.40)",
      border: "#e7e5e4",
      borderStrong: "#f5f5f4",
      accent: "#003B8E",
      accentMuted: "rgba(0, 59, 142, 0.60)",
      accentSubtle: "rgba(0, 59, 142, 0.20)",
      accentGhost: "rgba(0, 59, 142, 0.10)",
      error: "#C8102E",
      errorMuted: "rgba(200, 16, 46, 0.60)",
      errorSubtle: "rgba(200, 16, 46, 0.20)",
      errorGhost: "rgba(200, 16, 46, 0.10)",
      success: "#166534",
      successMuted: "rgba(22, 101, 52, 0.60)",
      successSubtle: "rgba(22, 101, 52, 0.20)",
      warning: "#b45309",
      warningMuted: "rgba(180, 83, 9, 0.60)",
      telemetryLocal: "#1f2937",
      telemetryRemote: "#003B8E",
      telemetryHealthy: "#166534",
      telemetryDegraded: "#b45309",
      telemetryRaw: "#57534e",
    },
    dark: {
      bg: "#0c0a09",
      surface: "#1c1917",
      surfaceStrong: "#1c1917",
      panel: "#292524",
      fg: "#fafaf9",
      secondary: "rgba(250, 250, 249, 0.70)",
      muted: "rgba(250, 250, 249, 0.40)",
      border: "#292524",
      borderStrong: "#1c1917",
      accent: "#60a5fa",
      accentMuted: "rgba(96, 165, 250, 0.60)",
      accentSubtle: "rgba(96, 165, 250, 0.20)",
      accentGhost: "rgba(96, 165, 250, 0.10)",
      error: "#fb7185",
      errorMuted: "rgba(251, 113, 133, 0.60)",
      errorSubtle: "rgba(251, 113, 133, 0.20)",
      errorGhost: "rgba(251, 113, 133, 0.10)",
      success: "#86efac",
      successMuted: "rgba(134, 239, 172, 0.60)",
      successSubtle: "rgba(134, 239, 172, 0.20)",
      warning: "#fbbf24",
      warningMuted: "rgba(251, 191, 36, 0.60)",
      telemetryLocal: "#d6d3d1",
      telemetryRemote: "#60a5fa",
      telemetryHealthy: "#86efac",
      telemetryDegraded: "#fbbf24",
      telemetryRaw: "#a8a29e",
    },
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
  "rounded-none border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-[var(--rm-shadow-card)]";

export const raisedPanelClassName =
  "rounded-none border border-[var(--rm-border)] bg-[var(--rm-surface-strong)]";

export const mutedPanelClassName =
  "rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)]";

export const fieldClassName =
  "w-full rounded-none border border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] px-3 py-2.5 text-sm text-[var(--rm-fg)] shadow-sm outline-none transition placeholder:text-[var(--rm-muted)] focus:border-[var(--rm-accent)] focus:ring-2 focus:ring-[var(--rm-accent-subtle)]";

export const primaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-none border border-[var(--rm-accent)] bg-[var(--rm-accent)] px-4 py-2 text-sm font-medium tracking-wide text-[var(--rm-bg)] transition hover:border-[color:var(--rm-accent-muted)] hover:bg-[color:var(--rm-accent-muted)] disabled:opacity-60";

export const secondaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-none border border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] px-4 py-2 text-sm font-medium tracking-wide text-[var(--rm-fg)] shadow-sm transition hover:border-[var(--rm-fg)]";

export function getSelectablePanelClassName(selected: boolean): string {
  return [
    "w-full rounded-none border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rm-accent-subtle)]",
    selected
      ? "border-[var(--rm-accent)] bg-[var(--rm-accent-ghost)] text-[var(--rm-fg)]"
      : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-secondary)] hover:border-[var(--rm-fg)]",
  ].join(" ");
}

export const codeBlockClassName =
  "overflow-x-auto rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 text-xs leading-6 text-[var(--rm-secondary)]";

export const listRowClassName =
  "flex flex-col gap-3 rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 md:flex-row md:items-start md:justify-between";

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
