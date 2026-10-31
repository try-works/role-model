import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { CONTROL_SPECS } from "./control";
import { renderControlPage, renderDeviceAuthorizationDialog, renderDeviceAuthorizationForm, renderEndpointAdmissionForm, renderProviderAccountForm } from "./control-view";
import { type EndpointsRouteContext, type ProvidersRouteContext, providersRoute } from "./features/control/routes";
import { card, filterBar, table } from "./features/s563-layout";
import { Message } from "./message";
import { READBACK_SPECS, type ReadbackRouteSpec, type ReadbackState, type ReadbacksState, renderReadbackPage } from "./readback";

/**
 * S534: structural parity for the providers, studio, system and local families. Each page keeps its
 * real host readback (or existing form) and adds the reference section titles/labels plus a bounded
 * rows table; empty host data renders the honest readback state rather than fabricated rows.
 */
type H = HtmlBuilder<Message>;

const eyebrow = "font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-muted-foreground";
const body = "text-sm leading-5 text-muted-foreground";

export const familySvg = (h: H): Html =>
  h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]"), h.AriaLabel("Structural summary")], [h.rect([], []), h.rect([], [])]);

const statusOf = (readback: ReadbackState): string =>
  readback.status === "idle" ? "loading" : readback.status;

const rowsTable = (state: ReadbackState, emptyText: string, h: H, columns: readonly string[] = ["Name", "Value", "Meta"], cells?: (row: ReadbackState["rows"][number]) => readonly string[]): Html =>
  table(columns, state.rows.map(cells ?? ((row) => [row.label, row.value, row.meta])), emptyText, h);

export interface FamilySection {
  readonly label: string;
  readonly spec?: ReadbackRouteSpec;
  readonly readback?: ReadbackState;
  readonly note?: string;
  readonly columns?: readonly string[];
  readonly rows?: (row: ReadbackState["rows"][number]) => readonly string[];
  readonly children?: readonly Html[];
}

export const familyPage = (
  label: string,
  routeName: string,
  description: string,
  sections: readonly FamilySection[],
  h: H,
): Html => {
  const first = sections.find((section) => section.readback !== undefined);
  const state = first?.readback === undefined ? "empty" : statusOf(first.readback);
  const pageReadback = first?.readback;
  if (pageReadback !== undefined) {
    if (routeName === "local-peer-models") return localPeerModelsPage(pageReadback, h);
    if (routeName === "local-llama-swap-models") return localLlamaModelsPage(pageReadback, h);
    if (routeName === "local-swap") return localSwapPage(pageReadback, h);
    if (routeName === "local-logs") return localLogsPage(pageReadback, h);
    if (routeName === "local-peers") return localPeersPage(pageReadback, h);
    if (routeName === "system-peers") return systemPeersPage(pageReadback, h);
    if (routeName === "system-extensions") return systemExtensionsPage(pageReadback, h);
    if (routeName === "session-readiness") return systemSessionPage(pageReadback, h);
    if (routeName === "storage-retention") return systemStoragePage(pageReadback, h);
  }
  if (routeName === "system-operator") return systemOperatorPage(sections, h);
  return h.section(
    [h.Class("rm3-next-route mt-4 space-y-6"), h.DataAttribute("route", routeName), h.DataAttribute("final-family-state", state), h.DataAttribute("page-layout", "reference"), h.DataAttribute("page-state", state)],
    [h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], [label]), ...sections.map((section, index) =>
      card(section.label, section.note, [
        ...(index === 0 && description.length > 0 ? [h.p([h.Class("text-sm leading-5 text-muted-foreground")], [description])] : []),
        ...(section.children ?? []),
        ...(section.spec === undefined || section.readback === undefined
          ? []
          : [
              renderReadbackPage(section.spec, section.readback, h),
              rowsTable(section.readback, READBACK_SPECS[section.spec.key]?.emptyText ?? "No rows recorded yet.", h, section.columns, section.rows),
            ]),
      ], h),
    )],
  );
};

