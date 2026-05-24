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
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly noteTitle: string;
  readonly noteBody: string;
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
  eyebrow: "Overview",
  title: "Unified telemetry",
  description:
    "A telemetry-first overview of local and remote runtime posture, comparison rows, controller state, and recent request flow.",
  noteTitle: "Summary board",
  noteBody:
    "Lead with cross-vendor telemetry KPIs and comparison rows, then branch into Control, Observe, and Studio without duplicating detailed ledgers.",
});

const studioChatRoute = createRoute({
  id: "studio-chat",
  to: "/app/studio/chat",
  label: "Chat",
  section: "Studio",
  icon: Speech,
  template: "studio-workspace",
  eyebrow: "Studio",
  title: "Chat workspace",
  description:
    "Compose routed chat requests and inspect assistant output, tool calls, and execution receipts side by side.",
  noteTitle: "Studio workspace",
  noteBody:
    "Prompt composition stays compact while output, tooling activity, and runtime metadata occupy the dominant reading area.",
});

const studioImagesRoute = createRoute({
  id: "studio-images",
  to: "/app/studio/images",
  label: "Images",
  section: "Studio",
  icon: Image,
  template: "studio-workspace",
  eyebrow: "Studio",
  title: "Image workflows",
  description:
    "Image generation workspace for OpenAI-style and SDAPI-style request modes inside one repo-owned studio surface.",
  noteTitle: "Studio workspace",
  noteBody:
    "Keep OpenAI and SDAPI mode selection in the left rail, generated images in the dominant stage, and raw generation detail in the secondary inspector.",
});

const studioAudioRoute = createRoute({
  id: "studio-audio",
  to: "/app/studio/audio",
  label: "Audio",
  section: "Studio",
  icon: Mic,
  template: "studio-workspace",
  eyebrow: "Studio",
  title: "Audio workflows",
  description:
    "Speech generation, voice discovery, and transcription share one audio workspace so the operator flow does not split into duplicate pages.",
  noteTitle: "Studio workspace",
  noteBody:
    "Use one mode-switched workspace for voices, uploads, transcripts, playable outputs, and request/result diagnostics.",
});

const studioRerankRoute = createRoute({
  id: "studio-rerank",
  to: "/app/studio/rerank",
  label: "Rerank",
  section: "Studio",
  icon: SlidersHorizontal,
  template: "studio-workspace",
  eyebrow: "Studio",
  title: "Rerank",
  description:
    "Ranked-input evaluation workspace for query, candidate, and ordered-score inspection without leaving the studio section.",
  noteTitle: "Studio workspace",
  noteBody:
    "Treat rerank output as a structured result ledger with compact input controls and a secondary raw payload inspector.",
});

const studioAdvancedRoute = createRoute({
  id: "studio-advanced",
  to: "/app/studio/advanced",
  label: "Advanced APIs",
  section: "Studio",
  icon: Telescope,
  template: "studio-workspace",
  eyebrow: "Studio",
  title: "Advanced APIs",
  description:
    "Contract-and-request workspace for responses, messages, token counting, embeddings, completion, and infill families that stay under Studio.",
  noteTitle: "Studio workspace",
  noteBody:
    "Use this page as a family selector plus request/response workspace, not a miscellaneous dumping ground.",
});

const localModelsRoute = createRoute({
  id: "local-models",
  to: "/app/local/models",
  label: "Models",
  section: "Local",
  icon: Cpu,
  template: "registry-detail",
  eyebrow: "Local",
  title: "Local models",
  description: "Load and inspect llama-swap-managed local models and runtime overrides.",
  noteTitle: "Registry detail",
  noteBody:
    "Lead with the load-model entry point, then keep loaded model cards and overrides visible.",
});

const localSwapRoute = createRoute({
  id: "local-swap",
  to: "/app/local/swap",
  label: "Swap history",
  section: "Local",
  icon: Activity,
  template: "ledger-inspector",
  eyebrow: "Local",
  title: "Swap history",
  description: "Chronological log of model swap events.",
  noteTitle: "Ledger inspector",
  noteBody: "Event list primary, event detail secondary; filter by model ID.",
});

const localPolicyRoute = createRoute({
  id: "local-policy",
  to: "/app/local/policy",
  label: "Policy",
  section: "Local",
  icon: SlidersHorizontal,
  template: "registry-detail",
  eyebrow: "Local",
  title: "Host policy",
  description: "Local inference runtime policy: TTL, auto-unload, and resource limits.",
  noteTitle: "Registry detail",
  noteBody: "Editable policy form with read-only host awareness fields.",
});

