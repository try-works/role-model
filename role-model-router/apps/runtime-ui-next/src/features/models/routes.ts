import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import { Message } from "../../message";
import type { Model } from "../../model";
import type { ReadbackState } from "../../readback";
import { telemetryChartCard } from "../overview/charts";
import { blankRoleDraft, draftFromRole, draftToRolePayload, groupLabel, isHighRiskRole, rolePolicyFromReadback, ROLE_KIND_OPTIONS, tasksForRole, TOOL_POLICY_OPTIONS } from "./role-policy";
import { referenceCard, referenceSection, referenceSelect, referenceTable } from "../layout/reference";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  referenceSection("models", "ok", [referenceCard(title, undefined, children, h)], h, "models-state");

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  referenceTable(headings, rows, emptyText, h, "models");

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, empty: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({ description, emptyMessage: empty, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

const ROLE_TASK_COUNTS = {
  analyst: 47, architect: 36, coder: 49, coordinator: 24, creative: 14, data: 22, designer: 19,
  educator: 22, finance: 27, health: 11, knowledge: 16, legal: 22, marketer: 28, mathematician: 13,
  operator: 45, planner: 47, procurement: 18, product: 56, recruiter: 11, researcher: 28,
  scientist: 15, security: 32, seller: 18, strategist: 24, support: 27, tester: 24, translator: 11,
  writer: 85,
} as const;

export const modelsRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>, modelsView?: Model["modelsView"]): Html => {
  const endpointMeta = endpoints.rows.flatMap((row) => {
    try {
      // SAFETY: modelEndpoints writes this JSON object; fields are read defensively.
      return [JSON.parse(row.meta) as { readonly endpointId?: string; readonly healthStatus?: string; readonly modelId?: string; readonly roleIds?: readonly string[]; readonly status?: string }];
    } catch {
      return [];
    }
  });
  const cards = models.rows.map((row) => {
    let meta: { readonly capabilities?: readonly string[]; readonly contextWindow?: number | null; readonly endpointIds?: readonly string[]; readonly id?: string; readonly providerId?: string } = {};
    try {
      meta = JSON.parse(row.meta) as typeof meta;
    } catch {
      meta = {};
    }
    const endpointsForModel = endpointMeta.filter((endpoint) => endpoint.modelId === row.id || (meta.endpointIds ?? []).includes(endpoint.endpointId ?? ""));
    const health = endpointsForModel[0]?.healthStatus ?? endpointsForModel[0]?.status ?? "unknown";
    const roles = [...new Set(endpointsForModel.flatMap((endpoint) => endpoint.roleIds ?? []))];
    return {
      contextWindow: meta.contextWindow ?? null,
      displayName: row.label,
      endpointCount: endpointsForModel.length,
      health,
      id: row.id,
      model: meta,
      provider: row.value,
      roles: roles.length > 0 ? roles : (Object.keys(ROLE_TASK_COUNTS) as Array<keyof typeof ROLE_TASK_COUNTS>).slice(0, 8),
    };
  });
  const selected = cards.find((card) => card.id === modelsView?.selectedModelId) ?? cards[0];
  const roleOverrides = modelsView?.roleOverrides ?? [];
  const selectedRoles = (selected?.roles ?? []).filter((role) => {
    const override = roleOverrides.find((entry) => entry.modelId === selected?.id && entry.roleId === role);
    return override === undefined ? true : override.enabled;
  });
  const eyebrow = "font-sans text-[11px] font-semibold uppercase leading-[14px] tracking-[0.04em] text-[var(--rm-muted)]";
  const factLabel = "font-sans text-[13px] leading-[18px] text-[var(--rm-muted)]";
  const factValue = "text-right font-sans text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";
  const monoValue = "text-right font-mono text-[12px] font-semibold leading-4 text-[var(--rm-fg)]";
  const factRow = (label: string, value: string, mono = false) =>
    h.div([h.Class("flex items-baseline justify-between gap-3")], [
      h.dt([h.Class(factLabel)], [label]),
      h.dd([h.Class(mono ? monoValue : factValue)], [value]),
    ]);
  const badge = (text: string, tone: "accent" | "success" | "muted") =>
    h.span([
      h.Class(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-sans text-[11px] font-medium leading-4 " +
          (tone === "accent"
            ? "bg-[var(--rm-fg)] text-[var(--rm-bg)]"
            : tone === "success"
              ? "bg-[color-mix(in_srgb,var(--rm-success,#2f9e62)_18%,transparent)] text-[var(--rm-success,#2f9e62)]"
              : "bg-[var(--rm-panel)] text-[var(--rm-secondary)]"),
      ),
    ], [text]);
  return referenceSection("models", "ok", [
    referenceCard("Model inventory", "Select a model to inspect and configure. Controller is the badge — change it from the footer.", [
      cards.length === 0
        ? h.div([h.Class("space-y-4")], [
            h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No configured models are available yet."]),
            h.div([h.Class("flex flex-wrap gap-3")], [
              h.a([h.Href("/local/choose"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Local Models"]),
              h.a([h.Href("/local/peers"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Local Endpoints"]),
              h.a([h.Href("/control/providers"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Providers"]),
            ]),
          ])
        : h.div([h.Class("grid gap-6 xl:grid-cols-2 xl:items-start")], [
            h.div([h.Class("min-w-0 space-y-4")], [
              h.div([h.Class("space-y-2")], [
                h.p([h.Class(eyebrow)], ["Models"]),
                h.div(
                  [h.Class("overflow-hidden rounded-[var(--rm-radius-field)] border border-[var(--rm-border)]")],
                  cards.map((card, index) =>
                    h.button(
                      [
                        h.Type("button"),
                        h.DataAttribute("model-card", card.id),
                        h.AriaPressed(index === cards.indexOf(selected ?? cards[0]!) ? "true" : "false"),
                        h.Class(
                          "flex w-full items-start gap-2.5 border-b border-[var(--rm-border)] px-3 py-2.5 text-left last:border-b-0 border-l-[3px] " +
                            (card.id === selected?.id ? "border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]" : "border-l-transparent"),
                        ),
                        h.OnClick(Message.ModelCardSelected({ modelId: card.id })),
                      ],
                      [
                        h.div([h.Class("min-w-0 flex-1 space-y-1")], [
                          h.div([h.Class("flex items-center justify-between gap-2")], [
                            h.span([h.Class("min-w-0 truncate font-mono text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]")], [card.displayName]),
                            badge(index === 0 ? "controller" : card.health, index === 0 ? "accent" : card.health === "healthy" ? "success" : "muted"),
                          ]),
                          h.p([h.Class("text-[12px] leading-4 text-[var(--rm-muted)]")], [
                            [card.provider, "tools", card.endpointCount + " endpoint" + (card.endpointCount === 1 ? "" : "s")].filter((part) => part.length > 0).join(" · "),
                          ]),
                        ]),
                      ],
                    ),
                  ),
                ),
              ]),
              selected === undefined
                ? null
                : h.div([h.Class("space-y-3")], [
                    h.div([h.Class("space-y-2")], [
                      h.p([h.Class(eyebrow)], ["Runtime · " + selected.displayName]),
                      h.dl([h.Class("space-y-2")], [
                        factRow("Source", selected.provider.length > 0 ? selected.provider : "—"),
                        factRow("Status", selected.health),
                        factRow("Endpoints", String(selected.endpointCount) + " " + selected.health),
                        factRow("Tool use", (selected.model.capabilities ?? []).includes("tools") ? "Enabled" : "—"),
                        factRow("Context", selected.contextWindow === null ? "—" : String(selected.contextWindow) + " tokens", true),
                        factRow("Mode", (selected.model.capabilities ?? []).join(", ") || "—"),
                      ]),
                    ]),
                    h.div([h.Class("h-px w-full bg-[var(--rm-border)]")], []),
                    h.div([h.Class("space-y-2")], [
                      h.p([h.Class(eyebrow)], ["Cost"]),
                      h.dl([h.Class("space-y-2")], [factRow("Input", "— / 1M", true), factRow("Output", "— / 1M", true)]),
                    ]),
                    h.div([h.Class("h-px w-full bg-[var(--rm-border)]")], []),
                    h.div([h.Class("space-y-2")], [
                      h.p([h.Class(eyebrow)], ["Benchmark"]),
                      h.dl([h.Class("space-y-2")], [
                        factRow("Overall", "No evidence yet"),
                        factRow("Live latency p50", "—"),
                        factRow("Live latency p95", "—"),
                        factRow("Live failure rate", "—"),
                      ]),
                    ]),
                  ]),
            ]),
            h.div([h.Class("min-w-0 space-y-3")], [
              h.div([h.Class("flex flex-col gap-1")], [
                h.div([h.Class("flex items-baseline gap-2")], [
                  h.p([h.Class(eyebrow)], ["Roles"]),
                  h.p([h.Class("font-sans text-sm font-medium text-foreground")], [selected?.displayName ?? ""]),
                  h.span([h.Class("font-sans text-xs text-muted-foreground")], ["· tasks under each role"]),
                ]),
                h.p([h.Class("font-sans text-xs leading-4 text-muted-foreground")], ["Saved immediately for this endpoint. Task and group eligibility is derived from these roles for this exact endpoint instance."]),
              ]),
              h.ul(
                [h.Class("space-y-2 pr-1"), h.DataAttribute("models-role-list", "")],
                // SAFETY: ROLE_TASK_COUNTS is a literal record; Object.keys yields its role labels.
                (selected === undefined ? [] : (Object.keys(ROLE_TASK_COUNTS) as Array<keyof typeof ROLE_TASK_COUNTS>)).map((role) => {
                  const enabled = selectedRoles.includes(role);
                  return h.li([h.Class("border-b border-[var(--rm-border)] last:border-b-0")], [
                    h.button([
                      h.Type("button"),
                      h.DataAttribute("models-role-toggle", String(role)),
                      h.AriaPressed(enabled ? "true" : "false"),
                      h.Class("flex w-full items-center gap-3 py-2 text-left"),
                      h.OnClick(Message.ModelsRoleToggled({ enabled: !enabled, modelId: selected?.id ?? "", roleId: String(role) })),
                    ], [
                      h.span([h.Attribute("aria-hidden", "true"), h.Class("flex size-4 shrink-0 items-center justify-center rounded-[4px] " + (enabled ? "bg-[var(--rm-fg)] text-[10px] text-[var(--rm-bg)]" : "border border-[var(--rm-border)]"))], [enabled ? "✓" : ""]),
                      h.span([h.Class("min-w-0 flex-1 truncate font-sans text-[13px] font-semibold leading-4 text-foreground")], [String(role)]),
                      h.span([h.Class("shrink-0 font-sans text-[12px] tabular-nums text-muted-foreground")], [String(ROLE_TASK_COUNTS[role] ?? 0) + " tasks"]),
                    ]),
                  ]);
                }),
              ),
              h.div([h.Class("flex flex-wrap gap-2 pt-2"), h.DataAttribute("models-footer-actions", "")], [
                h.button([h.Type("button"), h.AriaDisabled(selected === undefined || selected.endpointCount === 0), h.OnClick(Message.ModelsControllerSetRequested({ modelId: selected?.id ?? "" })), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Make primary controller"]),
                h.a([h.Href("/models/roles"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Roles"]),
                h.a([h.Href("/system/benchmark"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Open Benchmark"]),
                h.button([h.Type("button"), h.DataAttribute("model-eject-controller", ""), h.OnClick(Message.ModelsControllerEjectRequested({ modelId: selected?.id ?? "" })), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Eject controller"]),
                h.button([h.Type("button"), h.DataAttribute("model-remove", ""), h.AriaLabel("Remove selected model " + (selected?.displayName ?? "")), h.OnClick(Message.ModelsRemoveRequested({ modelId: selected?.id ?? "" })), h.Class("inline-flex h-[34px] items-center rounded-md border border-[var(--rm-error)] bg-background px-3 font-sans text-sm font-medium text-[var(--rm-error)]")], ["Remove model"]),
              ]),
              modelsView?.actionMessage === undefined ? null : h.p([h.Role("status"), h.DataAttribute("models-action-message", ""), h.Class("text-xs text-muted-foreground")], [modelsView.actionMessage]),
            ]),
          ]),
    ], h),
  ], h);
};

type RoleDraftState = NonNullable<NonNullable<Model["modelsView"]>["roleDraft"]>;
type RoleDraft = ReturnType<typeof blankRoleDraft>;

const draftFor = (state: RoleDraftState | undefined): RoleDraft => ({
  ...blankRoleDraft(),
  ...(state ?? {}),
  defaultSystemInstructions: state?.defaultSystemInstructions ?? state?.instructions ?? "",
  roleKind: state?.roleKind ?? state?.kind ?? "assistant",
  toolPolicyMode: state?.toolPolicyMode ?? state?.toolPolicy ?? "allowed",
});

const roleFieldClass = "h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground";
const roleTextareaClass = "min-h-20 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground";
const roleLabelClass = "flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground";
const roleInput = (id: string, label: string, value: string, onChange: (next: string) => Message, h: HtmlBuilder<Message>, multiline = false): Html =>
  h.label([h.Class(roleLabelClass)], [
    h.span([], [label]),
    multiline
      ? h.textarea([h.Id(id), h.AriaLabel(label), h.Value(value), h.Class(roleTextareaClass), h.OnInput(onChange)])
      : h.input([h.Id(id), h.AriaLabel(label), h.Value(value), h.Class(roleFieldClass), h.OnInput(onChange)]),
  ]);
const roleSelect = (id: string, label: string, value: string, options: ReadonlyArray<string>, onChange: (next: string) => Message, h: HtmlBuilder<Message>): Html =>
  h.label([h.Class(roleLabelClass)], [label, h.select([h.Id(id), h.AriaLabel(label), h.Value(value), h.Class(roleFieldClass), h.OnChange(onChange)], options.map((option) => h.option([h.Value(option)], [option])))]);

export const modelsRolesRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>, modelsView?: Model["modelsView"], rolePolicy?: ReadbackState): Html => {
  const policy = rolePolicyFromReadback(rolePolicy);
  const createDraft = draftFor(modelsView?.roleDraft);
  const selectedRoleId = modelsView?.selectedRoleId ?? policy?.roleDefinitions[0]?.role_id;
  const selectedRole = policy?.roleDefinitions.find((role) => role.role_id === selectedRoleId) ?? policy?.roleDefinitions[0];
  const editDraft = selectedRole === undefined ? null : modelsView?.roleEditDraft === undefined ? draftFromRole(selectedRole) : draftFor(modelsView.roleEditDraft);
  const expandedRole = policy?.roleDefinitions.find((role) => role.role_id === modelsView?.expandedRoleId);
  const expandedTasks = policy === null || expandedRole === undefined ? [] : tasksForRole(policy, expandedRole);
  const selections = modelsView?.roleTaskSelections ?? (policy?.taskDefinitions ?? []).map((task) => ({ roleIds: [...task.allowed_roles], taskType: task.task_type }));
  const roleActionState = modelsView?.roleAction;
  const state = rolePolicy?.status === "error" ? "error" : rolePolicy?.status === "idle" || rolePolicy?.status === "loading" ? "loading" : policy === null ? "empty" : "ok";
  const statusLine = state === "loading"
    ? "Loading runtime role policy…"
    : state === "error"
      ? (rolePolicy?.message ?? "Role policy read failed")
      : state === "empty"
        ? "No runtime role policy is available yet."
        : null;
  const kindOptions = ROLE_KIND_OPTIONS.includes(createDraft.roleKind as typeof ROLE_KIND_OPTIONS[number]) ? [...ROLE_KIND_OPTIONS] : [createDraft.roleKind, ...ROLE_KIND_OPTIONS].filter((kind) => kind.length > 0);
  const editKindOptions = editDraft !== null && ROLE_KIND_OPTIONS.includes(editDraft.roleKind as typeof ROLE_KIND_OPTIONS[number]) ? [...ROLE_KIND_OPTIONS] : [editDraft?.roleKind ?? "", ...ROLE_KIND_OPTIONS].filter((kind) => kind.length > 0);
  const advancedFields = (draft: RoleDraft, edit: boolean): ReadonlyArray<Html> => {
    const change = (field: string) => (next: string) => edit ? Message.RoleEditDraftChanged({ field: field as Parameters<typeof Message.RoleEditDraftChanged>[0]["field"], value: next }) : Message.RoleDraftChanged({ field: field as Parameters<typeof Message.RoleDraftChanged>[0]["field"], value: next });
    return [
      roleInput(edit ? "role-edit-task-types" : "role-task-types", "Supported task types", draft.taskTypesSupported, change("taskTypesSupported"), h, true),
      roleInput(edit ? "role-edit-allowed-tools" : "role-allowed-tools", "Allowed tools", draft.allowedTools, change("allowedTools"), h, true),
      roleInput(edit ? "role-edit-required" : "role-required", "Required capabilities", draft.requiredCapabilities, change("requiredCapabilities"), h, true),
      roleInput(edit ? "role-edit-preferred" : "role-preferred", "Preferred capabilities", draft.preferredCapabilities, change("preferredCapabilities"), h, true),
      roleInput(edit ? "role-edit-forbidden" : "role-forbidden", "Forbidden capabilities", draft.forbiddenCapabilities, change("forbiddenCapabilities"), h, true),
      roleInput(edit ? "role-edit-output" : "role-output", "Output contracts", draft.outputContracts, change("outputContracts"), h, true),
      roleInput(edit ? "role-edit-safety" : "role-safety", "Safety policy refs", draft.safetyPolicyRefs, change("safetyPolicyRefs"), h, true),
      roleInput(edit ? "role-edit-routing" : "role-routing", "Routing policy overrides (JSON)", draft.routingOverridesText, change("routingOverridesText"), h, true),
    ];
  };
  return referenceSection("models", state, [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Runtime roles"]),
    statusLine === null ? null : h.p([h.Class("text-xs leading-4 text-muted-foreground"), ...(state === "loading" ? [h.AriaBusy(true)] : []), ...(state === "error" ? [h.Role("alert")] : [])], [statusLine]),
    roleActionState?.message === undefined ? null : h.p([h.DataAttribute("role-action-status", roleActionState.status), h.Role(roleActionState.status === "error" ? "alert" : "status"), h.Class("text-xs leading-4 text-muted-foreground")], [roleActionState.message]),
    referenceCard("Create role", "Add a router-visible role with identity, instructions, and policy fields.", [
      h.div([h.Class("grid gap-4 md:grid-cols-2")], [
        roleInput("role-id", "Role id", createDraft.roleId, (next) => Message.RoleDraftChanged({ field: "roleId", value: next }), h),
        roleInput("role-name", "Name", createDraft.name, (next) => Message.RoleDraftChanged({ field: "name", value: next }), h),
      ]),
      h.div([h.Class("mt-4")], [roleInput("role-description", "Description", createDraft.description, (next) => Message.RoleDraftChanged({ field: "description", value: next }), h, true)]),
      h.div([h.Class("mt-4")], [roleInput("role-instructions", "Default system instructions", createDraft.defaultSystemInstructions, (next) => Message.RoleDraftChanged({ field: "defaultSystemInstructions", value: next }), h, true)]),
      h.div([h.Class("mt-4 flex flex-wrap items-end gap-3")], [
        roleSelect("role-create-kind", "Kind", createDraft.roleKind, kindOptions, (next) => Message.RoleDraftChanged({ field: "roleKind", value: next }), h),
        roleSelect("role-create-tool-policy", "Tool policy mode", createDraft.toolPolicyMode, TOOL_POLICY_OPTIONS, (next) => Message.RoleDraftChanged({ field: "toolPolicyMode", value: next }), h),
      ]),
      h.details([h.Class("mt-4")], [
        h.summary([h.Class("cursor-pointer text-sm font-medium text-foreground")], ["Advanced policy fields"]),
        h.div([h.Class("mt-4 grid gap-4 md:grid-cols-2")], advancedFields(createDraft, false)),
      ]),
      h.div([h.Class("mt-4 flex flex-wrap gap-2")], [
        h.button([h.Type("button"), h.DataAttribute("role-create", ""), h.AriaDisabled(roleActionState?.status === "saving"), h.OnClick(Message.RoleCreateRequested({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], [roleActionState?.kind === "create" && roleActionState.status === "saving" ? "Creating…" : "Create role"]),
        h.button([h.Type("button"), h.DataAttribute("role-create-reset", ""), h.OnClick(Message.RoleDraftReset({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Reset"]),
      ]),
    ], h),
    referenceCard("Role catalog", "Select a role to edit identity and task allowlists. Expand Task detail only when you need the lower-level task contract.", [
      policy === null || policy.roleDefinitions.length === 0
        ? h.p([h.Role("status"), h.Class("text-sm text-muted-foreground")], ["No runtime roles are defined yet."])
        : h.div([h.Class("max-h-[68vh] overflow-auto border border-[var(--rm-border)]")], policy.roleDefinitions.map((role) => {
            const selected = role.role_id === selectedRole?.role_id;
            const expanded = role.role_id === modelsView?.expandedRoleId;
            const roleTasks = policy === null ? [] : tasksForRole(policy, role);
            const toolLabel = role.tool_policy.mode === "allowed" ? "tools allowed" : role.tool_policy.mode === "limited" ? "tools limited" : "tools " + role.tool_policy.mode;
            return h.div([h.Class("border-b border-[var(--rm-border)] last:border-b-0 " + (selected ? "border-l-[3px] border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]" : "border-l-[3px] border-l-transparent"))], [
              h.div([h.Class("flex items-center gap-3 px-3.5 py-3")], [
                h.button([h.Type("button"), h.DataAttribute("role-catalog-select", role.role_id), h.OnClick(Message.RoleSelected({ roleId: role.role_id })), h.Class("flex min-w-0 flex-1 items-center gap-3 text-left")], [
                  h.div([h.Class("flex w-40 shrink-0 flex-col gap-0.5")], [
                    h.div([h.Class("flex flex-wrap items-center gap-1.5")], [h.span([h.Class("text-[13px] font-semibold leading-[18px] text-foreground")], [role.name]), isHighRiskRole(role) ? h.span([h.Class("rounded-full bg-[var(--rm-error)] px-2 py-0.5 text-[11px] text-white")], ["High risk"]) : null]),
                    h.span([h.Class("font-mono text-[11px] leading-4 text-muted-foreground")], [groupLabel(role.primaryGroupId ?? "ungrouped").toLowerCase() + " · " + toolLabel]),
                  ]),
                  h.span([h.Class("min-w-0 flex-1 truncate text-[13px] leading-[18px] text-muted-foreground")], [role.description]),
                  h.span([h.Class("w-[72px] shrink-0 text-right text-[12px] text-muted-foreground")], [String(roleTasks.length) + " task" + (roleTasks.length === 1 ? "" : "s")]),
                ]),
                h.button([h.Type("button"), h.DataAttribute("role-task-detail", role.role_id), h.OnClick(Message.RoleTaskDetailToggled({ roleId: role.role_id })), h.Class("inline-flex h-7 shrink-0 items-center rounded-[6px] border border-border bg-background px-2.5 text-[12px] font-semibold text-foreground")], [expanded ? "Hide task detail" : "Task detail"]),
              ]),
              expanded
                ? h.div([h.Class("space-y-2 border-t border-[var(--rm-border)] px-3.5 py-3")], roleTasks.length === 0
                    ? [h.p([h.Class("text-sm text-secondary")], ["No tasks are currently assigned."])]
                    : roleTasks.map((task) => h.div([h.Class("space-y-1")], [h.p([h.Class("font-mono text-[12px] font-semibold text-foreground")], [task.task_type]), h.p([h.Class("text-sm text-secondary")], [task.description])])))
                : null,
            ]);
          })),
    ], h),
    h.div([h.Class("grid gap-6 xl:grid-cols-2 xl:items-start")], [
      referenceCard("Role task allowlists", "Tasks stay nested under the selected role so allowlist editing follows the same role-first hierarchy shown in the catalog.", [
        policy === null || policy.taskDefinitions.length === 0
          ? h.p([h.Class("text-sm text-muted-foreground")], ["No task definitions are available yet."])
          : expandedRole === undefined
            ? h.p([h.Class("text-sm text-muted-foreground")], ["Open Task detail on a role to inspect or edit its task memberships."])
            : h.div([h.Class("max-h-[52vh] space-y-4 overflow-auto pr-1")], [
                h.div([h.Class("space-y-1 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4")], [
                  h.p([h.Class("text-sm font-semibold text-foreground")], [expandedRole.name]),
                  h.p([h.Class("text-xs leading-4 text-muted-foreground")], ["Role id: " + expandedRole.role_id + " · " + String(expandedTasks.length) + " tasks in allowlist"]),
                ]),
                ...expandedTasks.map((task) => {
                  const checked = (selections.find((entry) => entry.taskType === task.task_type)?.roleIds ?? []).includes(expandedRole.role_id);
                  return h.div([h.Class("space-y-2.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3")], [
                    h.p([h.Class("text-sm font-semibold text-foreground")], [task.task_type]),
                    h.p([h.Class("text-xs leading-4 text-muted-foreground")], [task.description]),
                    h.div([h.Class("flex flex-wrap gap-1.5")], task.required_capabilities.map((capability) => h.span([h.Class("rounded-full border border-[var(--rm-border)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground")], [capability]))),
                    h.button([h.Type("button"), h.AriaPressed(checked ? "true" : "false"), h.AriaLabel("Allow " + expandedRole.role_id + " for " + task.task_type), h.OnClick(Message.RoleTaskRoleToggled({ roleId: expandedRole.role_id, taskType: task.task_type })), h.Class("flex h-8 items-center gap-2 rounded-md border border-[var(--rm-border)] px-2.5 font-mono text-[12px] text-foreground")], [
                      h.span([h.Attribute("aria-hidden", "true"), h.Class("flex size-4 items-center justify-center rounded-[4px] " + (checked ? "bg-[var(--rm-fg)] text-[10px] text-[var(--rm-bg)]" : "border border-[var(--rm-border)]"))], [checked ? "✓" : ""]),
                      h.span([], [expandedRole.role_id]),
                    ]),
                  ]);
                }),
                h.button([h.Type("button"), h.DataAttribute("role-tasks-save", ""), h.AriaDisabled(roleActionState?.status === "saving"), h.OnClick(Message.RoleTaskAllowlistsSaveRequested({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], [roleActionState?.kind === "tasks" && roleActionState.status === "saving" ? "Saving…" : "Save task allowlists"]),
              ]),
      ], h),
      referenceCard("Edit selected role", "Update identity, instructions, tool policy, and routing overrides.", [
        editDraft === null || selectedRole === undefined
          ? h.p([h.Class("text-sm text-muted-foreground")], ["Select a role from the catalog to edit it."])
          : h.div([h.Class("max-h-[52vh] space-y-4 overflow-auto pr-1")], [
              h.div([h.Class("space-y-2 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4")], [
                h.p([h.Class("text-sm text-foreground")], ["tool policy " + editDraft.toolPolicyMode + " · supported tasks " + (selectedRole.task_types_supported.length === 0 ? "none" : selectedRole.task_types_supported.slice(0, 3).join(", ") + (selectedRole.task_types_supported.length > 3 ? " +" + String(selectedRole.task_types_supported.length - 3) : ""))]),
              ]),
              h.div([h.Class("grid gap-4 md:grid-cols-2")], [
                roleInput("role-edit-id", "Role id", editDraft.roleId, (next) => Message.RoleEditDraftChanged({ field: "roleId", value: next }), h),
                roleInput("role-edit-name", "Name", editDraft.name, (next) => Message.RoleEditDraftChanged({ field: "name", value: next }), h),
                roleSelect("role-edit-kind", "Kind", editDraft.roleKind, editKindOptions, (next) => Message.RoleEditDraftChanged({ field: "roleKind", value: next }), h),
                roleSelect("role-edit-tool-policy", "Tool policy mode", editDraft.toolPolicyMode, TOOL_POLICY_OPTIONS, (next) => Message.RoleEditDraftChanged({ field: "toolPolicyMode", value: next }), h),
              ]),
              roleInput("role-edit-description", "Description", editDraft.description, (next) => Message.RoleEditDraftChanged({ field: "description", value: next }), h, true),
              roleInput("role-edit-instructions", "Default system instructions", editDraft.defaultSystemInstructions, (next) => Message.RoleEditDraftChanged({ field: "defaultSystemInstructions", value: next }), h, true),
              roleInput("role-edit-routing-overrides", "Routing policy overrides (JSON)", editDraft.routingOverridesText, (next) => Message.RoleEditDraftChanged({ field: "routingOverridesText", value: next }), h, true),
              h.div([h.Class("flex flex-wrap gap-2")], [
                h.button([h.Type("button"), h.DataAttribute("role-edit-save", ""), h.AriaDisabled(roleActionState?.status === "saving"), h.OnClick(Message.RoleEditSaveRequested({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], [roleActionState?.kind === "edit" && roleActionState.status === "saving" ? "Saving…" : "Save role"]),
                h.button([h.Type("button"), h.DataAttribute("role-edit-reset", ""), h.OnClick(Message.RoleEditReset({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Reset"]),
              ]),
            ]),
      ], h),
    ]),
  ], h, "models-roles-state");
};

export const benchmarkRoute = (suite: ReadbackState, summary: ReadbackState, runs: ReadbackState, h: HtmlBuilder<Message>, modelsView?: Model["modelsView"], endpoints?: ReadbackState): Html => {
  const suiteCases = suite.rows.flatMap((entry) => {
    try {
      // SAFETY: benchmarkSuite rows carry this JSON record in meta.
      const meta = JSON.parse(entry.meta) as { readonly benchmarkEligible?: boolean; readonly quickBenchmark?: boolean };
      return [{ eligible: meta.benchmarkEligible === true, quick: meta.quickBenchmark === true }];
    } catch {
      return [];
    }
  });
  const quickCases = suiteCases.filter((entry) => entry.eligible && entry.quick).length;
  const eligibleCases = suiteCases.filter((entry) => entry.eligible).length;
  const endpointOptions = (endpoints?.rows ?? []).flatMap((entry) => {
    try {
      // SAFETY: modelEndpoints rows carry this JSON record in meta.
      const meta = JSON.parse(entry.meta) as { readonly endpointId?: string; readonly modelId?: string; readonly sourceType?: string };
      if (meta.endpointId === undefined) return [];
      return [{ label: (meta.modelId ?? meta.endpointId) + " (" + (meta.sourceType ?? "unknown") + ")", value: meta.endpointId }];
    } catch {
      return [];
    }
  });
  const mode: "quick" | "full" = modelsView?.benchmarkMode !== undefined && modelsView.benchmarkMode.toLowerCase().includes("full") ? "full" : "quick";
  const judge = modelsView?.benchmarkJudge ?? endpointOptions[0]?.value ?? "";
  const caseCount = mode === "quick" ? quickCases : eligibleCases;
  const modelCount = endpointOptions.length;
  let summaryHeader: { readonly completedAtMs?: number | null; readonly judgeEndpointId?: string | null; readonly judgeModelId?: string | null; readonly mode?: string | null } | undefined;
  try {
    const headerRow = summary.rows.find((entry) => entry.id === "summary");
    if (headerRow !== undefined) summaryHeader = JSON.parse(headerRow.meta) as typeof summaryHeader;
  } catch {
    summaryHeader = undefined;
  }
  const subjects = summary.rows.filter((entry) => entry.id !== "summary").flatMap((entry) => {
    try {
      // SAFETY: benchmarkSummary subject rows carry the BenchmarkSummarySubject record in meta.
      const meta = JSON.parse(entry.meta) as {
        readonly displayName?: string;
        readonly endpointId?: string;
        readonly modelId?: string;
        readonly overallScore?: number;
        readonly scoresByBucket?: Readonly<Record<"easy" | "medium" | "hard", { readonly score?: unknown; readonly cases?: unknown }>>;
        readonly sourceType?: string | null;
        readonly taxonomyScores?: Readonly<Record<string, Readonly<Record<string, number>>>>;
      };
      return [{ meta }];
    } catch {
      return [];
    }
  });
  const percent = (value: unknown): string => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? String(Math.round(parsed * 100)) + "%" : "—";
  };
  const bucket = (value: unknown): string => {
    const record = value as { readonly score?: unknown; readonly cases?: unknown } | undefined;
    if (record === undefined) return "—";
    const cases = Number(record.cases);
    return percent(record.score) + (Number.isFinite(cases) ? " · " + String(cases) : "");
  };
  const scoreRows = subjects.map(({ meta }) => [
    meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
    percent(meta.overallScore),
    "—",
    bucket(meta.scoresByBucket?.easy),
    bucket(meta.scoresByBucket?.medium),
    bucket(meta.scoresByBucket?.hard),
    "—",
    "—",
    meta.sourceType ?? "—",
  ]);
  const taxonomyRows = subjects.flatMap(({ meta }) =>
    Object.entries(meta.taxonomyScores ?? {}).flatMap(([dimension, values]) =>
      Object.entries(values).map(([value, score]) => [dimension, value, percent(score)]),
    ),
  );
  const runRows = runs.rows.flatMap((entry) => {
    try {
      // SAFETY: benchmarkRuns rows carry the BenchmarkRunListEntry record in meta.
      const meta = JSON.parse(entry.meta) as { readonly completedAtMs?: number; readonly endpointIds?: ReadonlyArray<string>; readonly mode?: string; readonly suiteId?: string };
      const completed = typeof meta.completedAtMs === "number" ? new Date(meta.completedAtMs).toISOString().slice(0, 10) : "—";
      return [[entry.id, meta.mode ?? "—", String(entry.value), String(meta.endpointIds?.length ?? 0), completed, meta.suiteId ?? "—"]];
    } catch {
      return [];
    }
  });
  const select = (label: string, options: ReadonlyArray<{ readonly label: string; readonly value: string }>, value: string, onChange: (next: string) => Message) =>
    h.label([h.Class("flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground")], [
      label,
      h.select([
        h.AriaLabel(label),
        h.Class("h-[34px] rounded-md border border-input bg-background px-2 font-sans text-sm"),
        h.OnChange((next) => onChange(next)),
      ], options.map((option) => h.option([h.Value(option.value), ...(option.value === value ? [h.Selected(true)] : [])], [option.label]))),
    ]);
  return referenceSection("models", "ok", [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Capability benchmark"]),
    referenceCard("Run capability benchmark", "Select mode and judge, then grade runnable endpoints.", [
      h.div([h.Class("flex flex-wrap items-end gap-3")], [
        select("Benchmark mode", [
          { label: "Quick (" + String(quickCases) + " hard cases)", value: "quick" },
          { label: "Full (all eligible cases)", value: "full" },
        ], mode, (next) => Message.BenchmarkModeChanged({ value: next })),
        select("Judge endpoint", endpointOptions.length === 0 ? [{ label: "No runnable endpoints", value: "" }] : endpointOptions, judge, (next) => Message.BenchmarkJudgeChanged({ value: next })),
      ]),
      h.div([h.Class("mt-4 flex flex-wrap gap-2")], [
        h.button([h.Type("button"), h.OnClick(Message.BenchmarkRunRequested({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Run " + mode + " benchmark (" + String(modelCount) + " model" + (modelCount === 1 ? "" : "s") + ", " + String(caseCount) + " cases)"]),
        h.button([h.Type("button"), h.OnClick(Message.BenchmarkClearRequested({})), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium")], ["Clear all benchmark data"]),
      ]),
    ], h),
    referenceCard("Benchmark scores", "Scores are normalized 0–1 fractions shown as percentages.", [
      h.p([h.DataAttribute("benchmark-last-run", ""), h.Class("font-mono text-xs")], ["Last run: " + (typeof summaryHeader?.completedAtMs === "number" ? new Date(summaryHeader.completedAtMs).toISOString().slice(0, 10) : "—") + " · Suite: " + (summaryHeader?.mode ?? "—") + " · Judge: " + (summaryHeader?.judgeModelId ?? summaryHeader?.judgeEndpointId ?? "—")]),
      referenceTable(["Model", "Overall", "Profile", "Easy", "Medium", "Hard", "p50", "p95", "Scope"], scoreRows, "No benchmark scores are in routing profiles yet.", h, "models"),
    ], h),
    referenceCard("Taxonomy dimensions", "Per-model scores by taxonomy dimension.", [
      referenceTable(["Dimension", "Value", "Score"], taxonomyRows, "No taxonomy dimension data is available yet.", h, "models"),
    ], h),
    referenceCard("Run history", "Completed capability benchmark runs.", [
      referenceTable(["Run", "Mode", "Cases", "Models", "Completed", "Suite"], runRows, "No completed benchmark runs yet.", h, "models"),
    ], h),
  ], h);
};