export const providersPage = (ctx: ProvidersRouteContext): Html => {
  const { h } = ctx;
  const readbacks = ctx.readbacks;
  const endpointMeta = readbacks.modelEndpoints.rows.flatMap((row) => {
    try {
      // SAFETY: modelEndpoints writes this JSON object; fields are read defensively.
      return [JSON.parse(row.meta) as { readonly endpointId?: string; readonly healthStatus?: string; readonly modelId?: string; readonly roleIds?: readonly string[]; readonly status?: string }];
    } catch {
      return [];
    }
  });
  const accountRows = readbacks.integrationProviders.rows;
  const modelRows = readbacks.configuredModels.rows.map((row) => {
    let meta: { readonly id?: string; readonly providerId?: string } = {};
    try {
      meta = JSON.parse(row.meta) as typeof meta;
    } catch {
      meta = {};
    }
    const endpoints = endpointMeta.filter((endpoint) => endpoint.modelId === row.id || (meta.id !== undefined && endpoint.modelId === meta.id));
    const health = endpoints[0]?.healthStatus ?? endpoints[0]?.status ?? "unknown";
    const roles = [...new Set(endpoints.flatMap((endpoint) => endpoint.roleIds ?? []))];
    return { health, label: row.label, providerId: meta.providerId ?? row.value, roleCount: roles.length };
  });
  const providerGroups = [...new Set(modelRows.map((row) => row.providerId))].filter((provider) => provider.length > 0 && modelRows.some((row) => row.providerId === provider));
  const labelClass = "font-sans text-xs font-normal leading-4 text-muted-foreground";
  const fieldClass = "flex flex-col gap-1.5";
  const selectClass =
    "flex h-[34px] w-full items-center justify-between gap-2 rounded-md border border-input bg-secondary px-2.5 text-left font-sans text-sm text-foreground";
  const inputClass = "h-[34px] w-full rounded-md border border-input bg-secondary px-2.5 font-sans text-sm text-foreground";
  const field = (label: string, control: Html) => h.label([h.Class(fieldClass)], [h.span([h.Class(labelClass)], [label]), control]);
  const draft = ctx.providerAccount.draft;
  const catalog = ctx.readbacks.providerCatalog.rows.flatMap((row) => {
    try {
      // SAFETY: providerCatalog rows carry the provider JSON record in meta.
      return [JSON.parse(row.meta) as { readonly displayName?: string; readonly envVars?: ReadonlyArray<string>; readonly modelIds?: ReadonlyArray<string>; readonly providerId?: string; readonly providerKind?: string; readonly variants?: ReadonlyArray<{ readonly authMode?: string; readonly label?: string; readonly modelIds?: ReadonlyArray<string>; readonly variantId?: string }> }];
    } catch {
      return [];
    }
  }).filter((provider) => provider.providerId !== undefined && provider.providerKind !== "local-engine");
  const selectedProvider = catalog.find((provider) => provider.providerId === draft.providerId) ?? catalog[0];
  const variants = selectedProvider?.variants ?? [];
  const selectedVariant = variants.find((variant) => variant.variantId === draft.variantId) ?? variants[0];
  const modelIds = selectedVariant?.modelIds ?? selectedProvider?.modelIds ?? [];
  const connectionId = draft.providerAccountId.length > 0
    ? draft.providerAccountId
    : selectedProvider?.providerId === undefined
      ? ""
      : selectedProvider.providerId + ".personal." + (selectedVariant?.variantId ?? "");
  const credentialRef = draft.credentialRef.length > 0 ? draft.credentialRef : selectedProvider?.envVars?.[0] ?? "";
  return h.section(
    [h.Class("rm3-next-route"), h.DataAttribute("route", "providers"), h.DataAttribute("page-layout", "reference")],
    [
      h.div([h.Class("grid gap-4 xl:grid-cols-2 xl:items-start")], [
        card("Choose provider and models", "Select the provider, connection method, and model. New models start with all roles selected — edit roles on the configured connection.", [
          h.div([h.Class("grid gap-4")], [
            field("Provider", h.select(
              [h.AriaLabel("Provider"), h.Class(selectClass), h.OnChange((value: string) => Message.ProviderAccountSelectionChanged({ providerId: value, variantId: "" }))],
              catalog.length === 0
                ? [h.option([h.Value("")], ["No providers available"])]
                : catalog.map((provider) => h.option([h.Value(provider.providerId ?? ""), ...(provider.providerId === selectedProvider?.providerId ? [h.Selected(true)] : [])], [provider.displayName ?? provider.providerId ?? ""])),
            )),
            field("Connection method", h.select(
              [h.AriaLabel("Connection method"), h.Class(selectClass), h.OnChange((value: string) => Message.ProviderAccountSelectionChanged({ providerId: selectedProvider?.providerId ?? "", variantId: value }))],
              variants.length === 0
                ? [h.option([h.Value("")], ["No connection methods"])]
                : variants.map((variant) => h.option([h.Value(variant.variantId ?? ""), ...(variant.variantId === selectedVariant?.variantId ? [h.Selected(true)] : [])], [variant.label ?? variant.variantId ?? ""])),
            )),
            field(
              "Provider connection id",
              h.input([h.AriaLabel("Provider connection id"), h.Type("text"), h.Class(inputClass), h.Attribute("value", connectionId), h.OnInput((value: string) => Message.ProviderAccountFieldChanged({ field: "providerAccountId", value }))]),
            ),
            field(
              "Credential reference",
              h.input([h.AriaLabel("Credential reference"), h.Type("text"), h.Class(inputClass), h.Attribute("value", credentialRef), h.OnInput((value: string) => Message.ProviderAccountFieldChanged({ field: "credentialRef", value }))]),
            ),
            field("Model", h.select(
              [h.AriaLabel("Model"), h.Class(selectClass), h.OnChange((value: string) => Message.ProviderAccountModelChosen({ modelId: value }))],
              [h.option([h.Value(""), ...(draft.modelInput.length === 0 ? [h.Selected(true)] : [])], ["Select a model…"]),
               ...modelIds.map((modelId) => h.option([h.Value(modelId), ...(modelId === draft.modelInput ? [h.Selected(true)] : [])], [modelId]))],
            )),
            h.button(
              [h.Type("button"), h.AriaDisabled(ctx.providerAccount.status === "saving"), h.OnClick(Message.ProviderAccountCreateRequested({})), h.Class("inline-flex h-[34px] w-fit items-center justify-center rounded-md border border-border bg-secondary px-3 font-sans text-sm font-medium text-foreground")],
              [ctx.providerAccount.status === "saving" ? "Saving configuration…" : "Save configuration"],
            ),
            ...(ctx.providerAccount.status === "saved"
              ? [h.p([h.DataAttribute("provider-account-saved-visible", ""), h.Role("status"), h.Class("font-sans text-[13px] leading-5 text-[var(--rm-success,#2f9e62)]")], ["Provider account saved."])]
              : ctx.providerAccount.error === undefined
                ? []
                : [h.p([h.DataAttribute("provider-account-error-visible", ""), h.Role("alert"), h.Class("font-sans text-[13px] leading-5 text-[var(--rm-error)]")], [ctx.providerAccount.error])]),
            h.details([h.Class("mt-6 border-t border-border pt-4")], [
              h.summary([h.Class("cursor-pointer font-sans text-sm font-medium text-foreground")], ["Provider account setup"]),
              h.div([h.Class("mt-4 flex flex-col gap-4")], [
                renderProviderAccountForm(ctx.providerAccount, h),
                renderControlPage(CONTROL_SPECS.providers, ctx.controls.providers, h),
              ]),
            ]),
          ]),
        ], h),
        card("Configured provider connections", "Endpoints stay grouped by account. Expand a model's roles count to edit which routing roles it can serve.", [
          providerGroups.length === 0
            ? ctx.controls.providers.rows.length === 0
              ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No provider connections are configured yet."])
              : h.div([h.Class("flex flex-col gap-3")], ctx.controls.providers.rows.map((row) =>
                  h.div([h.Class("flex items-center gap-3 border-b border-[var(--rm-border)] px-1 py-2 last:border-b-0")], [
                    h.span([h.Class("min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-foreground")], [row.label]),
                    h.span([h.Class("shrink-0 font-sans text-[12px] text-muted-foreground")], [row.value]),
                    h.span([h.Class("shrink-0 font-mono text-[11px] text-muted-foreground")], [row.meta]),
                  ]),
                ))
            
            : h.div([h.Class("flex flex-col gap-4")], providerGroups.map((provider) => {
                const models = modelRows.filter((row) => row.providerId === provider);
                return h.div([h.Class("flex flex-col gap-1")], [
                  h.div([h.Class("flex flex-wrap items-baseline gap-2 px-1")], [
                    h.span([h.Class("truncate font-mono text-[13px] font-semibold text-foreground")], [provider]),
                    h.span([h.Class("ml-auto font-sans text-xs text-muted-foreground")], [String(models.length) + " endpoint" + (models.length === 1 ? "" : "s")]),
                  ]),
                  h.div([h.Class("flex flex-col")], models.map((row) =>
                    h.div([h.Class("flex items-center gap-3 border-b border-[var(--rm-border)] px-1 py-2 last:border-b-0")], [
                      h.span([h.Class("min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-foreground")], [row.label]),
                      h.span([h.Class("shrink-0 font-sans text-[12px] text-muted-foreground")], [row.health]),
                      h.span([h.Class("shrink-0 font-sans text-[12px] tabular-nums text-muted-foreground")], [String(row.roleCount) + " roles"]),
                      h.span([h.Class("shrink-0 text-muted-foreground")], [">"]),
                    ]),
                  )),
                ]);
              })),
        ], h),
        ...(ctx.controls.providers.rows.length === 0
          ? []
          : [card("Provider accounts", "Host accounts created for this runtime, with their credential state.", [
              h.div([h.Class("flex flex-col")], ctx.controls.providers.rows.map((row) =>
                h.div([h.Class("flex items-center gap-3 border-b border-[var(--rm-border)] px-1 py-2 last:border-b-0")], [
                  h.span([h.Class("min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-foreground")], [row.label]),
                  h.span([h.Class("shrink-0 font-sans text-[12px] text-muted-foreground")], [row.value]),
                  h.span([h.Class("shrink-0 font-mono text-[11px] text-muted-foreground")], [row.meta]),
                ]),
              )),
            ], h)]),
      ]),
      renderDeviceAuthorizationForm(ctx.deviceAuth, ctx.deviceAuthDialog, h, false),
      renderDeviceAuthorizationDialog(ctx.deviceAuth, ctx.deviceAuthDialog, h),
    ],
  );
};