const localLogsRoute = createRoute({
  id: "local-logs",
  to: "/app/local/logs",
  label: "Logs",
  section: "Local",
  icon: Terminal,
  template: "dual-console",
  eyebrow: "Local",
  title: "Log streaming",
  description: "Real-time log stream from the local llama-swap runtime.",
  noteTitle: "Dual console",
  noteBody: "Split proxy and upstream consoles with source toggle and auto-scroll.",
});

const localMatrixRoute = createRoute({
  id: "local-matrix",
  to: "/app/local/matrix",
  label: "Matrix",
  section: "Local",
  icon: LayoutGrid,
  template: "matrix-grid",
  eyebrow: "Local",
  title: "Model matrix",
  description: "Concurrent model grid showing loaded state, engine, and resource usage.",
  noteTitle: "Matrix grid",
  noteBody: "Status-first cells with resource metrics; add/remove controls.",
});

const localPeersRoute = createRoute({
  id: "local-endpoints",
  to: "/app/local/endpoints",
  label: "Endpoints",
  section: "Local",
  icon: Network,
  template: "registry-detail",
  eyebrow: "Local",
  title: "Local endpoints",
  description: "Generic OpenAI-compatible local peer endpoint inventory and management.",
  noteTitle: "Registry detail",
  noteBody: "Endpoint list with health and model availability; add/remove controls stay obvious.",
});

const controlProvidersRoute = createRoute({
  id: "remote-providers",
  to: "/app/remote/providers",
  label: "Providers",
  section: "Remote",
  icon: PanelsTopLeft,
  template: "registry-detail",
  eyebrow: "Remote",
  title: "Remote providers",
  description:
    "Choose a LiteLLM-backed provider, select the models available for that provider, and complete setup from one onboarding surface.",
  noteTitle: "Registry detail",
  noteBody:
    "Lead with provider selection and model availability; API-key and OAuth setup stay in the same workflow instead of splitting into a second page.",
});

const controlRoutingStrategyRoute = createRoute({
  id: "router-strategy",
  to: "/app/router/strategy",
  label: "Routing Strategy",
  section: "Router",
  icon: GitBranch,
  template: "registry-detail",
  eyebrow: "Router",
  title: "Routing strategy",
  description:
    "Editable routing posture for the persisted scoring strategy and execution mode, with controller context and direct verification links.",
  noteTitle: "Registry detail",
  noteBody:
    "Lead with an explicit strategy editor, keep the currently applied posture visible, and preserve direct links into controller, router, and request verification surfaces.",
});

const controlRuntimeConfigRoute = createRoute({
  id: "system-runtime-config",
  to: "/app/system/runtime-config",
  label: "Runtime Config",
  section: "System",
  icon: SlidersHorizontal,
  template: "registry-detail",
  eyebrow: "System",
  title: "Runtime config",
  description:
    "Edit the unified runtime contract for local llama-swap models, remote LiteLLM providers, and process policy through one repo-owned route.",
  noteTitle: "Registry detail",
  noteBody:
    "Keep the editable config payload and the applied runtime snapshot adjacent so changes stay honest and inspectable.",
});

const controlControllerRoute = createRoute({
  id: "router-controller",
  to: "/app/router/controller",
  label: "Controller",
  section: "Router",
  icon: Waypoints,
  template: "registry-detail",
  eyebrow: "Router",
  title: "Routing controller",
  description:
    "Choose the concrete endpoint/model pair that acts as the global routing controller.",
  noteTitle: "Registry detail",
  noteBody:
    "The controller stays explicit and editable; candidate health, tooling posture, and source type remain visible.",
});

const controlEndpointsRoute = createRoute({
  id: "endpoints-overview",
  to: "/app/endpoints",
  label: "Endpoints",
  section: "Endpoints",
  icon: Cpu,
  template: "registry-detail",
  eyebrow: "Endpoints",
  title: "Endpoint registry",
  description:
    "Review configured providers, models, and runtime endpoint status after onboarding without duplicating provider setup here.",
  noteTitle: "Registry detail",
  noteBody:
    "Treat this page as the live configured registry for provider-model runtime entries, with health and source posture kept visible.",
});

const controlRolesRoute = createRoute({
  id: "models-roles",
  to: "/app/models/roles",
  label: "Roles",
  section: "Models",
  icon: LayoutGrid,
  template: "registry-detail",
  eyebrow: "Models",
  title: "Runtime roles",
  description:
    "Author full router-grade role definitions and task allowlists from the live runtime policy surface instead of relying on seeded role catalogs.",
  noteTitle: "Registry detail",
  noteBody:
    "Keep role authoring, task allowlists, and policy diagnostics in one editable surface so operators can add roles without leaving the control plane.",
});

