import {
  Activity,
  Boxes,
  Cable,
  Cpu,
  Gauge,
  GitBranch,
  Image,
  LayoutDashboard,
  ListChecks,
  Logs,
  Mic,
  PanelsTopLeft,
  Settings2,
  SlidersHorizontal,
  Speech,
  Telescope,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export type RuntimeLayoutTemplate =
  | "summary-board"
  | "studio-workspace"
  | "registry-detail"
  | "model-inventory"
  | "ledger-inspector"
  | "dual-console"
  | "contract-reference"
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
  description: "A telemetry-first overview of local and remote runtime posture, comparison rows, controller state, and recent request flow.",
  noteTitle: "Summary board",
  noteBody: "Lead with cross-vendor telemetry KPIs and comparison rows, then branch into Control, Observe, and Studio without duplicating detailed ledgers.",
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
  description: "Compose routed chat requests and inspect assistant output, tool calls, and execution receipts side by side.",
  noteTitle: "Studio workspace",
  noteBody: "Prompt composition stays compact while output, tooling activity, and runtime metadata occupy the dominant reading area.",
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
  description: "Image generation workspace for OpenAI-style and SDAPI-style request modes inside one repo-owned studio surface.",
  noteTitle: "Studio workspace",
  noteBody: "Keep OpenAI and SDAPI mode selection in the left rail, generated images in the dominant stage, and raw generation detail in the secondary inspector.",
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
  description: "Speech generation, voice discovery, and transcription share one audio workspace so the operator flow does not split into duplicate pages.",
  noteTitle: "Studio workspace",
  noteBody: "Use one mode-switched workspace for voices, uploads, transcripts, playable outputs, and request/result diagnostics.",
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
  description: "Ranked-input evaluation workspace for query, candidate, and ordered-score inspection without leaving the studio section.",
  noteTitle: "Studio workspace",
  noteBody: "Treat rerank output as a structured result ledger with compact input controls and a secondary raw payload inspector.",
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
  description: "Contract-and-request workspace for responses, messages, token counting, embeddings, completion, and infill families that stay under Studio.",
  noteTitle: "Studio workspace",
  noteBody: "Use this page as a family selector plus request/response workspace, not a miscellaneous dumping ground.",
});

const controlProvidersRoute = createRoute({
  id: "control-providers",
  to: "/app/control/providers",
  label: "Providers",
  section: "Control",
  icon: PanelsTopLeft,
  template: "registry-detail",
  eyebrow: "Control",
  title: "Provider onboarding",
  description: "Catalog-backed provider surfaces route directly into account setup, endpoint activation, and capability review.",
  noteTitle: "Registry detail",
  noteBody: "The left pane lists providers and variants; the right pane explains readiness, auth shape, and next steps.",
});

const controlAccountsRoute = createRoute({
  id: "control-accounts",
  to: "/app/control/accounts",
  label: "Accounts",
  section: "Control",
  icon: Settings2,
  template: "registry-detail",
  eyebrow: "Control",
  title: "Provider accounts",
  description: "Save API-key accounts, run device OAuth, and bind models to roles without exposing secrets.",
  noteTitle: "Registry detail",
  noteBody: "Forms stay compact and ledger-like; account state and diagnostics remain visible beside the editor.",
});

const controlRuntimeConfigRoute = createRoute({
  id: "control-runtime-config",
  to: "/app/control/runtime-config",
  label: "Runtime Config",
  section: "Control",
  icon: SlidersHorizontal,
  template: "registry-detail",
  eyebrow: "Control",
  title: "Runtime config",
  description: "Edit the unified runtime contract for local llama-swap models, remote LiteLLM providers, and process policy through one repo-owned route.",
  noteTitle: "Registry detail",
  noteBody: "Keep the editable config payload and the applied runtime snapshot adjacent so changes stay honest and inspectable.",
});

const controlControllerRoute = createRoute({
  id: "control-controller",
  to: "/app/control/controller",
  label: "Controller",
  section: "Control",
  icon: Waypoints,
  template: "registry-detail",
  eyebrow: "Control",
  title: "Routing controller",
  description: "Choose the concrete endpoint/model pair that acts as the global routing controller.",
  noteTitle: "Registry detail",
  noteBody: "The controller stays explicit and editable; candidate health, tooling posture, and source type remain visible.",
});

const controlEndpointsRoute = createRoute({
  id: "control-endpoints",
  to: "/app/control/endpoints",
  label: "Endpoints",
  section: "Control",
  icon: Cpu,
  template: "registry-detail",
  eyebrow: "Control",
  title: "Endpoint registry",
  description: "Activate runtime-managed endpoints and verify status, source type, and role bindings in one place.",
  noteTitle: "Registry detail",
  noteBody: "Treat endpoint creation and endpoint status as adjacent parts of one registry workflow.",
});