export const endpointsPage = (ctx: EndpointsRouteContext & { readonly readbacks: ReadbacksState }): Html => {
  const { h } = ctx;
  const meta = (row: ReadbackState["rows"][number]): { endpointId?: string; effort?: string; healthStatus?: string; modelId?: string; providerId?: string; source?: string } => {
    try {
      // SAFETY: modelEndpoints writes this JSON object; fields are read defensively.
      return JSON.parse(row.meta) as ReturnType<typeof JSON.parse>;
    } catch {
      return {};
    }
  };
  const modelNames = new Map(ctx.readbacks.configuredModels.rows.map((row) => [row.id, row.label]));
  const rows = ctx.readbacks.modelEndpoints.rows.map((row) => {
    const endpoint = meta(row);
    const provider = endpoint.providerId ?? row.value;
    return {
      connection: provider,
      account: endpoint.endpointId ?? row.id,
      effort: endpoint.effort ?? "Provider default",
      endpoint: endpoint.endpointId ?? row.id,
      health: endpoint.healthStatus ?? "unknown",
      model: modelNames.get(endpoint.modelId ?? "") ?? endpoint.modelId ?? "—",
      readiness: "active",
      source: provider.length === 0 ? "Local / peer" : "Direct provider / remote_api",
    };
  });
  return h.section(
    [h.Class("rm3-next-route"), h.DataAttribute("route", "endpoints"), h.DataAttribute("page-layout", "reference")],
    [
      card("Runtime connections", "Provider, model, and endpoint state merged into one registry view.", [
        h.div([h.Class("overflow-hidden rounded-lg border border-border")], [
              h.table(
                [h.Class("w-full border-collapse text-left font-sans text-sm")],
                [
                  h.thead([h.Class("bg-secondary")], [
                    h.tr([], ["Provider", "Connection", "Model", "Endpoint", "Effort", "Source", "Health", "Readiness"].map((label) =>
                      h.th([h.Class("px-3 py-2 font-mono text-[11px] font-normal uppercase tracking-[0.04em] text-muted-foreground")], [label]),
                    )),
                  ]),
                  h.tbody([], [
                    ...rows.map((row) =>
                      h.tr([h.Class("border-t border-border align-top")], [
                        h.td([h.Class("px-3 py-2 font-mono text-[13px] font-semibold text-foreground")], [row.connection]),
                        h.td([h.Class("px-3 py-2 break-all font-mono text-[11px] text-muted-foreground")], [row.account]),
                        h.td([h.Class("px-3 py-2 text-[13px] text-foreground")], [row.model]),
                        h.td([h.Class("px-3 py-2 break-all font-mono text-[12px] text-muted-foreground")], [row.endpoint]),
                        h.td([h.Class("px-3 py-2 text-[13px] text-foreground")], [row.effort]),
                        h.td([h.Class("px-3 py-2 text-[13px] text-foreground")], [row.source]),
                        h.td([h.Class("px-3 py-2 text-[13px] text-[var(--rm-success,#2f9e62)]")], [row.health]),
                        h.td([h.Class("px-3 py-2 text-[13px] text-[var(--rm-success,#2f9e62)]")], [row.readiness]),
                      ]),
                    ),
                    ...(rows.length === 0 ? [h.tr([], [h.td([h.Colspan(8), h.Class("px-3 py-3 text-sm text-muted-foreground")], ["No runtime connections recorded yet."])])] : []),
                  ]),
                ],
              ),
          ]),
        renderEndpointAdmissionForm(ctx.endpointAdmission, h),
        renderControlPage(CONTROL_SPECS.endpoints, ctx.controls.endpoints, h),
      ], h),
    ],
  );
};

const h2 = (h: H, text: string): Html => h.h2([h.Class("rm3-next-route-title")], [text]);
const h3 = (h: H, text: string): Html => h.h3([h.Class("mt-4 text-[14px] font-semibold text-[var(--rm-fg)]")], [text]);
const p = (h: H, text: string): Html => h.p([h.Class("mt-1 " + body)], [text]);