const controlModelsRoute = createRoute({
  id: "models-inventory",
  to: "/app/models",
  label: "Models",
  section: "Models",
  icon: Boxes,
  template: "model-inventory",
  eyebrow: "Models",
  title: "Configured models",
  description:
    "Unified local and remote model inventory with model-side role assignment, controller state, and links into the live runtime policy surface.",
  noteTitle: "Model inventory",
  noteBody:
    "Lead with live model posture, then expose backing-account role bindings so role assignment is editable without sending operators back to provider onboarding.",
});

const routerOverviewRoute = createRoute({
  id: "router-overview",
  to: "/app/router",
  label: "Overview",
  section: "Router",
  icon: GitBranch,
  template: "registry-detail",
  eyebrow: "Router",
  title: "Routing overview",
  description:
    "First-class operator summary for routing posture, decision flow, and the live handoff between config, candidates, and request outcomes.",
  noteTitle: "Registry detail",
  noteBody:
    "Lead with the current routing posture and recent decision movement so the Router section reads as explanation, not raw trace replay.",
});

const routerConfigRoute = createRoute({
  id: "router-config",
  to: "/app/router/config",
  label: "Config",
  section: "Router",
  icon: SlidersHorizontal,
  template: "registry-detail",
  eyebrow: "Router",
  title: "Routing config",
  description:
    "Read-only routing provenance surface spanning persisted posture, controller context, guidance, and policy-source inputs.",
  noteTitle: "Registry detail",
  noteBody:
    "Keep editing on the dedicated Routing strategy page so this surface stays focused on provenance, guidance, and policy resolution.",
});

const routerCandidatesRoute = createRoute({
  id: "router-candidates",
  to: "/app/router/candidates",
  label: "Candidates",
  section: "Router",
  icon: Network,
  template: "ledger-inspector",
  eyebrow: "Router",
  title: "Candidate inventory",
  description:
    "Comparable local and remote endpoint inventory with health, role coverage, and observed routing signals in one operator surface.",
  noteTitle: "Ledger inspector",
  noteBody:
    "Optimize for scanability first, then expose richer per-candidate posture without splitting local and remote inventory into separate pages.",
});

const routerDecisionsRoute = createRoute({
  id: "router-decisions",
  to: "/app/router/decisions",
  label: "Decisions",
  section: "Router",
  icon: ListChecks,
  template: "ledger-inspector",
  eyebrow: "Router",
  title: "Routing decisions",
  description:
    "Explainable routing ledger keyed by recent requests with direct drill-in to chosen endpoint, fallback posture, and policy summary.",
  noteTitle: "Ledger inspector",
  noteBody:
    "Keep the decision ledger scannable and make the drill-in path explicit instead of forcing users through raw request detail first.",
});

const routerDecisionDetailRoute = createRoute({
  id: "router-decision-detail",
  to: "/app/router/decisions/:requestId",
  label: "Decision detail",
  section: "Router",
  icon: ListChecks,
  template: "ledger-inspector",
  eyebrow: "Router",
  title: "Routing decision detail",
  description:
    "Explainable routing detail for one request, including scored candidates, routing diagnostics, and links into Observe request traces.",
  noteTitle: "Ledger inspector",
  noteBody:
    "Expose scored candidates, provenance, and downstream trace links together so Router remains the explanation surface and Observe stays the deep inspector.",
});

const observeActivityRoute = createRoute({
  id: "observe-activity",
  to: "/app/observe/activity",
  label: "Activity",
  section: "Observe",
  icon: Activity,
  template: "ledger-inspector",
  eyebrow: "Observe",
  title: "Host activity and metrics",
  description:
    "A preserved raw-host ledger for metrics, captures, tooling, and controller changes that stays adjacent to the canonical telemetry pages.",
  noteTitle: "Ledger inspector",
  noteBody:
    "Keep metrics and capture drill-ins inside the raw-host activity ledger rather than duplicating them in the canonical telemetry pages.",
});

const observeRequestsRoute = createRoute({
  id: "observe-requests",
  to: "/app/observe/requests",
  label: "Requests",
  section: "Observe",
  icon: ListChecks,
  template: "ledger-inspector",
  eyebrow: "Observe",
  title: "Telemetry request ledger",
  description:
    "Canonical runtime telemetry rows with direct drill-in to request captures, endpoint profile context, and tooling receipts.",
  noteTitle: "Ledger inspector",
  noteBody:
    "Optimize for scanability: source type, latency, tokens, endpoint, and tool activity should be immediately legible.",
});