const controlModelsRoute = createRoute({
  id: "control-models",
  to: "/app/control/models",
  label: "Models",
  section: "Control",
  icon: Boxes,
  template: "model-inventory",
  eyebrow: "Control",
  title: "Configured models",
  description: "Unified local and remote model inventory with inspect-only cards, controller state, and explicit links back to the editable runtime config surface.",
  noteTitle: "Model inventory",
  noteBody: "Model cards stay observational unless a real persistence surface exists; editing belongs to Runtime Config or account onboarding.",
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
  description: "A preserved raw-host ledger for metrics, captures, tooling, and controller changes that stays adjacent to the canonical telemetry pages.",
  noteTitle: "Ledger inspector",
  noteBody: "Keep metrics and capture drill-ins inside the raw-host activity ledger rather than duplicating them in the canonical telemetry pages.",
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
  description: "Canonical runtime telemetry rows with direct drill-in to request captures, endpoint profile context, and tooling receipts.",
  noteTitle: "Ledger inspector",
  noteBody: "Optimize for scanability: source type, latency, tokens, endpoint, and tool activity should be immediately legible.",
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
  description: "Canonical telemetry detail with usage, cache, capture, endpoint profile, and tooling receipts aligned in one inspector.",
  noteTitle: "Ledger inspector",
  noteBody: "Lead with telemetry facts, then keep payloads and diagnostics side by side so routing and tool behavior can be audited together.",
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
  description: "Preserved log surfaces remain accessible from a repo-owned shell with a cleaner operator frame.",
  noteTitle: "Dual console",
  noteBody: "Use split consoles and clear labels; do not bury raw logs behind nested drawers.",
});

const integrationsDownstreamRoute = createRoute({
  id: "integrations-downstream",
  to: "/app/integrations/downstream",
  label: "Downstream",
  section: "Integrations",
  icon: Cable,
  template: "contract-reference",
  eyebrow: "Integrations",
  title: "Downstream provider contract",
  description: "Use Role Model as an OpenAI-compatible downstream provider and keep the compatibility matrix with the same contract instead of on a duplicate page.",
  noteTitle: "Contract reference",
  noteBody: "Base URL, auth expectations, model discovery, and tooling compatibility belong together.",
});

const integrationsUpstreamRoute = createRoute({
  id: "integrations-upstream",
  to: "/app/integrations/upstream",
  label: "Upstream",
  section: "Integrations",
  icon: GitBranch,
  template: "contract-reference",
  eyebrow: "Integrations",
  title: "Upstream providers",
  description: "Reference upstream passthrough boundaries, auth modes, and model-specific targets without duplicating the editable control surfaces.",
  noteTitle: "Contract reference",
  noteBody: "Keep the contract/reference column narrow, the target inventory larger, and raw upstream links contextual to this page.",
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
  description: "Bridge lifecycle, validation floor, controller posture, version facts, and tooling runtime contracts in one system view.",
  noteTitle: "System topology",
  noteBody: "Keep validation, version facts, preserved host links, and runtime-owned control-plane facts visible together.",
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
  description: "Peer inventory and policy page for remote model sources, auth posture, timeouts, filters, and peer-backed topology decisions.",
  noteTitle: "System topology",
  noteBody: "Lead with topology facts, then split peer inventory from contract detail and preserve a real empty state when no peers are configured.",
});

const runtimeRouteDefinitions = [
  overviewSummaryRoute,
  studioChatRoute,
  studioImagesRoute,
  studioAudioRoute,
  studioRerankRoute,
  studioAdvancedRoute,
  controlProvidersRoute,
  controlAccountsRoute,
  controlRuntimeConfigRoute,
  controlControllerRoute,
  controlEndpointsRoute,
  controlModelsRoute,
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
    title: "Control",
    icon: PanelsTopLeft,
      items: [
        controlProvidersRoute,
        controlAccountsRoute,
        controlRuntimeConfigRoute,
        controlControllerRoute,
        controlEndpointsRoute,
        controlModelsRoute,
    ],
  },
  {
    title: "Observe",
    icon: Activity,
    items: [observeActivityRoute, observeRequestsRoute, observeLogsRoute],
  },
  {
    title: "Integrations",
    icon: Cable,
    items: [integrationsDownstreamRoute, integrationsUpstreamRoute],
  },
  {
    title: "System",
    icon: Gauge,
    items: [systemRuntimeRoute, systemPeersRoute],
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
      accent: "#C8102E",
      accentMuted: "rgba(200, 16, 46, 0.60)",
      accentSubtle: "rgba(200, 16, 46, 0.20)",
      accentGhost: "rgba(200, 16, 46, 0.10)",
      telemetryLocal: "#1f2937",
      telemetryRemote: "#C8102E",
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
      telemetryLocal: "#d6d3d1",
      telemetryRemote: "#fb7185",
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

export const codeBlockClassName =
  "overflow-x-auto rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 text-xs leading-6 text-[var(--rm-secondary)]";

export const listRowClassName =
  "flex flex-col gap-3 rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 md:flex-row md:items-start md:justify-between";

export function getRuntimeRouteDefinition(pathname: string): RuntimeRouteDefinition | undefined {
  if (pathname === "/app/providers") {
    return controlProvidersRoute;
  }
  if (pathname === "/app/accounts") {
    return controlAccountsRoute;
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
  return runtimeRouteDefinitions.find((route) => route.to === pathname);
}