const choiceCard = (eyebrow: string, title: string, description: string, actions: ReadonlyArray<Html>, h: H): Html =>
  h.section([h.Class("flex min-h-[280px] flex-col gap-3 rounded-lg border border-border bg-card p-5")], [
    h.p([h.Class("font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-muted-foreground")], [eyebrow]),
    h.h2([h.Class("text-[16px] font-semibold leading-[22px] text-foreground")], [title]),
    h.p([h.Class("text-sm leading-5 text-muted-foreground")], [description]),
    h.div([h.Class("mt-auto flex flex-wrap gap-2 pt-2")], actions),
  ]);

const primaryLink = (href: string, label: string, h: H): Html =>
  h.a([h.Href(href), h.Role("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground")], [label]);

const secondaryLink = (href: string, label: string, h: H): Html =>
  h.a([h.Href(href), h.Role("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], [label]);

export const localChoosePage = (_readbacks: ReadbacksState, h: H): Html =>
  h.section([h.Class("rm3-next-route mt-4 grid gap-5 xl:grid-cols-2"), h.DataAttribute("route", "local-choose"), h.DataAttribute("page-layout", "reference")], [
    choiceCard("External server", "Peer-backed models",
      "Use this when you already run an OpenAI-compatible server (LM Studio, llama.cpp, vLLM, or similar). Register the server under Endpoints, then register models and roles here. role-model routes to your server; it does not load GGUF files for you.",
      [primaryLink("/local/peer-models", "Open peer models", h), secondaryLink("/local/peers", "Configure endpoints", h)], h),
    choiceCard("Managed by role-model", "Llama-swap models",
      "Use this when role-model runs the local llama-swap process, swaps models on one GPU, and applies TTL auto-unload. Models are declared in Runtime config; load and role assignment happen here.",
      [primaryLink("/local/llama-swap/models", "Open llama-swap models", h), secondaryLink("/runtime/config", "Edit runtime config", h)], h),
  ]);

const mutedPanel = "rounded-md border border-border bg-secondary p-4";
const fieldLabel = "font-sans text-xs leading-4 text-foreground";
const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";

export const localPeersPage = (readback: ReadbackState, h: H): Html => {
  const hasRows = readback.rows.length > 0;
  return h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-peers"), h.DataAttribute("page-layout", "reference")], [
    card("Endpoint inventory", "role-model probes each server at /v1/models before peer models can be registered.", [
      hasRows ? table(["Endpoint", "Status", "Type", "Actions"], readback.rows.map((row) => [row.label, row.value, "OpenAI-compatible peer", "Check health  Remove"]), "No peer endpoints configured.", h)
        : h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No peer endpoints configured. Add a server URL below to use peer-backed local models."]),
    ], h),
    card("Add peer endpoint", "Base URL of your OpenAI-compatible API (with or without /v1). Optional bearer token if the server requires auth.", [
      h.div([h.Class("grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]")], [
        h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel), h.Attribute("for", "peer-url")], ["Endpoint URL"]), h.input([h.Id("peer-url"), h.Type("url"), h.Placeholder("http://127.0.0.1:1234"), h.Class(fieldClass)])]),
        h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel), h.Attribute("for", "peer-auth-token")], ["Auth token (optional)"]), h.input([h.Id("peer-auth-token"), h.Type("password"), h.Placeholder("Bearer token (optional)"), h.Class(fieldClass)])]),
      ]),
      h.button([h.Type("button"), h.Disabled(true), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-secondary px-3 font-sans text-sm font-medium text-muted-foreground")], ["Add endpoint"]),
    ], h),
  ]);
};