const observeRequestDetailRoute = createRoute({
  id: "observe-request-detail",
  to: "/app/observe/requests/:requestId",
  label: "Request detail",
  section: "Observe",
  icon: ListChecks,
  template: "ledger-inspector",
  eyebrow: "Observe",
  title: "Telemetry request detail",
  description:
    "Canonical telemetry detail with usage, cache, capture, endpoint profile, and tooling receipts aligned in one inspector.",
  noteTitle: "Ledger inspector",
  noteBody:
    "Lead with telemetry facts, then keep payloads and diagnostics side by side so routing and tool behavior can be audited together.",
});

const observeLogsRoute = createRoute({
  id: "observe-logs",
  to: "/app/observe/logs",
  label: "Logs",
  section: "Observe",
  icon: Logs,
  template: "dual-console",
  eyebrow: "Observe",
  title: "Logs",
  description:
    "Preserved log surfaces remain accessible from a repo-owned shell with a cleaner operator frame.",
  noteTitle: "Dual console",
  noteBody: "Use split consoles and clear labels; do not bury raw logs behind nested drawers.",
});

const integrationsDownstreamRoute = createRoute({
  id: "endpoints-downstream",
  to: "/app/endpoints/downstream",
  label: "Downstream",
  section: "Endpoints",
  icon: Cable,
  template: "contract-reference",
  eyebrow: "Endpoints",
  title: "Downstream provider contract",
  description:
    "Use Role Model as an OpenAI-compatible downstream provider and keep the compatibility matrix with the same contract instead of on a duplicate page.",
  noteTitle: "Contract reference",
  noteBody:
    "Base URL, auth expectations, model discovery, and tooling compatibility belong together.",
});

const integrationsUpstreamRoute = createRoute({
  id: "endpoints-upstream",
  to: "/app/endpoints/upstream",
  label: "Upstream",
  section: "Endpoints",
  icon: GitBranch,
  template: "contract-reference",
  eyebrow: "Endpoints",
  title: "Upstream providers",
  description:
    "Reference upstream passthrough boundaries, auth modes, and model-specific targets without duplicating the editable control surfaces.",
  noteTitle: "Contract reference",
  noteBody:
    "Keep the contract/reference column narrow, the target inventory larger, and raw upstream links contextual to this page.",
});

const systemRuntimeRoute = createRoute({
  id: "system-runtime",
  to: "/app/system/runtime",
  label: "Runtime",
  section: "System",
  icon: Gauge,
  template: "system-topology",
  eyebrow: "System",
  title: "Runtime topology",
  description:
    "Bridge lifecycle, validation floor, controller posture, version facts, and tooling runtime contracts in one system view.",
  noteTitle: "System topology",
  noteBody:
    "Keep validation, version facts, preserved host links, and runtime-owned control-plane facts visible together.",
});

const systemPeersRoute = createRoute({
  id: "system-peers",
  to: "/app/system/peers",
  label: "Peers",
  section: "System",
  icon: Waypoints,
  template: "system-topology",
  eyebrow: "System",
  title: "Peers",
  description:
    "Peer inventory and policy page for remote model sources, auth posture, timeouts, filters, and peer-backed topology decisions.",
  noteTitle: "System topology",
  noteBody:
    "Lead with topology facts, then split peer inventory from contract detail and preserve a real empty state when no peers are configured.",
});

const runtimeRouteDefinitions = [
  overviewSummaryRoute,
  studioChatRoute,
  studioImagesRoute,
  studioAudioRoute,
  studioRerankRoute,
  studioAdvancedRoute,
  localModelsRoute,
  localSwapRoute,
  localPolicyRoute,
  localLogsRoute,
  localMatrixRoute,
  localPeersRoute,
  controlProvidersRoute,
  controlRoutingStrategyRoute,
  controlRuntimeConfigRoute,
  controlControllerRoute,
  controlEndpointsRoute,
  controlRolesRoute,
  controlModelsRoute,
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
      localModelsRoute,
      localPeersRoute,
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
    items: [controlModelsRoute, controlRolesRoute],
  },
  {
    title: "Router",
    icon: GitBranch,
    items: [
      routerOverviewRoute,
      controlRoutingStrategyRoute,
      controlControllerRoute,
      routerConfigRoute,
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
    title: "Endpoints",
    icon: Cable,
    items: [controlEndpointsRoute, integrationsDownstreamRoute, integrationsUpstreamRoute],
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
  "inline-flex min-h-[44px] items-center justify-center rounded-none border border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] px-4 py-2 text-sm font-medium tracking-wide text-[var(--rm-fg)] transition hover:border-[var(--rm-fg)]";

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
    return controlEndpointsRoute;
  }
  if (pathname === "/app/control/roles") {
    return controlRolesRoute;
  }
  if (pathname === "/app/control/models") {
    return controlModelsRoute;
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
  if (pathname === "/app/endpoints") {
    return controlEndpointsRoute;
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
