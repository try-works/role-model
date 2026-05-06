import { Activity, Cpu, LayoutDashboard, ListChecks, PanelsTopLeft, Settings2, Workflow, type LucideIcon } from "lucide-react";

export type RuntimeLayoutTemplate =
  | "overview-grid"
  | "catalog-grid"
  | "split-form-ledger"
  | "composer-result"
  | "request-ledger"
  | "detail-inspector"
  | "system-contract";

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
  readonly items: readonly RuntimeRouteDefinition[];
}

const dashboardRoute: RuntimeRouteDefinition = {
  id: "dashboard",
  to: "/app",
  label: "Dashboard",
  section: "Operate",
  icon: LayoutDashboard,
  template: "overview-grid",
  eyebrow: "Dashboard",
  title: "Runtime overview",
  description: "Status, onboarding posture, and recent activity in a single operator surface.",
  noteTitle: "Overview grid",
  noteBody: "Lead with runtime counts, then split into recent inspection activity and provider readiness.",
};

const providersRoute: RuntimeRouteDefinition = {
  id: "providers",
  to: "/app/providers",
  label: "Providers",
  section: "Configure",
  icon: PanelsTopLeft,
  template: "catalog-grid",
  eyebrow: "Providers",
  title: "Provider onboarding",
  description: "Catalog-backed provider variants should route directly into account setup and endpoint activation.",
  noteTitle: "Catalog grid",
  noteBody: "Each provider is a compact dossier: auth modes, variants, OAuth metadata, and direct follow-on actions.",
};

const accountsRoute: RuntimeRouteDefinition = {
  id: "accounts",
  to: "/app/accounts",
  label: "Accounts",
  section: "Configure",
  icon: Settings2,
  template: "split-form-ledger",
  eyebrow: "Accounts",
  title: "Provider accounts",
  description: "Create accounts, bind models to roles, and manage Kimi device authorization without exposing secrets.",
  noteTitle: "Form + ledger",
  noteBody: "The left rail collects changes. The right rail shows live account state and the current OAuth session.",
};

const endpointsRoute: RuntimeRouteDefinition = {
  id: "endpoints",
  to: "/app/endpoints",
  label: "Endpoints",
  section: "Configure",
  icon: Cpu,
  template: "split-form-ledger",
  eyebrow: "Endpoints",
  title: "Endpoint registry",
  description: "Activate runtime-managed endpoints from configured accounts and verify they enter the registry immediately.",
  noteTitle: "Activation workflow",
  noteBody: "Keep the activation form beside the live registry so operators can confirm the effect of each change instantly.",
};

const workbenchRoute: RuntimeRouteDefinition = {
  id: "workbench",
  to: "/app/workbench",
  label: "Workbench",
  section: "Operate",
  icon: Workflow,
  template: "composer-result",
  eyebrow: "Workbench",
  title: "Runtime workbench",
  description: "Compose a routed chat request and inspect the returned assistant output or raw payload side-by-side.",
  noteTitle: "Composer + result",
  noteBody: "Inputs stay concise and structured; output gets the dominant reading column.",
};

const requestsRoute: RuntimeRouteDefinition = {
  id: "requests",
  to: "/app/requests",
  label: "Requests",
  section: "Inspect",
  icon: ListChecks,
  template: "request-ledger",
  eyebrow: "Requests",
  title: "Request ledger",
  description: "A scan-friendly ledger of structured runtime requests with direct drill-in to request detail.",
  noteTitle: "Ledger view",
  noteBody: "Treat the request list like an operator logbook: dense, linkable, and optimized for quick comparison.",
};

const requestDetailRoute: RuntimeRouteDefinition = {
  id: "request-detail",
  to: "/app/requests/:requestId",
  label: "Request detail",
  section: "Inspect",
  icon: ListChecks,
  template: "detail-inspector",
  eyebrow: "Request inspector",
  title: "Request detail",
  description: "Show the captured request artifact beside the linked endpoint profile with no extra decoration.",
  noteTitle: "Dual inspector",
  noteBody: "Pair the request payload and endpoint profile in equal-weight panes so operators can compare them line-by-line.",
};

const runtimeRoute: RuntimeRouteDefinition = {
  id: "runtime",
  to: "/app/runtime",
  label: "Runtime",
  section: "Inspect",
  icon: Activity,
  template: "system-contract",
  eyebrow: "Runtime",
  title: "Bridge and host summary",
  description: "Summarize host lifecycle state, preserved diagnostics, and the downstream OpenAI-compatible provider contract.",
  noteTitle: "System contract",
  noteBody: "Keep lifecycle counts, preserved host links, and downstream-provider setup in one technical reference page.",
};

const runtimeRouteDefinitions = [
  dashboardRoute,
  providersRoute,
  accountsRoute,
  endpointsRoute,
  workbenchRoute,
  requestsRoute,
  runtimeRoute,
] as const;

export const runtimeNavigationSections: readonly RuntimeNavigationSection[] = [
  {
    title: "Operate",
    items: [dashboardRoute, workbenchRoute],
  },
  {
    title: "Configure",
    items: [providersRoute, accountsRoute, endpointsRoute],
  },
  {
    title: "Inspect",
    items: [requestsRoute, runtimeRoute],
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
} as const;

export const shellQuickLinks = [
  { label: "Runtime JSON", href: "/api/role-model/runtime/summary" },
  { label: "Providers JSON", href: "/api/role-model/providers" },
  { label: "Logs", href: "/logs" },
  { label: "Metrics", href: "/api/metrics" },
  { label: "Legacy UI", href: "/ui" },
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
  "inline-flex min-h-[44px] items-center justify-center rounded-none border border-[var(--rm-fg)] bg-[var(--rm-fg)] px-4 py-2 text-sm font-medium tracking-wide text-white transition hover:border-[var(--rm-accent)] hover:bg-[var(--rm-accent)] disabled:opacity-60";

export const secondaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-none border border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] px-4 py-2 text-sm font-medium tracking-wide text-[var(--rm-fg)] transition hover:border-[var(--rm-fg)]";

export const codeBlockClassName =
  "overflow-x-auto rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 text-xs leading-6 text-[var(--rm-secondary)]";

export const listRowClassName =
  "flex flex-col gap-3 rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4 md:flex-row md:items-start md:justify-between";

export function getRuntimeRouteDefinition(pathname: string): RuntimeRouteDefinition | undefined {
  if (pathname.startsWith("/app/requests/")) {
    return requestDetailRoute;
  }
  return runtimeRouteDefinitions.find((route) => route.to === pathname);
}