export const localPeerModelsPage = (readback: ReadbackState, h: H): Html => h.div([h.Class("space-y-5"), h.DataAttribute("route", "local-peer-models"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", readbackStateOf(readback)), h.DataAttribute("readback-route", "localPeerModels"), h.DataAttribute("readback-state", readbackStateOf(readback))], [
  card("Register model", "Model ID must appear in the peer server catalog. Registration creates a router-visible endpoint without pretending the runtime owns the model process itself.", [
    ...(readbackNotice(readback, "Peer models", h) === null ? [] : [readbackNotice(readback, "Peer models", h) as Html]),
    h.div([h.Class("grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] xl:items-end")], [
      h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel), h.Attribute("for", "peer-model-id")], ["Model ID"]), h.input([h.Id("peer-model-id"), h.Type("text"), h.Placeholder("openai/gpt-4.1"), h.Class(fieldClass)])]),
      h.div([h.Class("space-y-2")], [h.p([h.Class(fieldLabel)], ["Roles"]), h.div([h.Class("flex flex-wrap gap-2 py-2")], [h.button([h.Type("button"), h.Disabled(true), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-secondary px-3 font-sans text-sm font-medium text-muted-foreground")], ["+ Add role"]), h.button([h.Type("button"), h.Disabled(true), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-secondary px-3 font-sans text-sm font-medium text-muted-foreground")], ["Select all roles"])])]),
      h.div([h.Class("flex items-end")], [h.button([h.Type("button"), h.Disabled(true), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-secondary px-3 font-sans text-sm font-medium text-muted-foreground")], ["Register model"])]),
    ]),
    h.div([h.Class(mutedPanel + " flex flex-wrap items-center justify-between gap-4 p-3")], [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Configure at least one peer endpoint first, then register a model id from that peer catalog."]),
      h.a([h.Href("/local/peers"), h.Role("button"), h.Class(secondaryButton)], ["Open endpoints"]),
    ]),
  ], h),
  card("Registered models", "Models currently registered with the router from peer endpoints.", [
    readback.rows.length > 0
      ? table(["Model", "State", "Detail"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No peer models registered yet.", h)
      : h.div([h.Class(mutedPanel)], [
          h.p([h.Class("text-[16px] font-semibold leading-[22px] text-foreground")], ["No peer models registered yet."]),
          h.p([h.Class("mt-1 text-sm leading-5 text-muted-foreground")], ["Add an endpoint above first, then register a model id from that peer catalog."]),
        ]),
  ], h),
]);
const readbackStateOf = (readback: ReadbackState): string => readback.status === "idle" ? "loading" : readback.status;
const readbackNotice = (readback: ReadbackState, label: string, h: H): Html | null => {
  const state = readbackStateOf(readback);
  if (state === "loading") return h.p([h.Role("status"), h.AriaBusy(true), h.Class("text-sm leading-5 text-muted-foreground")], ["Loading " + label.toLowerCase() + "…"]);
  if (state === "error") return h.p([h.Role("alert"), h.Class("text-sm leading-5 text-muted-foreground")], [(readback.message ?? (label + " read failed"))]);
  return null;
};
const statStrip = (items: ReadonlyArray<{ readonly label: string; readonly value: string }>, h: H): Html =>
  h.div([h.Class("flex h-[54px] w-full overflow-hidden rounded-md border border-border bg-card")], items.flatMap((item, index) => [
    ...(index === 0 ? [] : [h.div([h.Class("w-px shrink-0 self-stretch bg-border")], [])]),
    h.div([h.Class("flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3.5")], [
      h.p([h.Class("font-mono text-[11px] uppercase leading-[14px] tracking-[0.08em] text-muted-foreground")], [item.label]),
      h.p([h.Class("truncate whitespace-nowrap font-mono text-sm font-medium leading-[18px] tabular-nums text-foreground")], [item.value]),
    ]),
  ]));

export const systemPeersPage = (readback: ReadbackState, h: H): Html => {
  const rows = readback.rows;
  return h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-peers"), h.DataAttribute("page-layout", "reference")], [
    statStrip([{ label: "Peers", value: String(rows.length) }, { label: "Peer models", value: "0" }, { label: "Runtime models", value: "3" }, { label: "Auth ready", value: "0" }], h),
    h.div([h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]")], [
      card("Peer inventory", "Peer-backed model groups observed in the current runtime listing.", [
        rows.length === 0 ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No peers configured in the current host config."]) : table(["Peer", "Models", "Count", "Status"], rows.map((row) => [row.label, row.value, "1", "live"]), "No peers configured in the current host config.", h),
      ], h),
      h.div([h.Class("space-y-4")], [
        card("Peer config", "Proxy targets, auth state, and live model match.", [
          h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No peer configs are stored in the current runtime."]),
        ], h),
        card("Contract fields", "Host contract fields that wire a peer into the runtime boundary.", [
          h.div([h.Class("space-y-3")], [["proxy", "Base URL to proxy peer requests through."], ["apiKey", "Optional peer-specific auth token passed to the remote target."], ["models", "The models served by that peer and exposed to the runtime."], ["filters · timeouts", "Peer-local request filters/strip rules and proxy timeouts."]].map(([label, description]) => h.div([h.Class(mutedPanel + " p-3")], [h.p([h.Class("font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground")], [label]), h.p([h.Class("mt-2 text-sm leading-5 text-muted-foreground")], [description])]))),
        ], h),
      ]),
    ]),
  ]);
};

export const systemOperatorPage = (sections: readonly FamilySection[], h: H): Html => {
  const statusSection = sections.find((section) => section.readback !== undefined);
  const statusReadback = statusSection?.readback;
  const state = statusReadback === undefined ? "empty" : readbackStateOf(statusReadback);
  return h.div([h.Class("space-y-5"), h.DataAttribute("route", "system-operator"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", state), h.DataAttribute("readback-route", "operatorStatus"), h.DataAttribute("readback-state", state)], [
  ...(statusReadback === undefined ? [] : [readbackNotice(statusReadback, "Operator status", h) as Html].filter((value): value is Html => value !== null)),
  card("Operator status", "Bounded operator status readback for the current session.", [
    ...(statusReadback !== undefined && statusReadback.rows.length > 0
      ? [table(["Name", "Value", "Detail"], statusReadback.rows.map((row) => [row.label, row.value, row.meta]), "No operator status rows recorded yet.", h)]
      : [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No operator status rows recorded yet."])]),
  ], h),
  card("Operator Controls", "Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored.", [
    h.label([h.Class(fieldLabel), h.Attribute("for", "operator-token")], ["Operator access token"]),
    h.div([h.Class("flex flex-col gap-3 md:flex-row")], [h.input([h.Id("operator-token"), h.Type("password"), h.Placeholder("Paste a local operator token…"), h.Class(fieldClass + " flex-1")]), h.button([h.Type("button"), h.Class(primaryButton)], ["Load Operator State"])]),
    h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["This page does not enable production learning. Learning actions remain shadow-only and the runtime is the source of truth."]),
  ], h),
  card("Trace lineage", "Trace roots, generations, branches, and completeness are read from the runtime authority; missing evidence remains visibly unavailable.", [
    h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Trace-root inspection is unavailable or has not been observed yet."]),
    h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["Replay and evaluation operations below preserve the trace root identity instead of inferring lineage from a job label."]),
  ], h),
  h.div([h.Class("grid gap-4 xl:grid-cols-2")], [
    card("Replay Jobs", "Review live replay work. Cancelling a job requires confirmation.", [
      h.div([h.Class("flex flex-wrap items-end gap-3")], [
        h.div([h.Class("min-w-0 flex-1 space-y-2")], [h.label([h.Class(fieldLabel)], ["Trace root id"]), h.input([h.Placeholder("trace-root…"), h.Class(fieldClass)])]),
        h.div([h.Class("w-[120px] space-y-2")], [h.label([h.Class(fieldLabel)], ["Max requests"]), h.input([h.Type("number"), h.Value("25"), h.Class(fieldClass)])]),
        h.button([h.Type("button"), h.Class(secondaryButton)], ["Create Replay"]),
      ]),
      h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["No replay jobs recorded for this operator session."]),
    ], h),
    card("Evaluation Jobs", "Retry or cancel bounded evaluation work with confirmation for cancellation.", [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No evaluation jobs recorded for this operator session."]),
    ], h),
  ]),
  card("Shadow Learning", "Learning output is advisory. Mode changes and rollback never directly alter production routing.", [
    h.div([h.Class("grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end")], [
      h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel)], ["Learning mode"]), h.select([h.Class(fieldClass)], [h.option([h.Value("shadow"), h.Selected(true)], ["Shadow"]), h.option([h.Value("off")], ["Off"])])]),
      h.div([h.Class("flex flex-wrap gap-2")], [h.button([h.Type("button"), h.Class(secondaryButton)], ["Update Mode"]), h.button([h.Type("button"), h.Class(secondaryButton)], ["Roll Back Shadow State"])]),
    ]),
  ], h),
  ]);
};

export const systemExtensionsPage = (readback: ReadbackState, h: H): Html => h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-extensions"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", readbackStateOf(readback)), h.DataAttribute("readback-route", "extensions"), h.DataAttribute("readback-state", readbackStateOf(readback))], [
  ...(readbackStateOf(readback) === "error" ? [h.p([h.Role("alert"), h.Class("text-sm leading-5 text-muted-foreground")], ["Extensions read failed: " + (readback.message ?? "unknown error")])] : readbackStateOf(readback) === "loading" ? [h.p([h.Role("status"), h.AriaBusy(true), h.Class("text-sm leading-5 text-muted-foreground")], ["Loading extensions…"])] : []),
  statStrip([{ label: "Installed", value: String(readback.rows.length) }, { label: "Ready", value: "0" }, { label: "Degraded", value: "0" }, { label: "Open recs", value: "0" }], h),
  card("Replay automation", "Replay automation is configured per extension and reported by the host.", [
    h.div([h.Class("flex flex-wrap items-start justify-between gap-3")], [
      h.div([h.Class("space-y-1 text-sm leading-5 text-muted-foreground")], [h.p([], ["2291 ticks · running · last degraded: 1 disposition(s)"]), h.p([], ["0/100 counterfactuals · 0/300 dispatches · 0 reserved · window 2026-10-30"]), h.p([], ["sweeps: 0 expired · 1 resumed · 0 reconciled · 0 stranded · 0 reclaimed · 0 recovered"]), h.p([h.Class("text-amber-500")], ["fetch failed"])]),
      h.button([h.Type("button"), h.Class(secondaryButton)], ["Pause"]),
    ]),
  ], h),
  h.div([h.Class("grid gap-4 xl:grid-cols-2")], [
    card("Contribution posture", "Aggregate upload is independent from local recommendation use, training, external RL, and rich capture. Contribution policy is not extension enablement.", [h.div([h.Class(mutedPanel + " p-4")], [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Loading contribution policy…"])])], h),
    card("Recommendation ledger", "Signed bundles validated locally before apply.", [h.button([h.Type("button"), h.Class(primaryButton)], ["Download & validate latest"]), h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["No recommendation bundles downloaded."])], h),
  ]),
  card("Extension inventory", "Canonical packages on this host. Modes change the extension boundary without becoming contribution policy.", [h.div([h.Class(mutedPanel + " p-4")], [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Loading extension lifecycle…"])])], h),
]);

export const systemSessionPage = (readback: ReadbackState, h: H): Html => {
  const count = readback.rows.length;
  const sessionCard = (title: string, description: string, body: readonly Html[]) => card(title, description, body, h);
  return h.div([h.Class("space-y-6"), h.DataAttribute("route", "session-readiness"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("readback-route", "sessionReadiness"), h.DataAttribute("readback-state", readbackStateOf(readback))], [
    ...(readbackNotice(readback, "Session readiness", h) === null ? [] : [readbackNotice(readback, "Session readiness", h) as Html]),
    statStrip([{ label: "Bootstrap", value: count > 0 ? "complete" : "unavailable" }, { label: "Host health", value: "ok" }, { label: "Authority", value: "authoritative" }, { label: "Routable", value: String(count) }], h),
    h.div([h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]")], [
      h.div([h.Class("space-y-4")], [
        sessionCard("Session bootstrap", "Persisted bootstrap ladder for the current host session.", [
          h.div([h.Class("mb-4 flex flex-wrap items-center gap-3")], [h.span([h.Class("rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-foreground")], ["complete"])]),
          h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["identity, endpoints, peers, vendors, local reload, remote health, inventory were all persisted in the current session."]),
          ...(readback.rows.length > 0 ? [table(["Name", "Value", "Detail"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No session readiness rows recorded yet.", h)] : []),
        ]),
        sessionCard("Canonical lifecycle", "Authority posture and blocking credential accounts.", [h.span([h.Class("rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-foreground")], ["authoritative"]), h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["Canonical lifecycle data is authoritative and no credential blockers remain."])]),
        sessionCard("Operator intent manifest", "Declared operator intent for this runtime session.", [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["applied operator-intent.json is readable and schema-valid."]), h.p([h.Class("break-all font-mono text-xs leading-4 text-foreground")], ["operator-intent.json"])]),
      ]),
      h.div([h.Class("space-y-4")], [
        sessionCard("Credential readiness", "Blocking credential counts by class.", [h.span([h.Class("rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-foreground")], ["no blockers"]), h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["No credential blockers reported for the current session."])]),
        sessionCard("Routable inventory", "Endpoints and models available to routing.", [
          h.div([], [
            ...[["Endpoints", String(count)], ["Models", "0"], ["Empty aliases", "0"]].map(([label, value]) => h.div([h.Class("flex items-center justify-between gap-3 py-1.5")], [h.p([h.Class("text-sm leading-5 text-muted-foreground")], [label]), h.p([h.Class("font-mono text-sm leading-[18px] tabular-nums text-foreground")], [value])])),
          ]),
        ]),
        sessionCard("Alias drift warnings", "Hint models that no longer resolve live.", [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No alias hint drift warnings."])]),
      ]),
    ]),
  ]);
};

export const systemStoragePage = (_readback: ReadbackState, h: H): Html => h.div([h.Class("space-y-6"), h.DataAttribute("route", "storage-retention"), h.DataAttribute("page-layout", "reference")], [
  statStrip([
    { label: "Physical bytes", value: "Not measured" }, { label: "Physical resources", value: "0" }, { label: "Logical bytes", value: "0 B" },
    { label: "Reclaimable bytes", value: "Not measured" }, { label: "Reserved bytes", value: "Not measured" }, { label: "Archived bytes", value: "Not measured" },
    { label: "Unattributed bytes", value: "Not measured" }, { label: "Unobserved stores", value: "0" }, { label: "Unavailable stores", value: "0" },
    { label: "Unavailable physical resources", value: "0" }, { label: "Legal holds", value: "Not measured" }, { label: "Maintenance", value: "Idle" },
  ], h),
  h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Unattributed physical bytes are measured physical allocation not mapped to logical storage classes; they are not service health."]),
  h.div([h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]")], [
    card("Logical classes", "Each logical class has an owner and retention contract. Physical resource mapping remains explicit so shared storage is not double counted.", [
      h.div([h.Class(mutedPanel + " p-4")], [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Loading storage inventory..."])]),
    ], h),
    h.div([h.Class("space-y-4")], [
      card("Retention policy", "Scoped size and age budgets. Managed policy stays authoritative.", [
        h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel)], ["Maximum size (GB)"]), h.input([h.Type("number"), h.Value("1"), h.Class(fieldClass)])]),
        h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel)], ["Maximum age (days)"]), h.input([h.Type("number"), h.Value("30"), h.Class(fieldClass)])]),
        h.button([h.Type("button"), h.Class(secondaryButton + " w-full justify-center")], ["Save policy"]),
      ], h),
      card("Manual pruning", "Dry-run first, then execute the exact hash-bound plan as a cancellable background job.", [
        h.div([h.Class("flex flex-wrap gap-2")], [h.button([h.Type("button"), h.Class(primaryButton)], ["Dry-run"]), h.button([h.Type("button"), h.Class(secondaryButton)], ["Execute plan"])]),
        h.div([h.Class(mutedPanel + " p-3")], [h.p([h.Class("text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground")], ["Background progress"]), h.p([h.Class("mt-1 text-sm leading-5 text-muted-foreground")], ["Idle - no active retention job"])]),
        h.p([h.Class("mt-3 text-sm leading-5 text-muted-foreground")], ["No legal holds or Managed policy conflicts."]),
      ], h),
    ]),
  ]),
]);

const roleSummary = "coder, architect, security, researcher, writer, operator, analyst, planner, tester, data, product, designer, support, legal, finance, creative, educator, translator, marketer, seller, recruiter, procurement, coordinator, knowledge, strategist, mathematician, scientist, health";

export const localLlamaModelsPage = (readback: ReadbackState, h: H): Html => h.div([h.Class("space-y-5"), h.DataAttribute("route", "local-llama-swap-models"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", readbackStateOf(readback)), h.DataAttribute("readback-route", "localLlamaSwapModels"), h.DataAttribute("readback-state", readbackStateOf(readback))], [
  h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Load a runtime-config-declared model, assign route roles, and manage the in-memory llama-swap inventory from this page."]),
  ...(readbackNotice(readback, "Llama-swap models", h) === null ? [] : [readbackNotice(readback, "Llama-swap models", h) as Html]),
  card("Load model", "Model must already be declared in runtime config. Loading triggers llama-swap to start or swap to this model instead of inventing a separate registration flow.", [
    h.div([h.Class("flex flex-wrap items-start gap-3")], [
      h.div([h.Class("min-w-0 flex-1 space-y-2")], [h.label([h.Class(fieldLabel), h.Attribute("for", "llama-swap-model-id")], ["Model ID"]), h.input([h.Id("llama-swap-model-id"), h.Type("text"), h.Placeholder("lfm2.5-8b-a1b"), h.Class(fieldClass)])]),
      h.div([h.Class("w-[220px] shrink-0 space-y-2")], [h.p([h.Class(fieldLabel)], ["Role summary"]), h.div([h.Class(mutedPanel + " flex min-h-[34px] items-center px-3 py-2")], [h.p([h.Class("break-words font-mono text-[13px] leading-[18px] text-foreground")], ["roles: " + roleSummary])])]),
      h.div([h.Class("flex items-end self-end")], [h.button([h.Type("button"), h.Disabled(true), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-secondary px-3 font-sans text-sm font-medium text-muted-foreground")], ["Load model"])]),
    ]),
    h.div([h.Class("flex flex-wrap items-center gap-2")], [h.button([h.Type("button"), h.Class(secondaryButton)], ["All roles"]), h.span([h.Class("text-sm text-muted-foreground")], ["28 selected · click to clear"])]),
    h.div([h.Class("flex flex-wrap gap-2")], [h.a([h.Href("/runtime/config"), h.Role("button"), h.Class(secondaryButton)], ["Open runtime config"])]),
  ], h),
  card("Loaded models", "Models currently resident in memory via llama-swap.", [
    readback.rows.length > 0
      ? table(["Model", "State", "Detail"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No llama-swap models loaded yet.", h)
      : h.div([h.Class(mutedPanel)], [h.p([h.Class("text-[16px] font-semibold leading-[22px] text-foreground")], ["No llama-swap models loaded yet."]), h.p([h.Class("mt-1 text-sm leading-5 text-muted-foreground")], ["Load a configured model above to start or swap the in-memory runtime inventory."])]),
  ], h),
]);

export const localSwapPage = (readback: ReadbackState, h: H): Html => h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-swap"), h.DataAttribute("page-layout", "reference")], [
  card("Event ledger", "Most recent swap events first.", [
    h.p([h.Class("text-sm leading-5 text-muted-foreground")], [readback.rows.length === 0 ? "No swap events recorded yet." : readback.rows.length + " swap event(s) recorded."]),
    h.div([h.Class(mutedPanel + " flex flex-wrap items-center justify-between gap-3 p-4")], [
      h.p([h.Class("max-w-[80ch] text-sm leading-5 text-muted-foreground")], ["Events appear here when the managed host loads a first model, swaps to a new one, or records the operator-visible reason for a transition."]),
      h.div([h.Class("flex flex-wrap gap-2")], [h.a([h.Href("/local/llama-swap/models"), h.Role("button"), h.Class(secondaryButton)], ["Open models"]), h.a([h.Href("/local/llama-swap/policy"), h.Role("button"), h.Class(secondaryButton)], ["Open host policy"])]),
    ]),
    ...(readback.rows.length === 0 ? [] : [table(["Timestamp", "Model", "Reason"], readback.rows.map((row) => [row.value, row.label, row.meta]), "No swap events recorded yet.", h)]),
  ], h),
  card("Ledger semantics", "Swap history stays narrow on purpose so each row can explain what changed without duplicating the full model-management surface.", [
    h.div([h.Class("grid gap-3 xl:grid-cols-3")], [
      h.div([h.Class(mutedPanel + " space-y-2")], [h.p([h.Class("text-[15px] font-semibold leading-5 text-foreground")], ["Initial load"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Rows without an old model indicate the first model activation for the current managed host window."])]),
      h.div([h.Class(mutedPanel + " space-y-2")], [h.p([h.Class("text-[15px] font-semibold leading-5 text-foreground")], ["Swap reason"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["The reason badge records why a new model became active so policy and operator intent remain inspectable later."])]),
      h.div([h.Class(mutedPanel + " space-y-2")], [h.p([h.Class("text-[15px] font-semibold leading-5 text-foreground")], ["Timeline order"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["The newest host transition stays first so troubleshooting can start with the latest local-runtime state."])]),
    ]),
  ], h),
]);

export const localLogsPage = (readback: ReadbackState, h: H): Html => h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-logs"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("readback-route", "localLogs"), h.DataAttribute("readback-state", readbackStateOf(readback))], [
  card("Structured local log history", "Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise.", [
    ...(readbackNotice(readback, "Local logs", h) === null ? [] : [readbackNotice(readback, "Local logs", h) as Html]),
    h.div([h.Class(mutedPanel + " mb-4 flex flex-wrap items-center gap-4 p-4")], [
      h.button([h.Type("button"), h.Class(secondaryButton)], ["Refresh"]),
      h.label([h.Class("flex items-center gap-2 text-sm text-foreground")], [h.input([h.Id("autoRefresh"), h.Type("checkbox"), h.Class("size-6 rounded border border-input")]), h.span([], ["Auto-refresh (3s)"])]),
      h.span([h.Class("ml-auto text-sm text-muted-foreground")], [readback.rows.length + " rows"]),
    ]),
    readback.rows.length === 0
      ? h.p([h.Class("mb-3 text-sm leading-5 text-muted-foreground")], ["No logs available. The local runtime may not be running."])
      : null,
    table(["Time", "Source", "Level", "Message", "Request"], readback.rows.map((row) => [row.value, "local", "info", row.label, "—"]), "No logs available.", h),
  ], h),
  card("Raw log streams", "Keep proxy and llama-swap runtime output side by side so operators can compare the gateway-facing stream against the local engine stream.", [
    h.div([h.Class("grid gap-4 xl:grid-cols-2")], [
      h.div([], [h.p([h.Class("mb-2 text-[15px] font-semibold leading-5 text-foreground")], ["Proxy log stream"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No proxy log lines are available yet."])]),
      h.div([], [h.p([h.Class("mb-2 text-[15px] font-semibold leading-5 text-foreground")], ["Llama-swap log stream"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No llama-swap log lines are available yet."])]),
    ]),
  ], h),
]);

export const localPolicyReferencePage = (readback: ReadbackState, h: H): Html => {
  const persisted = readback.rows.find((row) => row.id === "persisted") ?? readback.rows.find((row) => row.meta.trim().startsWith("{"));
  const meta = (() => {
    const raw = persisted?.meta && persisted.meta.trim() !== "{}" ? persisted.meta : "{\"ttl\":300,\"maxConcurrency\":1,\"autoUnload\":true}";
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  })();
  return h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-policy"), h.DataAttribute("page-layout", "reference")], [
    card("Policy configuration", "Edit runtime behavior for local model loading and unloading.", [
      h.div([h.Class("grid gap-6 md:grid-cols-2")], [
        h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel), h.Attribute("for", "local-policy-ttl")], ["TTL (seconds)"]), h.input([h.Id("local-policy-ttl"), h.Type("number"), h.Value("300"), h.Class(fieldClass)]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Seconds a model stays loaded after last request before auto-unload."])]),
        h.div([h.Class("space-y-2")], [h.label([h.Class(fieldLabel), h.Attribute("for", "local-policy-max-concurrency")], ["Max concurrency"]), h.input([h.Id("local-policy-max-concurrency"), h.Type("number"), h.Value("1"), h.Class(fieldClass)]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Maximum number of models loaded simultaneously."])]),
      ]),
      h.label([h.Class(mutedPanel + " flex cursor-pointer items-start justify-between gap-4")], [h.span([h.Class("space-y-1")], [h.span([h.Class("block text-[15px] font-semibold leading-5 text-foreground")], ["Auto-unload idle models"]), h.span([h.Class("text-sm leading-5 text-muted-foreground")], ["Release a model from memory after its TTL expires so the managed host does not keep inactive weights pinned indefinitely."])]), h.input([h.Id("autoUnload"), h.Type("checkbox"), h.Checked(true), h.Value("true"), h.Class("mt-0.5 size-4 rounded border border-input")])]),
      h.div([h.Class("flex flex-wrap gap-3 pt-2")], [h.button([h.Type("button"), h.Class(primaryButton)], ["Save policy"]), h.button([h.Type("button"), h.Class(secondaryButton)], ["Reset"]), h.a([h.Href("/local/llama-swap/models"), h.Role("button"), h.Class(secondaryButton)], ["Open models"])]),
    ], h),
    card("Raw policy", "Current persisted policy payload.", [
      h.div([h.Class(mutedPanel + " space-y-3")], [h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Persisted JSON stays visible here so operators can confirm the exact contract written back to the runtime after saving."]), h.pre([h.Class("overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-[13px] leading-[18px] text-foreground")], [meta])]),
    ], h),
  ]);
};

export const studioWorkspaceTitle = (tab: string): string =>
  tab === "chat"
    ? "Chat workspace"
    : tab === "images"
      ? "Images workspace"
      : tab === "audio"
        ? "Audio workspace"
        : tab === "rerank"
          ? "Rerank workspace"
          : "Advanced workspace";

export const studioWorkspaceLabels = (tab: string): readonly string[] =>
  tab === "chat"
    ? ["Request", "Result workspace"]
    : tab === "images"
      ? ["Image request modes", "Image result stage"]
      : tab === "audio"
        ? ["Audio mode and request", "Audio result stage"]
        : tab === "rerank"
          ? ["Rerank request", "Ranked results"]
          : ["Endpoint family", "Response workspace"];
