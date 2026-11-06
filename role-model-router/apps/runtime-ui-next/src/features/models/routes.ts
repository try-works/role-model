import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import { Message } from "../../message";
import type { Model } from "../../model";
import type { ReadbackState } from "../../readback";
import {
  referenceCard,
  referenceSection,
  referenceSelect,
  referenceTable,
} from "../layout/reference";
import { telemetryChartCard } from "../overview/charts";
import {
  ROLE_KIND_OPTIONS,
  TOOL_POLICY_OPTIONS,
  blankRoleDraft,
  draftFromRole,
  draftToRolePayload,
  groupLabel,
  isHighRiskRole,
  rolePolicyFromReadback,
  tasksForRole,
} from "./role-policy";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  referenceSection(
    "models",
    "ok",
    [referenceCard(title, undefined, children, h)],
    h,
    "models-state",
  );

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3(
    [h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")],
    [label],
  );

const table = (
  headings: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  emptyText: string,
  h: HtmlBuilder<Message>,
): Html => referenceTable(headings, rows, emptyText, h, "models");

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [
  { id, label, points: [{ label: "No data", value: null }] },
];

const chart = (title: string, description: string, empty: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({
    description,
    emptyMessage: empty,
    hasData: false,
    h,
    kind: "line",
    series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title),
    state: "empty",
    title,
  });

const ROLE_TASK_COUNTS = {
  analyst: 47,
  architect: 36,
  coder: 49,
  coordinator: 24,
  creative: 14,
  data: 22,
  designer: 19,
  educator: 22,
  finance: 27,
  health: 11,
  knowledge: 16,
  legal: 22,
  marketer: 28,
  mathematician: 13,
  operator: 45,
  planner: 47,
  procurement: 18,
  product: 56,
  recruiter: 11,
  researcher: 28,
  scientist: 15,
  security: 32,
  seller: 18,
  strategist: 24,
  support: 27,
  tester: 24,
  translator: 11,
  writer: 85,
} as const;

export interface AccountEligibility {
  readonly accountId: string;
  readonly endpointId: string;
  readonly roleIds: readonly string[];
}

export const accountEligibilityFor = (
  accounts: ReadbackState | undefined,
  endpoints: ReadbackState,
  modelId: string,
  roleIds: readonly string[],
): AccountEligibility | undefined => {
  if (accounts === undefined) return undefined;
  for (const endpointRow of endpoints.rows) {
    try {
      // SAFETY: modelEndpoints rows carry this JSON record in meta.
      const endpoint = JSON.parse(endpointRow.meta) as {
        readonly endpointId?: string;
        readonly modelId?: string;
        readonly providerAccountId?: string;
        readonly sourceType?: string;
      };
      if (
        endpoint.modelId !== modelId ||
        endpoint.sourceType === "local" ||
        typeof endpoint.providerAccountId !== "string" ||
        typeof endpoint.endpointId !== "string"
      )
        continue;
      for (const accountRow of accounts.rows) {
        try {
          // SAFETY: providerAccounts rows carry the full account JSON in meta.
          const account = JSON.parse(accountRow.meta) as Record<string, unknown>;
          if (account.providerAccountId !== endpoint.providerAccountId) continue;
          const bindings = Array.isArray(account.modelRoleBindings)
            ? account.modelRoleBindings
            : [];
          const binding =
            bindings.find(
              (entry) =>
                entry !== null &&
                typeof entry === "object" &&
                (entry as Record<string, unknown>).endpointId === endpoint.endpointId,
            ) ??
            bindings.find(
              (entry) =>
                entry !== null &&
                typeof entry === "object" &&
                (entry as Record<string, unknown>).endpointId === undefined &&
                (entry as Record<string, unknown>).modelId === modelId,
            );
          const mode =
            binding === undefined || binding === null
              ? "all"
              : (binding as Record<string, unknown>).roleAssignmentMode;
          if (mode === "all" || mode === undefined)
            return {
              accountId: endpoint.providerAccountId,
              endpointId: endpoint.endpointId,
              roleIds,
            };
          const disabled = new Set(
            Array.isArray((binding as Record<string, unknown>).disabledRoleIds)
              ? ((binding as Record<string, unknown>).disabledRoleIds as unknown[]).filter(
                  (id): id is string => typeof id === "string",
                )
              : [],
          );
          const enabled = Array.isArray((binding as Record<string, unknown>).enabledRoleIds)
            ? ((binding as Record<string, unknown>).enabledRoleIds as unknown[]).filter(
                (id): id is string => typeof id === "string",
              )
            : [];
          return {
            accountId: endpoint.providerAccountId,
            endpointId: endpoint.endpointId,
            roleIds: mode === "exclude" ? roleIds.filter((id) => !disabled.has(id)) : enabled,
          };
        } catch {
          // Unparseable accounts fall through to the next row.
        }
      }
    } catch {
      // Unparseable endpoints cannot identify an account.
    }
  }
  return undefined;
};

export const modelsRoute = (
  models: ReadbackState,
  endpoints: ReadbackState,
  h: HtmlBuilder<Message>,
  modelsView?: Model["modelsView"],
  rolePolicy?: ReadbackState,
  accounts?: ReadbackState,
): Html => {
  const rolePolicyValue = rolePolicyFromReadback(rolePolicy);
  const roleCatalog =
    rolePolicyValue?.roleDefinitions.map((role) => role.role_id) ??
    (Object.keys(ROLE_TASK_COUNTS) as Array<keyof typeof ROLE_TASK_COUNTS>);
  const allRoleIds =
    rolePolicyValue?.roleDefinitions.map((role) => role.role_id) ??
    (Object.keys(ROLE_TASK_COUNTS) as string[]);
  const taskCount = (roleId: string): number => {
    // SAFETY: the fallback catalog is exactly the ROLE_TASK_COUNTS record keys.
    if (rolePolicyValue === null || rolePolicyValue === undefined)
      return Number(ROLE_TASK_COUNTS[roleId as keyof typeof ROLE_TASK_COUNTS] ?? 0);
    const definition = rolePolicyValue.roleDefinitions.find((role) => role.role_id === roleId);
    // SAFETY: the fallback catalog is exactly the ROLE_TASK_COUNTS record keys.
    return definition === undefined
      ? Number(ROLE_TASK_COUNTS[roleId as keyof typeof ROLE_TASK_COUNTS] ?? 0)
      : tasksForRole(rolePolicyValue, definition).length;
  };
  const endpointMeta = endpoints.rows.flatMap((row) => {
    try {
      // SAFETY: modelEndpoints writes this JSON object; fields are read defensively.
      return [
        JSON.parse(row.meta) as {
          readonly endpointId?: string;
          readonly healthStatus?: string;
          readonly modelId?: string;
          readonly roleIds?: readonly string[];
          readonly status?: string;
        },
      ];
    } catch {
      return [];
    }
  });
  const cards = models.rows.map((row) => {
    let meta: {
      readonly capabilities?: readonly string[];
      readonly contextWindow?: number | null;
      readonly endpointIds?: readonly string[];
      readonly id?: string;
      readonly providerId?: string;
    } = {};
    try {
      meta = JSON.parse(row.meta) as typeof meta;
    } catch {
      meta = {};
    }
    const endpointsForModel = endpointMeta.filter(
      (endpoint) =>
        endpoint.modelId === row.id || (meta.endpointIds ?? []).includes(endpoint.endpointId ?? ""),
    );
    const health = endpointsForModel[0]?.healthStatus ?? endpointsForModel[0]?.status ?? "unknown";
    const endpointRoles = [
      ...new Set(endpointsForModel.flatMap((endpoint) => endpoint.roleIds ?? [])),
    ];
    const account = accountEligibilityFor(accounts, endpoints, row.id, allRoleIds);
    const roles = endpointRoles.length > 0 ? endpointRoles : (account?.roleIds ?? []);
    return {
      contextWindow: meta.contextWindow ?? null,
      displayName: row.label,
      endpointCount: endpointsForModel.length,
      health,
      id: row.id,
      model: meta,
      provider: row.value,
      roles:
        roles.length > 0
          ? roles
          : (Object.keys(ROLE_TASK_COUNTS) as Array<keyof typeof ROLE_TASK_COUNTS>).slice(0, 8),
    };
  });
  const selected = cards.find((card) => card.id === modelsView?.selectedModelId) ?? cards[0];
  const roleOverrides = modelsView?.roleOverrides ?? [];
  const selectedRoles = (selected?.roles ?? []).filter((role) => {
    const override = roleOverrides.find(
      (entry) => entry.modelId === selected?.id && entry.roleId === role,
    );
    return override === undefined ? true : override.enabled;
  });
  const eyebrow =
    "font-sans text-[11px] font-semibold uppercase leading-[14px] tracking-[0.04em] text-[var(--rm-muted)]";
  const factLabel = "font-sans text-[13px] leading-[18px] text-[var(--rm-muted)]";
  const factValue =
    "text-right font-sans text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";
  const monoValue = "text-right font-mono text-[12px] font-semibold leading-4 text-[var(--rm-fg)]";
  const factRow = (label: string, value: string, mono = false) =>
    h.div(
      [h.Class("flex items-baseline justify-between gap-3")],
      [h.dt([h.Class(factLabel)], [label]), h.dd([h.Class(mono ? monoValue : factValue)], [value])],
    );
  const badge = (text: string, tone: "accent" | "success" | "muted") =>
    h.span(
      [
        h.Class(
          `inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-sans text-[11px] font-medium leading-4 ${
            tone === "accent"
              ? "bg-[var(--rm-fg)] text-[var(--rm-bg)]"
              : tone === "success"
                ? "bg-[color-mix(in_srgb,var(--rm-success,#2f9e62)_18%,transparent)] text-[var(--rm-success,#2f9e62)]"
                : "bg-[var(--rm-panel)] text-[var(--rm-secondary)]"
          }`,
        ),
      ],
      [text],
    );
  return referenceSection(
    "models",
    "ok",
    [
      referenceCard(
        "Model inventory",
        "Select a model to inspect and configure. Controller is the badge — change it from the footer.",
        [
          cards.length === 0
            ? h.div(
                [h.Class("space-y-4")],
                [
                  h.p(
                    [h.Class("text-sm leading-5 text-muted-foreground")],
                    ["No configured models are available yet."],
                  ),
                  h.div(
                    [h.Class("flex flex-wrap gap-3")],
                    [
                      h.a(
                        [
                          h.Href("/local/choose"),
                          h.Class(
                            "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
                          ),
                        ],
                        ["Open Local Models"],
                      ),
                      h.a(
                        [
                          h.Href("/local/peers"),
                          h.Class(
                            "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
                          ),
                        ],
                        ["Open Local Endpoints"],
                      ),
                      h.a(
                        [
                          h.Href("/control/providers"),
                          h.Class(
                            "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
                          ),
                        ],
                        ["Open Providers"],
                      ),
                    ],
                  ),
                ],
              )
            : h.div(
                [h.Class("grid gap-6 xl:grid-cols-2 xl:items-start")],
                [
                  h.div(
                    [h.Class("min-w-0 space-y-4")],
                    [
                      h.div(
                        [h.Class("space-y-2")],
                        [
                          h.p([h.Class(eyebrow)], ["Models"]),
                          h.div(
                            [
                              h.Class(
                                "overflow-hidden rounded-[var(--rm-radius-field)] border border-[var(--rm-border)]",
                              ),
                            ],
                            cards.map((card, index) =>
                              h.button(
                                [
                                  h.Type("button"),
                                  h.DataAttribute("model-card", card.id),
                                  h.AriaPressed(
                                    index === cards.indexOf(selected ?? cards[0]!)
                                      ? "true"
                                      : "false",
                                  ),
                                  h.Class(
                                    `flex w-full items-start gap-2.5 border-b border-[var(--rm-border)] px-3 py-2.5 text-left last:border-b-0 border-l-[3px] ${
                                      card.id === selected?.id
                                        ? "border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]"
                                        : "border-l-transparent"
                                    }`,
                                  ),
                                  h.OnClick(Message.ModelCardSelected({ modelId: card.id })),
                                ],
                                [
                                  h.div(
                                    [h.Class("min-w-0 flex-1 space-y-1")],
                                    [
                                      h.div(
                                        [h.Class("flex items-center justify-between gap-2")],
                                        [
                                          h.span(
                                            [
                                              h.Class(
                                                "min-w-0 truncate font-mono text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]",
                                              ),
                                            ],
                                            [card.displayName],
                                          ),
                                          badge(
                                            index === 0 ? "controller" : card.health,
                                            index === 0
                                              ? "accent"
                                              : card.health === "healthy"
                                                ? "success"
                                                : "muted",
                                          ),
                                        ],
                                      ),
                                      h.p(
                                        [h.Class("text-[12px] leading-4 text-[var(--rm-muted)]")],
                                        [
                                          [
                                            card.provider,
                                            "tools",
                                            `${card.endpointCount} endpoint${card.endpointCount === 1 ? "" : "s"}`,
                                          ]
                                            .filter((part) => part.length > 0)
                                            .join(" · "),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      selected === undefined
                        ? null
                        : h.div(
                            [h.Class("space-y-3")],
                            [
                              h.div(
                                [h.Class("space-y-2")],
                                [
                                  h.p([h.Class(eyebrow)], [`Runtime · ${selected.displayName}`]),
                                  h.dl(
                                    [h.Class("space-y-2")],
                                    [
                                      factRow(
                                        "Source",
                                        selected.provider.length > 0 ? selected.provider : "—",
                                      ),
                                      factRow("Status", selected.health),
                                      factRow(
                                        "Endpoints",
                                        `${String(selected.endpointCount)} ${selected.health}`,
                                      ),
                                      factRow(
                                        "Tool use",
                                        (selected.model.capabilities ?? []).includes("tools")
                                          ? "Enabled"
                                          : "—",
                                      ),
                                      factRow(
                                        "Context",
                                        selected.contextWindow === null
                                          ? "—"
                                          : `${String(selected.contextWindow)} tokens`,
                                        true,
                                      ),
                                      factRow(
                                        "Mode",
                                        (selected.model.capabilities ?? []).join(", ") || "—",
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              h.div([h.Class("h-px w-full bg-[var(--rm-border)]")], []),
                              h.div(
                                [h.Class("space-y-2")],
                                [
                                  h.p([h.Class(eyebrow)], ["Cost"]),
                                  h.dl(
                                    [h.Class("space-y-2")],
                                    [
                                      factRow("Input", "— / 1M", true),
                                      factRow("Output", "— / 1M", true),
                                    ],
                                  ),
                                ],
                              ),
                              h.div([h.Class("h-px w-full bg-[var(--rm-border)]")], []),
                              h.div(
                                [h.Class("space-y-2")],
                                [
                                  h.p([h.Class(eyebrow)], ["Benchmark"]),
                                  h.dl(
                                    [h.Class("space-y-2")],
                                    [
                                      factRow("Overall", "No evidence yet"),
                                      factRow("Live latency p50", "—"),
                                      factRow("Live latency p95", "—"),
                                      factRow("Live failure rate", "—"),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                    ],
                  ),
                  h.div(
                    [h.Class("min-w-0 space-y-3")],
                    [
                      h.div(
                        [h.Class("flex flex-col gap-1")],
                        [
                          h.div(
                            [h.Class("flex items-baseline gap-2")],
                            [
                              h.p([h.Class(eyebrow)], ["Roles"]),
                              h.p(
                                [h.Class("font-sans text-sm font-medium text-foreground")],
                                [selected?.displayName ?? ""],
                              ),
                              h.span(
                                [h.Class("font-sans text-xs text-muted-foreground")],
                                ["· tasks under each role"],
                              ),
                            ],
                          ),
                          h.p(
                            [h.Class("font-sans text-xs leading-4 text-muted-foreground")],
                            [
                              "Saved immediately for this endpoint. Task and group eligibility is derived from these roles for this exact endpoint instance.",
                            ],
                          ),
                        ],
                      ),
                      h.ul(
                        [h.Class("space-y-2 pr-1"), h.DataAttribute("models-role-list", "")],
                        (selected === undefined ? [] : roleCatalog).map((role) => {
                          const enabled = selectedRoles.includes(role);
                          return h.li(
                            [h.Class("border-b border-[var(--rm-border)] last:border-b-0")],
                            [
                              h.button(
                                [
                                  h.Type("button"),
                                  h.DataAttribute("models-role-toggle", String(role)),
                                  h.AriaPressed(enabled ? "true" : "false"),
                                  h.Class("flex w-full items-center gap-3 py-2 text-left"),
                                  // Remote/account-managed toggles upsert the provider account modelRoleBindings; local
                                  // peers/llama-swap use the local model-role route.
                                  h.OnClick(
                                    Message.ModelsRoleToggled({
                                      enabled: !enabled,
                                      modelId: selected?.id ?? "",
                                      roleId: String(role),
                                    }),
                                  ),
                                ],
                                [
                                  h.span(
                                    [
                                      h.Attribute("aria-hidden", "true"),
                                      h.Class(
                                        `flex size-4 shrink-0 items-center justify-center rounded-[4px] ${
                                          enabled
                                            ? "bg-[var(--rm-fg)] text-[10px] text-[var(--rm-bg)]"
                                            : "border border-[var(--rm-border)]"
                                        }`,
                                      ),
                                    ],
                                    [enabled ? "✓" : ""],
                                  ),
                                  h.span(
                                    [
                                      h.Class(
                                        "min-w-0 flex-1 truncate font-sans text-[13px] font-semibold leading-4 text-foreground",
                                      ),
                                    ],
                                    [String(role)],
                                  ),
                                  h.span(
                                    [
                                      h.Class(
                                        "shrink-0 font-sans text-[12px] tabular-nums text-muted-foreground",
                                      ),
                                    ],
                                    [`${String(taskCount(String(role)))} tasks`],
                                  ),
                                ],
                              ),
                            ],
                          );
                        }),
                      ),
                      (() => {
                        const account =
                          selected === undefined
                            ? undefined
                            : accountEligibilityFor(accounts, endpoints, selected.id, allRoleIds);
                        return account === undefined
                          ? null
                          : h.div(
                              [
                                h.Class(
                                  "rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground",
                                ),
                                h.DataAttribute("models-account-eligibility", account.accountId),
                              ],
                              [
                                `Account role eligibility · ${account.accountId} · ${account.roleIds.join(", ")}`,
                              ],
                            );
                      })(),
                      h.div(
                        [
                          h.Class("flex flex-wrap gap-2 pt-2"),
                          h.DataAttribute("models-footer-actions", ""),
                        ],
                        [
                          h.button(
                            [
                              h.Type("button"),
                              h.AriaDisabled(
                                selected === undefined || selected.endpointCount === 0,
                              ),
                              h.OnClick(
                                Message.ModelsControllerSetRequested({
                                  modelId: selected?.id ?? "",
                                }),
                              ),
                              h.Class(
                                "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
                              ),
                            ],
                            ["Make primary controller"],
                          ),
                          h.a(
                            [
                              h.Href("/models/roles"),
                              h.Class(
                                "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
                              ),
                            ],
                            ["Open Roles"],
                          ),
                          h.a(
                            [
                              h.Href("/system/benchmark"),
                              h.Class(
                                "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
                              ),
                            ],
                            ["Open Benchmark"],
                          ),
                          h.button(
                            [
                              h.Type("button"),
                              h.DataAttribute("model-eject-controller", ""),
                              h.Disabled(true),
                              h.AriaDisabled(true),
                              h.Attribute(
                                "title",
                                "Controller ejection is not supported by the host API; remove the controller model instead.",
                              ),
                              h.Class(
                                "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground opacity-50",
                              ),
                            ],
                            ["Eject controller"],
                          ),
                          h.button(
                            [
                              h.Type("button"),
                              h.DataAttribute("model-remove", ""),
                              h.AriaLabel(`Remove selected model ${selected?.displayName ?? ""}`),
                              h.OnClick(
                                Message.ModelsRemoveRequested({ modelId: selected?.id ?? "" }),
                              ),
                              h.Class(
                                "inline-flex h-[34px] items-center rounded-md border border-[var(--rm-error)] bg-background px-3 font-sans text-sm font-medium text-[var(--rm-error)]",
                              ),
                            ],
                            [
                              modelsView?.removeConfirmation === selected?.id
                                ? "Confirm remove model"
                                : "Remove model",
                            ],
                          ),
                        ],
                      ),
                      modelsView?.actionMessage === undefined
                        ? null
                        : h.p(
                            [
                              h.Role("status"),
                              h.DataAttribute("models-action-message", ""),
                              h.Class("text-xs text-muted-foreground"),
                            ],
                            [modelsView.actionMessage],
                          ),
                    ],
                  ),
                ],
              ),
        ],
        h,
      ),
    ],
    h,
  );
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

const roleFieldClass =
  "h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground";
const roleTextareaClass =
  "min-h-20 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground";
const roleLabelClass = "flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground";
const roleInput = (
  id: string,
  label: string,
  value: string,
  onChange: (next: string) => Message,
  h: HtmlBuilder<Message>,
  multiline = false,
): Html =>
  h.label(
    [h.Class(roleLabelClass)],
    [
      h.span([], [label]),
      multiline
        ? h.textarea([
            h.Id(id),
            h.AriaLabel(label),
            h.Value(value),
            h.Class(roleTextareaClass),
            h.OnInput(onChange),
          ])
        : h.input([
            h.Id(id),
            h.AriaLabel(label),
            h.Value(value),
            h.Class(roleFieldClass),
            h.OnInput(onChange),
          ]),
    ],
  );
const roleSelect = (
  id: string,
  label: string,
  value: string,
  options: ReadonlyArray<string>,
  onChange: (next: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.label(
    [h.Class(roleLabelClass)],
    [
      label,
      h.select(
        [
          h.Id(id),
          h.AriaLabel(label),
          h.Value(value),
          h.Class(roleFieldClass),
          h.OnChange(onChange),
        ],
        options.map((option) => h.option([h.Value(option)], [option])),
      ),
    ],
  );

export const modelsRolesRoute = (
  models: ReadbackState,
  endpoints: ReadbackState,
  h: HtmlBuilder<Message>,
  modelsView?: Model["modelsView"],
  rolePolicy?: ReadbackState,
): Html => {
  const policy = rolePolicyFromReadback(rolePolicy);
  const createDraft = draftFor(modelsView?.roleDraft);
  const selectedRoleId = modelsView?.selectedRoleId ?? policy?.roleDefinitions[0]?.role_id;
  const selectedRole =
    policy?.roleDefinitions.find((role) => role.role_id === selectedRoleId) ??
    policy?.roleDefinitions[0];
  const editDraft =
    selectedRole === undefined
      ? null
      : modelsView?.roleEditDraft === undefined
        ? draftFromRole(selectedRole)
        : draftFor(modelsView.roleEditDraft);
  const expandedRole = policy?.roleDefinitions.find(
    (role) => role.role_id === modelsView?.expandedRoleId,
  );
  const expandedTasks =
    policy === null || expandedRole === undefined ? [] : tasksForRole(policy, expandedRole);
  const selections =
    modelsView?.roleTaskSelections ??
    (policy?.taskDefinitions ?? []).map((task) => ({
      roleIds: [...task.allowed_roles],
      taskType: task.task_type,
    }));
  const roleActionState = modelsView?.roleAction;
  const state =
    rolePolicy?.status === "error"
      ? "error"
      : rolePolicy?.status === "idle" || rolePolicy?.status === "loading"
        ? "loading"
        : policy === null
          ? "empty"
          : "ok";
  const statusLine =
    state === "loading"
      ? "Loading runtime role policy…"
      : state === "error"
        ? (rolePolicy?.message ?? "Role policy read failed")
        : state === "empty"
          ? "No runtime role policy is available yet."
          : null;
  const kindOptions = ROLE_KIND_OPTIONS.includes(
    createDraft.roleKind as (typeof ROLE_KIND_OPTIONS)[number],
  )
    ? [...ROLE_KIND_OPTIONS]
    : [createDraft.roleKind, ...ROLE_KIND_OPTIONS].filter((kind) => kind.length > 0);
  const editKindOptions =
    editDraft !== null &&
    ROLE_KIND_OPTIONS.includes(editDraft.roleKind as (typeof ROLE_KIND_OPTIONS)[number])
      ? [...ROLE_KIND_OPTIONS]
      : [editDraft?.roleKind ?? "", ...ROLE_KIND_OPTIONS].filter((kind) => kind.length > 0);
  const advancedFields = (draft: RoleDraft, edit: boolean): ReadonlyArray<Html> => {
    const change = (field: string) => (next: string) =>
      edit
        ? Message.RoleEditDraftChanged({
            field: field as Parameters<typeof Message.RoleEditDraftChanged>[0]["field"],
            value: next,
          })
        : Message.RoleDraftChanged({
            field: field as Parameters<typeof Message.RoleDraftChanged>[0]["field"],
            value: next,
          });
    return [
      roleInput(
        edit ? "role-edit-task-types" : "role-task-types",
        "Supported task types",
        draft.taskTypesSupported,
        change("taskTypesSupported"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-allowed-tools" : "role-allowed-tools",
        "Allowed tools",
        draft.allowedTools,
        change("allowedTools"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-required" : "role-required",
        "Required capabilities",
        draft.requiredCapabilities,
        change("requiredCapabilities"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-preferred" : "role-preferred",
        "Preferred capabilities",
        draft.preferredCapabilities,
        change("preferredCapabilities"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-forbidden" : "role-forbidden",
        "Forbidden capabilities",
        draft.forbiddenCapabilities,
        change("forbiddenCapabilities"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-output" : "role-output",
        "Output contracts",
        draft.outputContracts,
        change("outputContracts"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-safety" : "role-safety",
        "Safety policy refs",
        draft.safetyPolicyRefs,
        change("safetyPolicyRefs"),
        h,
        true,
      ),
      roleInput(
        edit ? "role-edit-routing" : "role-routing",
        "Routing policy overrides (JSON)",
        draft.routingOverridesText,
        change("routingOverridesText"),
        h,
        true,
      ),
    ];
  };
  return referenceSection(
    "models",
    state,
    [
      h.h2(
        [h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")],
        ["Runtime roles"],
      ),
      statusLine === null
        ? null
        : h.p(
            [
              h.Class("text-xs leading-4 text-muted-foreground"),
              ...(state === "loading" ? [h.AriaBusy(true)] : []),
              ...(state === "error" ? [h.Role("alert")] : []),
            ],
            [statusLine],
          ),
      roleActionState?.message === undefined
        ? null
        : h.p(
            [
              h.DataAttribute("role-action-status", roleActionState.status),
              h.Role(roleActionState.status === "error" ? "alert" : "status"),
              h.Class("text-xs leading-4 text-muted-foreground"),
            ],
            [roleActionState.message],
          ),
      referenceCard(
        "Create role",
        "Add a router-visible role with identity, instructions, and policy fields.",
        [
          h.div(
            [h.Class("grid gap-4 md:grid-cols-2")],
            [
              roleInput(
                "role-id",
                "Role id",
                createDraft.roleId,
                (next) => Message.RoleDraftChanged({ field: "roleId", value: next }),
                h,
              ),
              roleInput(
                "role-name",
                "Name",
                createDraft.name,
                (next) => Message.RoleDraftChanged({ field: "name", value: next }),
                h,
              ),
            ],
          ),
          h.div(
            [h.Class("mt-4")],
            [
              roleInput(
                "role-description",
                "Description",
                createDraft.description,
                (next) => Message.RoleDraftChanged({ field: "description", value: next }),
                h,
                true,
              ),
            ],
          ),
          h.div(
            [h.Class("mt-4")],
            [
              roleInput(
                "role-instructions",
                "Default system instructions",
                createDraft.defaultSystemInstructions,
                (next) =>
                  Message.RoleDraftChanged({ field: "defaultSystemInstructions", value: next }),
                h,
                true,
              ),
            ],
          ),
          h.div(
            [h.Class("mt-4 flex flex-wrap items-end gap-3")],
            [
              roleSelect(
                "role-create-kind",
                "Kind",
                createDraft.roleKind,
                kindOptions,
                (next) => Message.RoleDraftChanged({ field: "roleKind", value: next }),
                h,
              ),
              roleSelect(
                "role-create-tool-policy",
                "Tool policy mode",
                createDraft.toolPolicyMode,
                TOOL_POLICY_OPTIONS,
                (next) => Message.RoleDraftChanged({ field: "toolPolicyMode", value: next }),
                h,
              ),
            ],
          ),
          h.details(
            [h.Class("mt-4")],
            [
              h.summary(
                [h.Class("cursor-pointer text-sm font-medium text-foreground")],
                ["Advanced policy fields"],
              ),
              h.div(
                [h.Class("mt-4 grid gap-4 md:grid-cols-2")],
                advancedFields(createDraft, false),
              ),
            ],
          ),
          h.div(
            [h.Class("mt-4 flex flex-wrap gap-2")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("role-create", ""),
                  h.AriaDisabled(roleActionState?.status === "saving"),
                  h.OnClick(Message.RoleCreateRequested({})),
                  h.Class(
                    "inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground",
                  ),
                ],
                [
                  roleActionState?.kind === "create" && roleActionState.status === "saving"
                    ? "Creating…"
                    : "Create role",
                ],
              ),
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("role-create-reset", ""),
                  h.OnClick(Message.RoleDraftReset({})),
                  h.Class(
                    "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground",
                  ),
                ],
                ["Reset"],
              ),
            ],
          ),
        ],
        h,
      ),
      referenceCard(
        "Role catalog",
        "Select a role to edit identity and task allowlists. Expand Task detail only when you need the lower-level task contract.",
        [
          policy === null || policy.roleDefinitions.length === 0
            ? h.p(
                [h.Role("status"), h.Class("text-sm text-muted-foreground")],
                ["No runtime roles are defined yet."],
              )
            : h.div(
                [h.Class("max-h-[68vh] overflow-auto border border-[var(--rm-border)]")],
                policy.roleDefinitions.map((role) => {
                  const selected = role.role_id === selectedRole?.role_id;
                  const expanded = role.role_id === modelsView?.expandedRoleId;
                  const roleTasks = policy === null ? [] : tasksForRole(policy, role);
                  const toolLabel =
                    role.tool_policy.mode === "allowed"
                      ? "tools allowed"
                      : role.tool_policy.mode === "limited"
                        ? "tools limited"
                        : `tools ${role.tool_policy.mode}`;
                  return h.div(
                    [
                      h.Class(
                        `border-b border-[var(--rm-border)] last:border-b-0 ${
                          selected
                            ? "border-l-[3px] border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]"
                            : "border-l-[3px] border-l-transparent"
                        }`,
                      ),
                    ],
                    [
                      h.div(
                        [h.Class("flex items-center gap-3 px-3.5 py-3")],
                        [
                          h.button(
                            [
                              h.Type("button"),
                              h.DataAttribute("role-catalog-select", role.role_id),
                              h.OnClick(Message.RoleSelected({ roleId: role.role_id })),
                              h.Class("flex min-w-0 flex-1 items-center gap-3 text-left"),
                            ],
                            [
                              h.div(
                                [h.Class("flex w-40 shrink-0 flex-col gap-0.5")],
                                [
                                  h.div(
                                    [h.Class("flex flex-wrap items-center gap-1.5")],
                                    [
                                      h.span(
                                        [
                                          h.Class(
                                            "text-[13px] font-semibold leading-[18px] text-foreground",
                                          ),
                                        ],
                                        [role.name],
                                      ),
                                      isHighRiskRole(role)
                                        ? h.span(
                                            [
                                              h.Class(
                                                "rounded-full bg-[var(--rm-error)] px-2 py-0.5 text-[11px] text-white",
                                              ),
                                            ],
                                            ["High risk"],
                                          )
                                        : null,
                                    ],
                                  ),
                                  h.span(
                                    [
                                      h.Class(
                                        "font-mono text-[11px] leading-4 text-muted-foreground",
                                      ),
                                    ],
                                    [
                                      `${groupLabel(role.primaryGroupId ?? "ungrouped").toLowerCase()} · ${toolLabel}`,
                                    ],
                                  ),
                                ],
                              ),
                              h.span(
                                [
                                  h.Class(
                                    "min-w-0 flex-1 truncate text-[13px] leading-[18px] text-muted-foreground",
                                  ),
                                ],
                                [role.description],
                              ),
                              h.span(
                                [
                                  h.Class(
                                    "w-[72px] shrink-0 text-right text-[12px] text-muted-foreground",
                                  ),
                                ],
                                [
                                  `${String(roleTasks.length)} task${roleTasks.length === 1 ? "" : "s"}`,
                                ],
                              ),
                            ],
                          ),
                          h.button(
                            [
                              h.Type("button"),
                              h.DataAttribute("role-task-detail", role.role_id),
                              h.OnClick(Message.RoleTaskDetailToggled({ roleId: role.role_id })),
                              h.Class(
                                "inline-flex h-7 shrink-0 items-center rounded-[6px] border border-border bg-background px-2.5 text-[12px] font-semibold text-foreground",
                              ),
                            ],
                            [expanded ? "Hide task detail" : "Task detail"],
                          ),
                        ],
                      ),
                      expanded
                        ? h.div(
                            [h.Class("space-y-2 border-t border-[var(--rm-border)] px-3.5 py-3")],
                            roleTasks.length === 0
                              ? [
                                  h.p(
                                    [h.Class("text-sm text-secondary")],
                                    ["No tasks are currently assigned."],
                                  ),
                                ]
                              : roleTasks.map((task) =>
                                  h.div(
                                    [h.Class("space-y-1")],
                                    [
                                      h.p(
                                        [
                                          h.Class(
                                            "font-mono text-[12px] font-semibold text-foreground",
                                          ),
                                        ],
                                        [task.task_type],
                                      ),
                                      h.p([h.Class("text-sm text-secondary")], [task.description]),
                                    ],
                                  ),
                                ),
                          )
                        : null,
                    ],
                  );
                }),
              ),
        ],
        h,
      ),
      h.div(
        [h.Class("grid gap-6 xl:grid-cols-2 xl:items-start")],
        [
          referenceCard(
            "Role task allowlists",
            "Tasks stay nested under the selected role so allowlist editing follows the same role-first hierarchy shown in the catalog.",
            [
              policy === null || policy.taskDefinitions.length === 0
                ? h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    ["No task definitions are available yet."],
                  )
                : expandedRole === undefined
                  ? h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      ["Open Task detail on a role to inspect or edit its task memberships."],
                    )
                  : h.div(
                      [h.Class("max-h-[52vh] space-y-4 overflow-auto pr-1")],
                      [
                        h.div(
                          [
                            h.Class(
                              "space-y-1 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4",
                            ),
                          ],
                          [
                            h.p(
                              [h.Class("text-sm font-semibold text-foreground")],
                              [expandedRole.name],
                            ),
                            h.p(
                              [h.Class("text-xs leading-4 text-muted-foreground")],
                              [
                                `Role id: ${expandedRole.role_id} · ${String(expandedTasks.length)} tasks in allowlist`,
                              ],
                            ),
                          ],
                        ),
                        ...expandedTasks.map((task) => {
                          const checked = (
                            selections.find((entry) => entry.taskType === task.task_type)
                              ?.roleIds ?? []
                          ).includes(expandedRole.role_id);
                          return h.div(
                            [
                              h.Class(
                                "space-y-2.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3",
                              ),
                            ],
                            [
                              h.p(
                                [h.Class("text-sm font-semibold text-foreground")],
                                [task.task_type],
                              ),
                              h.p(
                                [h.Class("text-xs leading-4 text-muted-foreground")],
                                [task.description],
                              ),
                              h.div(
                                [h.Class("flex flex-wrap gap-1.5")],
                                task.required_capabilities.map((capability) =>
                                  h.span(
                                    [
                                      h.Class(
                                        "rounded-full border border-[var(--rm-border)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground",
                                      ),
                                    ],
                                    [capability],
                                  ),
                                ),
                              ),
                              h.button(
                                [
                                  h.Type("button"),
                                  h.AriaPressed(checked ? "true" : "false"),
                                  h.AriaLabel(
                                    `Allow ${expandedRole.role_id} for ${task.task_type}`,
                                  ),
                                  h.OnClick(
                                    Message.RoleTaskRoleToggled({
                                      roleId: expandedRole.role_id,
                                      taskType: task.task_type,
                                    }),
                                  ),
                                  h.Class(
                                    "flex h-8 items-center gap-2 rounded-md border border-[var(--rm-border)] px-2.5 font-mono text-[12px] text-foreground",
                                  ),
                                ],
                                [
                                  h.span(
                                    [
                                      h.Attribute("aria-hidden", "true"),
                                      h.Class(
                                        `flex size-4 items-center justify-center rounded-[4px] ${
                                          checked
                                            ? "bg-[var(--rm-fg)] text-[10px] text-[var(--rm-bg)]"
                                            : "border border-[var(--rm-border)]"
                                        }`,
                                      ),
                                    ],
                                    [checked ? "✓" : ""],
                                  ),
                                  h.span([], [expandedRole.role_id]),
                                ],
                              ),
                            ],
                          );
                        }),
                        h.button(
                          [
                            h.Type("button"),
                            h.DataAttribute("role-tasks-save", ""),
                            h.AriaDisabled(roleActionState?.status === "saving"),
                            h.OnClick(Message.RoleTaskAllowlistsSaveRequested({})),
                            h.Class(
                              "inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground",
                            ),
                          ],
                          [
                            roleActionState?.kind === "tasks" && roleActionState.status === "saving"
                              ? "Saving…"
                              : "Save task allowlists",
                          ],
                        ),
                      ],
                    ),
            ],
            h,
          ),
          referenceCard(
            "Edit selected role",
            "Update identity, instructions, tool policy, and routing overrides.",
            [
              editDraft === null || selectedRole === undefined
                ? h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    ["Select a role from the catalog to edit it."],
                  )
                : h.div(
                    [h.Class("max-h-[52vh] space-y-4 overflow-auto pr-1")],
                    [
                      h.div(
                        [
                          h.Class(
                            "space-y-2 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4",
                          ),
                        ],
                        [
                          h.p(
                            [h.Class("text-sm text-foreground")],
                            [
                              `tool policy ${editDraft.toolPolicyMode} · supported tasks ${
                                selectedRole.task_types_supported.length === 0
                                  ? "none"
                                  : selectedRole.task_types_supported.slice(0, 3).join(", ") +
                                    (
                                      selectedRole.task_types_supported.length > 3
                                        ? ` +${String(selectedRole.task_types_supported.length - 3)}`
                                        : ""
                                    )
                              }`,
                            ],
                          ),
                        ],
                      ),
                      h.div(
                        [h.Class("grid gap-4 md:grid-cols-2")],
                        [
                          roleInput(
                            "role-edit-id",
                            "Role id",
                            editDraft.roleId,
                            (next) =>
                              Message.RoleEditDraftChanged({ field: "roleId", value: next }),
                            h,
                          ),
                          roleInput(
                            "role-edit-name",
                            "Name",
                            editDraft.name,
                            (next) => Message.RoleEditDraftChanged({ field: "name", value: next }),
                            h,
                          ),
                          roleSelect(
                            "role-edit-kind",
                            "Kind",
                            editDraft.roleKind,
                            editKindOptions,
                            (next) =>
                              Message.RoleEditDraftChanged({ field: "roleKind", value: next }),
                            h,
                          ),
                          roleSelect(
                            "role-edit-tool-policy",
                            "Tool policy mode",
                            editDraft.toolPolicyMode,
                            TOOL_POLICY_OPTIONS,
                            (next) =>
                              Message.RoleEditDraftChanged({
                                field: "toolPolicyMode",
                                value: next,
                              }),
                            h,
                          ),
                        ],
                      ),
                      roleInput(
                        "role-edit-description",
                        "Description",
                        editDraft.description,
                        (next) =>
                          Message.RoleEditDraftChanged({ field: "description", value: next }),
                        h,
                        true,
                      ),
                      roleInput(
                        "role-edit-instructions",
                        "Default system instructions",
                        editDraft.defaultSystemInstructions,
                        (next) =>
                          Message.RoleEditDraftChanged({
                            field: "defaultSystemInstructions",
                            value: next,
                          }),
                        h,
                        true,
                      ),
                      roleInput(
                        "role-edit-routing-overrides",
                        "Routing policy overrides (JSON)",
                        editDraft.routingOverridesText,
                        (next) =>
                          Message.RoleEditDraftChanged({
                            field: "routingOverridesText",
                            value: next,
                          }),
                        h,
                        true,
                      ),
                      h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                          h.button(
                            [
                              h.Type("button"),
                              h.DataAttribute("role-edit-save", ""),
                              h.AriaDisabled(roleActionState?.status === "saving"),
                              h.OnClick(Message.RoleEditSaveRequested({})),
                              h.Class(
                                "inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground",
                              ),
                            ],
                            [
                              roleActionState?.kind === "edit" &&
                              roleActionState.status === "saving"
                                ? "Saving…"
                                : "Save role",
                            ],
                          ),
                          h.button(
                            [
                              h.Type("button"),
                              h.DataAttribute("role-edit-reset", ""),
                              h.OnClick(Message.RoleEditReset({})),
                              h.Class(
                                "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground",
                              ),
                            ],
                            ["Reset"],
                          ),
                        ],
                      ),
                    ],
                  ),
            ],
            h,
          ),
        ],
      ),
    ],
    h,
    "models-roles-state",
  );
};

type BenchmarkRunResultView = {
  readonly endpointGrades?: ReadonlyArray<{
    readonly caseResults?: ReadonlyArray<{
      readonly actualPreview?: string;
      readonly caseId?: string;
      readonly difficultyBucket?: string;
      readonly errorMessage?: string;
      readonly judgeError?: string | null;
      readonly rationale?: string;
      readonly score?: number;
    }>;
    readonly endpointId?: string;
    readonly modelId?: string;
    readonly overallScore?: number;
  }>;
  readonly caseCounts?: {
    readonly failed?: number;
    readonly passed?: number;
    readonly total?: number;
  };
  readonly caseResults?: ReadonlyArray<{
    readonly actualPreview?: string;
    readonly caseId?: string;
    readonly difficultyBucket?: string;
    readonly errorMessage?: string;
    readonly judgeError?: string | null;
    readonly rationale?: string;
    readonly score?: number;
  }>;
  readonly errorMessage?: string;
  readonly outcome?: string;
  readonly runId?: string;
  readonly status?: string;
};

const parseBenchmarkRunResult = (json: string | undefined): BenchmarkRunResultView | undefined => {
  if (json === undefined || json.length === 0) return undefined;
  try {
    // SAFETY: GET /benchmark/runs/<id> returns the finished progress snapshot with the run result nested under
    // `result` (runId/status/totalSteps/... + result.endpointGrades/caseResults); progress poll bodies carry the bare
    // result. Read the nested result when present and keep the snapshot's terminal status/error on top.
    const record = JSON.parse(json) as Record<string, unknown>;
    const nested = record.result;
    const base = (
      nested !== null && typeof nested === "object" ? nested : record
    ) as BenchmarkRunResultView;
    return {
      ...base,
      ...(typeof record.errorMessage === "string" ? { errorMessage: record.errorMessage } : {}),
      ...(typeof record.status === "string" ? { status: record.status } : {}),
      ...(typeof record.outcome === "string" ? { outcome: record.outcome } : {}),
      ...(typeof record.caseCounts === "object" && record.caseCounts !== null
        ? {
            caseCounts: record.caseCounts as {
              readonly failed?: number;
              readonly passed?: number;
              readonly total?: number;
            },
          }
        : {}),
    };
  } catch {
    return undefined;
  }
};

const benchmarkResultStats = (result: BenchmarkRunResultView | undefined) => {
  const grades = result?.endpointGrades ?? [];
  const cases =
    grades.length > 0
      ? grades.flatMap((grade) => grade.caseResults ?? [])
      : (result?.caseResults ?? []);
  // Host outcome fields (run 125) win when present; the local score>0 derivation is the fallback for old runs.
  const hostCounts = result?.caseCounts;
  const executed = typeof hostCounts?.total === "number" ? hostCounts.total : cases.length;
  const passed =
    typeof hostCounts?.passed === "number"
      ? hostCounts.passed
      : cases.filter((entry) => typeof entry.score === "number" && entry.score > 0).length;
  return { cases, executed, failed: executed - passed, grades, outcome: result?.outcome, passed };
};

/** Reference phase wording (apps/runtime-ui/app/routes/control-benchmark.tsx describeBenchmarkProgress). */
const benchmarkPhaseCopy = (
  progress: NonNullable<NonNullable<Model["modelsView"]>["benchmarkProgress"]>,
) => {
  const model =
    progress.currentEndpointModelId === undefined
      ? null
      : `model ${String((progress.endpointIndex ?? 0) + 1)}/${String(progress.endpointCount ?? 0)}: ${progress.currentEndpointModelId}`;
  // A case index beyond the steps already completed is a stale/incoherent snapshot; do not render it.
  const caseCoherent =
    progress.caseIndex === undefined ||
    progress.completedSteps === undefined ||
    progress.completedSteps >= progress.caseIndex;
  const testCase =
    !caseCoherent || progress.currentCaseId === undefined
      ? null
      : `case ${String((progress.caseIndex ?? 0) + 1)}/${String(progress.caseCount ?? 0)} (${progress.currentCaseId})`;
  if (progress.runPhase === "compare") {
    return {
      detail: [
        testCase,
        progress.currentPhase === "compare"
          ? "ranking subjects for this case"
          : "preparing compare pass",
      ]
        .filter((value): value is string => value !== null)
        .join(" • "),
      label: "Phase 3 of 3 · Head-to-head compare",
    };
  }
  if (progress.runPhase === "grading") {
    return {
      detail: [
        model,
        testCase,
        progress.currentPhase === "judge"
          ? "scoring recorded deliverables"
          : "grading saved responses",
      ]
        .filter((value): value is string => value !== null)
        .join(" • "),
      label: "Phase 2 of 3 · Judge grading",
    };
  }
  if (progress.runPhase === "complete") {
    return { detail: "final scores recorded", label: "Phase 3 of 3 · Complete" };
  }
  return {
    detail: [
      model,
      testCase,
      progress.currentPhase === "execute"
        ? "running benchmark cases and saving deliverables"
        : "preparing execution pass",
    ]
      .filter((value): value is string => value !== null)
      .join(" • "),
    label: "Phase 1 of 3 · Recording responses",
  };
};

export const benchmarkRoute = (
  suite: ReadbackState,
  summary: ReadbackState,
  runs: ReadbackState,
  h: HtmlBuilder<Message>,
  modelsView?: Model["modelsView"],
  endpoints?: ReadbackState,
  preferences?: ReadbackState,
  activeRun?: ReadbackState,
): Html => {
  const suiteCases = suite.rows.flatMap((entry) => {
    try {
      // SAFETY: benchmarkSuite rows carry this JSON record in meta.
      const meta = JSON.parse(entry.meta) as {
        readonly benchmarkEligible?: boolean;
        readonly quickBenchmark?: boolean;
      };
      return [{ eligible: meta.benchmarkEligible === true, quick: meta.quickBenchmark === true }];
    } catch {
      return [];
    }
  });
  const quickCases = suiteCases.filter((entry) => entry.eligible && entry.quick).length;
  const eligibleCases = suiteCases.filter((entry) => entry.eligible).length;
  const isRunnable = (meta: {
    readonly benchmarkEligible?: boolean | null;
    readonly executionModeEligible?: boolean | null;
  }): boolean => {
    if (meta.benchmarkEligible !== undefined && meta.benchmarkEligible !== null)
      return meta.benchmarkEligible !== false;
    if (meta.executionModeEligible !== undefined && meta.executionModeEligible !== null)
      return meta.executionModeEligible !== false;
    return true;
  };
  const endpointEntries = (endpoints?.rows ?? []).flatMap((entry) => {
    try {
      // SAFETY: modelEndpoints rows carry this JSON record in meta.
      const meta = JSON.parse(entry.meta) as {
        readonly benchmarkEligible?: boolean | null;
        readonly endpointId?: string;
        readonly executionModeEligible?: boolean | null;
        readonly healthStatus?: string | null;
        readonly modelId?: string | null;
        readonly reasoningEffort?: string | null;
        readonly sourceType?: string | null;
      };
      return meta.endpointId === undefined ? [] : [{ meta, endpointId: meta.endpointId }];
    } catch {
      return [];
    }
  });
  const effortByEndpoint = new Map(
    endpointEntries.flatMap((entry) =>
      typeof entry.meta.reasoningEffort === "string" && entry.meta.reasoningEffort.length > 0
        ? [[entry.endpointId, entry.meta.reasoningEffort] as const]
        : [],
    ),
  );
  const runnableEntries = endpointEntries.filter((entry) => isRunnable(entry.meta));
  const endpointOptions = runnableEntries.map(({ endpointId, meta }) => ({
    label: `${meta.modelId ?? endpointId} (${meta.sourceType ?? "unknown"})`,
    value: endpointId,
  }));
  const allEndpointIds = runnableEntries.map((entry) => entry.endpointId);
  const selectedEndpointIds = modelsView?.benchmarkSelectedEndpointIds ?? allEndpointIds;
  const selected = new Set(selectedEndpointIds);
  const selectedCount = allEndpointIds.filter((endpointId) => selected.has(endpointId)).length;
  const mode: "quick" | "full" = modelsView?.benchmarkMode?.toLowerCase().includes("full")
    ? "full"
    : "quick";
  let preferredJudge: string | undefined;
  try {
    const meta = preferences?.rows.find((entry) => entry.id === "preferences")?.meta;
    const parsed =
      meta === undefined ? undefined : (JSON.parse(meta) as { readonly judgeEndpointId?: unknown });
    preferredJudge =
      typeof parsed?.judgeEndpointId === "string" && parsed.judgeEndpointId.length > 0
        ? parsed.judgeEndpointId
        : undefined;
  } catch {
    preferredJudge = undefined;
  }
  const requestedJudge = modelsView?.benchmarkJudge ?? preferredJudge;
  const judge =
    requestedJudge !== undefined &&
    endpointOptions.some((option) => option.value === requestedJudge)
      ? requestedJudge
      : (endpointOptions[0]?.value ?? "");
  const caseCount = mode === "quick" ? quickCases : eligibleCases;
  let summaryHeader:
    | {
        readonly caseAudits?: ReadonlyArray<{
          readonly endpointId?: string;
          readonly latencyMs?: number;
        }>;
        readonly completedAtMs?: number | null;
        readonly judgeEndpointId?: string | null;
        readonly judgeModelId?: string | null;
        readonly mode?: string | null;
        readonly runId?: string | null;
      }
    | undefined;
  try {
    const headerRow = summary.rows.find((entry) => entry.id === "summary");
    if (headerRow !== undefined) summaryHeader = JSON.parse(headerRow.meta) as typeof summaryHeader;
  } catch {
    summaryHeader = undefined;
  }
  const percentile = (values: ReadonlyArray<number>, probability: number): number | null => {
    const sorted = values
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);
    if (sorted.length === 0) return null;
    const index = Math.max(
      0,
      Math.min(sorted.length - 1, Math.ceil(probability * sorted.length) - 1),
    );
    return sorted[index] ?? null;
  };
  const latencies = new Map<string, { readonly p50: number | null; readonly p95: number | null }>();
  for (const endpointId of allEndpointIds) {
    const values = (summaryHeader?.caseAudits ?? []).flatMap((audit) =>
      audit.endpointId === endpointId && typeof audit.latencyMs === "number"
        ? [audit.latencyMs]
        : [],
    );
    latencies.set(endpointId, { p50: percentile(values, 0.5), p95: percentile(values, 0.95) });
  }
  const latencyText = (value: number | null): string =>
    value === null ? "—" : `${String(Math.round(value))} ms`;
  const subjects = summary.rows
    .filter((entry) => entry.id !== "summary")
    .flatMap((entry) => {
      try {
        // SAFETY: benchmarkSummary subject rows carry the BenchmarkSummarySubject record in meta.
        const meta = JSON.parse(entry.meta) as {
          readonly displayName?: string;
          readonly endpointId?: string;
          readonly modelId?: string;
          readonly overallScore?: number;
          readonly scoresByBucket?: Readonly<
            Record<
              "easy" | "medium" | "hard",
              { readonly score?: unknown; readonly cases?: unknown }
            >
          >;
          readonly sourceType?: string | null;
          readonly taxonomyScores?: {
            readonly byCapability?: Record<string, number>;
            readonly byRole?: Record<string, number>;
            readonly byTask?: Record<string, number>;
          };
        };
        return [{ meta }];
      } catch {
        return [];
      }
    });
  const percent = (value: unknown): string => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? `${String(Math.round(parsed * 100))}%` : "—";
  };
  const bucket = (value: unknown): string => {
    const record = value as { readonly score?: unknown; readonly cases?: unknown } | undefined;
    if (record === undefined) return "—";
    const cases = Number(record.cases);
    return percent(record.score) + (Number.isFinite(cases) ? ` · ${String(cases)}` : "");
  };
  const scoreRows = subjects
    .map(({ meta }) => {
      const latency = latencies.get(meta.endpointId ?? "") ?? { p50: null, p95: null };
      const endpointId = meta.endpointId ?? "";
      const effort = endpointId.length === 0 ? undefined : effortByEndpoint.get(endpointId);
      return {
        displayName: meta.displayName ?? meta.modelId ?? (endpointId === "" ? "—" : endpointId),
        endpointId,
        evidenceLabel: endpointId === "" ? "No benchmark evidence" : "Exact (run artifact)",
        lastRunId:
          typeof summaryHeader?.runId === "string" && summaryHeader.runId.length > 0
            ? summaryHeader.runId
            : null,
        lastRunMode: summaryHeader?.mode ?? null,
        latencyP50: latency.p50,
        latencyP95: latency.p95,
        effort,
        overallScore: meta.overallScore,
        profileQualityScore: null as number | null,
        scoresByBucket: meta.scoresByBucket,
        sourceType: meta.sourceType ?? "—",
      };
    })
    .filter((row) => row.endpointId.length > 0);
  const taxonomyFilters = modelsView?.benchmarkTaxonomyFilters ?? {};
  const taxonomyInventory = (
    dimension: "byCapability" | "byRole" | "byTask",
  ): ReadonlyArray<string> =>
    [
      ...new Set(
        subjects.flatMap(({ meta }) => Object.keys(meta.taxonomyScores?.[dimension] ?? {})),
      ),
    ].sort((left, right) => left.localeCompare(right, "en"));
  const roleIds = taxonomyInventory("byRole");
  const taskIds = taxonomyInventory("byTask");
  const capabilityIds = taxonomyInventory("byCapability");
  const taxonomyRows = subjects.flatMap(({ meta }) => {
    const scores = meta.taxonomyScores ?? {};
    if (taxonomyFilters.role !== undefined && taxonomyFilters.role.length > 0)
      return scores.byRole?.[taxonomyFilters.role] === undefined
        ? []
        : [
            [
              "Role",
              taxonomyFilters.role,
              percent(scores.byRole[taxonomyFilters.role]),
              meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
            ],
          ];
    if (taxonomyFilters.task !== undefined && taxonomyFilters.task.length > 0)
      return scores.byTask?.[taxonomyFilters.task] === undefined
        ? []
        : [
            [
              "Task",
              taxonomyFilters.task,
              percent(scores.byTask[taxonomyFilters.task]),
              meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
            ],
          ];
    if (taxonomyFilters.capability !== undefined && taxonomyFilters.capability.length > 0)
      return scores.byCapability?.[taxonomyFilters.capability] === undefined
        ? []
        : [
            [
              "Capability",
              taxonomyFilters.capability,
              percent(scores.byCapability[taxonomyFilters.capability]),
              meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
            ],
          ];
    return [
      ...Object.entries(scores.byRole ?? {}).map(([value, score]) => [
        "Role",
        value,
        percent(score),
        meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
      ]),
      ...Object.entries(scores.byTask ?? {}).map(([value, score]) => [
        "Task",
        value,
        percent(score),
        meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
      ]),
      ...Object.entries(scores.byCapability ?? {}).map(([value, score]) => [
        "Capability",
        value,
        percent(score),
        meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
      ]),
    ];
  });
  const taxonomyHasData = subjects.some(({ meta }) => {
    const scores = meta.taxonomyScores ?? {};
    return (
      Object.keys(scores.byRole ?? {}).length +
        Object.keys(scores.byTask ?? {}).length +
        Object.keys(scores.byCapability ?? {}).length >
      0
    );
  });
  const activeTaxonomy =
    taxonomyFilters.role !== undefined && taxonomyFilters.role.length > 0
      ? {
          dimension: "byRole" as const,
          label: `Role: ${taxonomyFilters.role}`,
          value: taxonomyFilters.role,
        }
      : taxonomyFilters.task !== undefined && taxonomyFilters.task.length > 0
        ? {
            dimension: "byTask" as const,
            label: `Task: ${taxonomyFilters.task}`,
            value: taxonomyFilters.task,
          }
        : taxonomyFilters.capability !== undefined && taxonomyFilters.capability.length > 0
          ? {
              dimension: "byCapability" as const,
              label: `Capability: ${taxonomyFilters.capability}`,
              value: taxonomyFilters.capability,
            }
          : undefined;
  const activeTaxonomyScores =
    activeTaxonomy === undefined
      ? []
      : subjects.flatMap(({ meta }) => {
          const score = meta.taxonomyScores?.[activeTaxonomy.dimension]?.[activeTaxonomy.value];
          if (typeof score !== "number") return [];
          return [
            {
              displayName: meta.displayName ?? meta.modelId ?? meta.endpointId ?? "—",
              endpointId: meta.endpointId ?? "",
              modelId: meta.modelId ?? "",
              score,
            },
          ];
        });
  const runRows = runs.rows.flatMap((entry) => {
    try {
      // SAFETY: benchmarkRuns rows carry the BenchmarkRunListEntry record in meta.
      const meta = JSON.parse(entry.meta) as {
        readonly completedAtMs?: number;
        readonly endpointIds?: ReadonlyArray<string>;
        readonly mode?: string;
        readonly suiteId?: string;
      };
      const completed =
        typeof meta.completedAtMs === "number"
          ? new Date(meta.completedAtMs).toISOString().slice(0, 10)
          : "—";
      return [
        [
          entry.id,
          meta.mode ?? "—",
          String(entry.value),
          String(meta.endpointIds?.length ?? 0),
          completed,
          meta.suiteId ?? "—",
        ],
      ];
    } catch {
      return [];
    }
  });
  const select = (
    label: string,
    options: ReadonlyArray<{ readonly label: string; readonly value: string }>,
    value: string,
    onChange: (next: string) => Message,
  ) =>
    h.label(
      [h.Class("flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground")],
      [
        label,
        h.select(
          [
            h.AriaLabel(label),
            h.Class("h-[34px] rounded-md border border-input bg-background px-2 font-sans text-sm"),
            h.OnChange((next) => onChange(next)),
          ],
          options.map((option) =>
            h.option(
              [h.Value(option.value), ...(option.value === value ? [h.Selected(true)] : [])],
              [option.label],
            ),
          ),
        ),
      ],
    );
  const progress = modelsView?.benchmarkProgress;
  const running = progress?.status === "running";
  const benchmarkResult = parseBenchmarkRunResult(progress?.resultJson);
  const benchmarkStats = benchmarkResultStats(benchmarkResult);
  const benchmarkPercent =
    progress === undefined || (progress.totalSteps ?? 0) <= 0
      ? 0
      : Math.min(
          100,
          Math.round(((progress.completedSteps ?? 0) / (progress.totalSteps ?? 1)) * 100),
        );
  const benchmarkPhase = progress === undefined ? undefined : benchmarkPhaseCopy(progress);
  const hostCounts = progress?.caseCounts;
  const hostOutcome = progress?.outcome ?? (hostCounts?.total === 0 ? "pending" : undefined);
  const requestedEndpointIds = modelsView?.benchmarkRunRequestedEndpointIds ?? [];
  const resultEndpointIds = [
    ...new Set(
      (benchmarkResult?.endpointGrades ?? []).flatMap((grade) =>
        grade.endpointId === undefined ? [] : [grade.endpointId],
      ),
    ),
  ];
  const requestedEndpointCount =
    progress?.requestedEndpointCount ??
    (requestedEndpointIds.length > 0 ? requestedEndpointIds.length : undefined);
  const executedEndpointCount =
    progress?.executedEndpointCount ??
    (resultEndpointIds.length > 0 ? resultEndpointIds.length : undefined);
  const skippedEndpoints =
    progress?.skippedEndpoints ??
    (requestedEndpointIds.length > 0
      ? requestedEndpointIds.filter((endpointId) => !resultEndpointIds.includes(endpointId))
      : []);
  const endpointCountMismatch =
    (requestedEndpointCount !== undefined &&
      executedEndpointCount !== undefined &&
      requestedEndpointCount !== executedEndpointCount) ||
    skippedEndpoints.length > 0;
  const showPassed = hostCounts === undefined ? benchmarkStats.passed : hostCounts.passed;
  const showExecuted = hostCounts === undefined ? benchmarkStats.executed : hostCounts.total;
  const showFailed = hostCounts === undefined ? benchmarkStats.failed : hostCounts.failed;
  const failedCase = benchmarkStats.cases.find(
    (entry) => typeof entry.score !== "number" || entry.score <= 0,
  );
  return referenceSection(
    "models",
    "ok",
    [
      h.h2(
        [h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")],
        ["Capability benchmark"],
      ),
      referenceCard(
        "Run capability benchmark",
        "Select mode and judge, then grade runnable endpoints.",
        [
          h.div(
            [h.Class("flex flex-wrap items-end gap-3")],
            [
              select(
                "Benchmark mode",
                [
                  { label: `Quick (${String(quickCases)} hard cases)`, value: "quick" },
                  { label: "Full (all eligible cases)", value: "full" },
                ],
                mode,
                (next) => Message.BenchmarkModeChanged({ value: next }),
              ),
              select(
                "Judge endpoint",
                endpointOptions.length === 0
                  ? [{ label: "No runnable endpoints", value: "" }]
                  : endpointOptions,
                judge,
                (next) => Message.BenchmarkJudgeChanged({ value: next }),
              ),
            ],
          ),
          selected.has(judge) && judge !== ""
            ? h.p(
                [
                  h.DataAttribute("benchmark-judge-overlap", ""),
                  h.Class("mt-3 text-xs leading-4 text-[var(--rm-warning,#b45309)]"),
                ],
                [
                  "Judge endpoint is also a benchmark subject. Expect slower grading and higher judge failure risk — prefer a dedicated judge when available.",
                ],
              )
            : null,
          h.div(
            [h.Class("mt-4 flex flex-wrap items-center gap-2")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("benchmark-run", ""),
                  ...(selectedCount < 2 || judge === "" || running ? [h.Disabled(true)] : []),
                  h.OnClick(Message.BenchmarkRunRequested({})),
                  h.Class(
                    "inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground",
                  ),
                ],
                [
                  `Run ${mode} benchmark (${String(selectedCount)} of ${String(allEndpointIds.length)} selected, ${String(caseCount)} cases)`,
                ],
              ),
              h.span(
                [
                  h.DataAttribute("benchmark-selected-count", ""),
                  h.Class("font-mono text-xs text-muted-foreground"),
                ],
                [`${String(selectedCount)} of ${String(allEndpointIds.length)} selected`],
              ),
              ...(modelsView?.benchmarkClearPending === true
                ? []
                : [
                    h.button(
                      [
                        h.Type("button"),
                        h.OnClick(Message.BenchmarkClearRequested({})),
                        h.Class(
                          "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium",
                        ),
                      ],
                      ["Clear all benchmark data"],
                    ),
                  ]),
            ],
          ),
          modelsView?.benchmarkAction?.message === undefined
            ? null
            : h.p(
                [
                  h.DataAttribute("benchmark-action-status", modelsView.benchmarkAction.status),
                  h.Role(modelsView.benchmarkAction.status === "error" ? "alert" : "status"),
                  h.Class("mt-2 text-xs text-muted-foreground"),
                ],
                [modelsView.benchmarkAction.message],
              ),
          progress === undefined
            ? null
            : h.div(
                [
                  h.DataAttribute("benchmark-progress", ""),
                  h.DataAttribute("benchmark-progress-status", progress.status),
                  h.Class(
                    "mt-3 space-y-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground",
                  ),
                ],
                [
                  h.div(
                    [h.Class("flex flex-wrap items-center justify-between gap-2")],
                    [
                      h.p(
                        [
                          h.DataAttribute("benchmark-progress-phase", ""),
                          h.Class("font-sans text-sm font-semibold leading-5 text-foreground"),
                        ],
                        [benchmarkPhase?.label ?? "Benchmark in progress"],
                      ),
                      h.p(
                        [
                          h.DataAttribute("benchmark-progress-percent", ""),
                          h.Class("font-mono text-[12px] tabular-nums text-foreground"),
                        ],
                        [`${String(benchmarkPercent)}%`],
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class("h-1.5 overflow-hidden rounded-sm bg-border")],
                    [
                      h.div(
                        [
                          h.Attribute("style", `width: ${String(benchmarkPercent)}%`),
                          h.DataAttribute("benchmark-progress-bar", ""),
                          h.Class("h-full bg-primary transition-all duration-500"),
                        ],
                        [],
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class("flex flex-wrap gap-x-4 gap-y-1")],
                    [
                      h.p(
                        [h.DataAttribute("benchmark-progress-steps", "")],
                        [
                          `${String(progress.completedSteps ?? 0)} / ${String(progress.totalSteps ?? 0)} steps`,
                        ],
                      ),
                      benchmarkPhase === undefined || benchmarkPhase.detail.length === 0
                        ? null
                        : h.p(
                            [h.DataAttribute("benchmark-progress-detail", "")],
                            [benchmarkPhase.detail],
                          ),
                    ],
                  ),
                  requestedEndpointCount === undefined &&
                  executedEndpointCount === undefined &&
                  skippedEndpoints.length === 0
                    ? null
                    : h.p(
                        [
                          h.DataAttribute("benchmark-endpoint-counts", ""),
                          h.Class(
                            `font-sans text-sm leading-5 ${
                              endpointCountMismatch
                                ? "font-semibold text-[var(--rm-warning,#b45309)]"
                                : "text-foreground"
                            }`,
                          ),
                        ],
                        [
                          `Requested ${
                            requestedEndpointCount === undefined
                              ? "—"
                              : String(requestedEndpointCount)
                          } endpoint${requestedEndpointCount === 1 ? "" : "s"} · executed ${
                            executedEndpointCount === undefined
                              ? "—"
                              : String(executedEndpointCount)
                          }${
                            skippedEndpoints.length === 0
                              ? ""
                              : ` · skipped: ${skippedEndpoints.join(", ")}`
                          }`,
                        ],
                      ),
                  progress.status === "failed"
                    ? h.p(
                        [
                          h.DataAttribute("benchmark-terminal-status", "failed"),
                          h.Role("alert"),
                          h.Class("font-sans text-sm leading-5 text-destructive"),
                        ],
                        [
                          `Failed: ${progress.errorCode === undefined ? "" : `${progress.errorCode} · `}${progress.errorMessage ?? progress.message ?? "Benchmark run failed."}`,
                        ],
                      )
                    : null,
                  progress.status === "completed"
                    ? h.div(
                        [
                          h.DataAttribute("benchmark-terminal-status", "completed"),
                          h.Class("space-y-1 border-t border-border pt-2"),
                        ],
                        [
                          h.p(
                            [h.Class("font-sans text-sm font-semibold leading-5 text-foreground")],
                            [
                              `Completed${
                                benchmarkResult?.runId === undefined
                                  ? ""
                                  : ` · ${benchmarkResult.runId}`
                              }`,
                            ],
                          ),
                          h.p(
                            [
                              h.DataAttribute("benchmark-progress-outcome", hostOutcome ?? ""),
                              h.Class("font-sans text-sm leading-5 text-foreground"),
                            ],
                            [
                              `Outcome: ${showExecuted === 0 ? "pending" : (hostOutcome ?? "unknown")}`,
                            ],
                          ),
                          showExecuted === 0
                            ? h.p(
                                [h.DataAttribute("benchmark-case-summary", "")],
                                ["No executed cases were recorded for this run."],
                              )
                            : h.p(
                                [
                                  h.DataAttribute("benchmark-case-summary", ""),
                                  h.Class(
                                    showFailed > 0
                                      ? "font-sans text-sm font-semibold leading-5 text-destructive"
                                      : "font-sans text-sm leading-5 text-foreground",
                                  ),
                                ],
                                [
                                  `${String(showPassed)}/${String(showExecuted)} cases executed${showFailed > 0 ? ` — ${String(showFailed)} failed` : ""}`,
                                ],
                              ),
                          ...(benchmarkStats.failed > 0 && failedCase !== undefined
                            ? [
                                h.p(
                                  [
                                    h.DataAttribute("benchmark-case-failure", ""),
                                    h.Class("font-mono text-[12px] leading-4 text-destructive"),
                                  ],
                                  [
                                    `${String(failedCase.caseId ?? "case")}: ${failedCase.rationale ?? "case failed"}${
                                      failedCase.actualPreview === undefined
                                        ? ""
                                        : ` · ${failedCase.actualPreview}`
                                    }${
                                      failedCase.judgeError === undefined ||
                                      failedCase.judgeError === null
                                        ? ""
                                        : ` · judge: ${failedCase.judgeError}`
                                    }`,
                                  ],
                                ),
                              ]
                            : []),
                          ...benchmarkStats.grades.map((grade) =>
                            h.p(
                              [
                                h.DataAttribute("benchmark-endpoint-score", grade.endpointId ?? ""),
                                h.Class("font-mono text-[12px] leading-4 text-muted-foreground"),
                              ],
                              [
                                `${grade.modelId ?? grade.endpointId ?? "endpoint"} — overall ${String(Math.round((grade.overallScore ?? 0) * 100))}% · ${String(
                                  (grade.caseResults ?? []).filter(
                                    (entry) => typeof entry.score === "number" && entry.score > 0,
                                  ).length,
                                )}/${String((grade.caseResults ?? []).length)} cases passed`,
                              ],
                            ),
                          ),
                        ],
                      )
                    : null,
                ],
              ),
          ...(modelsView?.benchmarkClearPending === true
            ? [
                h.div(
                  [
                    h.DataAttribute("benchmark-clear-confirmation", ""),
                    h.Class("mt-4 rounded-md border border-destructive/40 bg-background p-3"),
                  ],
                  [
                    h.p(
                      [h.Class("text-sm leading-5 text-foreground")],
                      [
                        "Clear all benchmark data? This removes every benchmark run, artifact, and routing profile sample. This cannot be undone.",
                      ],
                    ),
                    h.div(
                      [h.Class("mt-3 flex flex-wrap gap-2")],
                      [
                        h.button(
                          [
                            h.Type("button"),
                            h.OnClick(Message.BenchmarkClearConfirmed({})),
                            h.Class(
                              "inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground",
                            ),
                          ],
                          ["Confirm clear"],
                        ),
                        h.button(
                          [
                            h.Type("button"),
                            h.OnClick(Message.BenchmarkClearCancelled({})),
                            h.Class(
                              "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium",
                            ),
                          ],
                          ["Cancel"],
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : []),
          h.div(
            [h.Class("mt-4 overflow-x-auto")],
            [
              h.table(
                [h.Class("w-full min-w-[640px] border-collapse text-left text-sm")],
                [
                  h.thead(
                    [],
                    [
                      h.tr(
                        [h.Class("border-b border-border")],
                        ["", "Model", "Path", "Scope", "Status", "Actions"].map((heading) =>
                          h.th(
                            [
                              h.Class(
                                "px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
                              ),
                            ],
                            [heading],
                          ),
                        ),
                      ),
                    ],
                  ),
                  h.tbody(
                    [],
                    runnableEntries.length === 0
                      ? [
                          h.tr(
                            [],
                            [
                              h.td(
                                [
                                  h.Attribute("colspan", "6"),
                                  h.Class("px-3 py-3 text-xs text-muted-foreground"),
                                ],
                                ["No runnable endpoints are configured."],
                              ),
                            ],
                          ),
                        ]
                      : runnableEntries.map(({ endpointId, meta }) => {
                          const isSelected = selected.has(endpointId);
                          const pending = modelsView?.benchmarkClearEndpointId === endpointId;
                          return h.tr(
                            [h.Class("border-b border-border last:border-b-0")],
                            [
                              h.td(
                                [h.Class("px-3 py-2")],
                                [
                                  h.input([
                                    h.Type("checkbox"),
                                    h.Checked(isSelected),
                                    h.AriaLabel(`Select ${meta.modelId ?? endpointId}`),
                                    h.OnChange(() =>
                                      Message.BenchmarkEndpointSelected({
                                        endpointId,
                                        selected: !isSelected,
                                      }),
                                    ),
                                  ]),
                                ],
                              ),
                              h.td(
                                [h.Class("px-3 py-2 text-[13px] text-foreground")],
                                [meta.modelId ?? endpointId],
                              ),
                              h.td(
                                [h.Class("px-3 py-2 font-mono text-[12px] text-muted-foreground")],
                                [endpointId],
                              ),
                              h.td(
                                [h.Class("px-3 py-2 text-[13px] text-foreground")],
                                [meta.sourceType ?? "—"],
                              ),
                              h.td(
                                [h.Class("px-3 py-2 text-[13px] text-foreground")],
                                [meta.healthStatus ?? "unknown"],
                              ),
                              h.td(
                                [h.Class("px-3 py-2")],
                                [
                                  pending
                                    ? h.div(
                                        [h.Class("flex gap-1")],
                                        [
                                          h.button(
                                            [
                                              h.Type("button"),
                                              h.OnClick(
                                                Message.BenchmarkEndpointClearConfirmed({
                                                  endpointId,
                                                }),
                                              ),
                                              h.Class("text-xs underline"),
                                            ],
                                            ["Confirm clear"],
                                          ),
                                          h.button(
                                            [
                                              h.Type("button"),
                                              h.OnClick(
                                                Message.BenchmarkEndpointClearCancelled({}),
                                              ),
                                              h.Class("text-xs underline"),
                                            ],
                                            ["Cancel"],
                                          ),
                                        ],
                                      )
                                    : h.button(
                                        [
                                          h.Type("button"),
                                          h.AriaDisabled(running),
                                          h.OnClick(
                                            Message.BenchmarkEndpointClearRequested({ endpointId }),
                                          ),
                                          h.Class("text-xs underline"),
                                        ],
                                        ["Clear"],
                                      ),
                                ],
                              ),
                            ],
                          );
                        }),
                  ),
                ],
              ),
            ],
          ),
        ],
        h,
      ),
      referenceCard(
        "Benchmark scores",
        "Scores are normalized 0–1 fractions shown as percentages.",
        [
          h.div(
            [h.Class("mb-4 flex flex-wrap items-end gap-6")],
            [
              h.div(
                [h.Class("space-y-0.5")],
                [
                  h.p(
                    [
                      h.Class(
                        "font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
                      ),
                    ],
                    ["Last run"],
                  ),
                  h.p(
                    [
                      h.DataAttribute("benchmark-last-run", ""),
                      h.Class("font-mono text-[12px] leading-4 text-foreground"),
                    ],
                    [
                      typeof summaryHeader?.runId === "string" && summaryHeader.runId.length > 0
                        ? summaryHeader.runId
                        : "—",
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class("space-y-0.5")],
                [
                  h.p(
                    [
                      h.Class(
                        "font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
                      ),
                    ],
                    ["Suite"],
                  ),
                  h.p(
                    [h.Class("text-[12px] font-semibold leading-4 text-foreground")],
                    [
                      (summaryHeader?.mode ?? "—").charAt(0).toUpperCase() +
                        (summaryHeader?.mode ?? "").slice(1),
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class("space-y-0.5")],
                [
                  h.p(
                    [
                      h.Class(
                        "font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
                      ),
                    ],
                    ["Judge"],
                  ),
                  h.p(
                    [h.Class("font-mono text-[12px] leading-4 text-foreground")],
                    [summaryHeader?.judgeModelId ?? summaryHeader?.judgeEndpointId ?? "—"],
                  ),
                ],
              ),
              h.p(
                [h.Class("font-mono text-[11px] text-muted-foreground")],
                [
                  `Completed: ${
                    typeof summaryHeader?.completedAtMs === "number"
                      ? new Date(summaryHeader.completedAtMs)
                          .toISOString()
                          .slice(0, 19)
                          .replace("T", " ")
                      : "—"
                  }`,
                ],
              ),
            ],
          ),
          progress?.runId !== undefined &&
          typeof summaryHeader?.runId === "string" &&
          progress.runId !== summaryHeader.runId
            ? h.p(
                [
                  h.DataAttribute("benchmark-run-mismatch", ""),
                  h.Role("status"),
                  h.Class(
                    "mb-3 rounded-md border border-dashed border-[var(--rm-warning,#b45309)] p-2 font-mono text-[12px] text-[var(--rm-warning,#b45309)]",
                  ),
                ],
                [`Panel run ${progress.runId} · summary run ${summaryHeader.runId}`],
              )
            : null,
          scoreRows.length === 0
            ? h.p(
                [h.Class("text-sm leading-5 text-muted-foreground")],
                [
                  "No benchmark scores are in routing profiles yet. Run the benchmark to grade each configured model and update observed routing profiles.",
                ],
              )
            : h.div(
                [h.Class("overflow-x-auto rounded-lg border border-border")],
                [
                  h.table(
                    [h.Class("min-w-full text-left")],
                    [
                      h.thead(
                        [h.Class("bg-muted")],
                        [
                          h.tr(
                            [h.Class("border-b border-border")],
                            [
                              "Model",
                              "Overall",
                              "Profile",
                              "Easy",
                              "Medium",
                              "Hard",
                              "p50",
                              "p95",
                              "Scope",
                              "Actions",
                            ].map((heading) =>
                              h.th(
                                [
                                  h.Class(
                                    "px-1 py-2.5 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground",
                                  ),
                                ],
                                [heading],
                              ),
                            ),
                          ),
                        ],
                      ),
                      h.tbody(
                        [],
                        scoreRows.map((row) =>
                          h.tr(
                            [
                              h.DataAttribute("benchmark-score-row", row.endpointId),
                              h.Class("border-b border-border last:border-b-0"),
                            ],
                            [
                              h.td(
                                [h.Class("px-3.5 py-3")],
                                [
                                  h.p(
                                    [
                                      h.Class(
                                        "font-sans text-[14px] font-semibold leading-[18px] text-foreground",
                                      ),
                                    ],
                                    [
                                      row.displayName +
                                        (row.effort === undefined ? "" : ` (${row.effort})`),
                                    ],
                                  ),
                                  h.p(
                                    [
                                      h.DataAttribute("benchmark-score-run", ""),
                                      h.Class(
                                        "mt-1 font-mono text-[11px] font-normal text-muted-foreground",
                                      ),
                                    ],
                                    [
                                      row.lastRunId === null
                                        ? "profile-derived"
                                        : row.lastRunId +
                                          (row.lastRunMode === null ? "" : ` · ${row.lastRunMode}`),
                                    ],
                                  ),
                                  h.p(
                                    [
                                      h.DataAttribute("benchmark-score-endpoint", ""),
                                      h.Class(
                                        "mt-0.5 font-mono text-[11px] font-normal text-muted-foreground",
                                      ),
                                    ],
                                    [row.endpointId],
                                  ),
                                  h.p(
                                    [
                                      h.Class(
                                        "mt-0.5 font-mono text-[11px] font-normal text-muted-foreground",
                                      ),
                                    ],
                                    [row.evidenceLabel],
                                  ),
                                ],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-semibold tabular-nums text-foreground",
                                  ),
                                ],
                                [percent(row.overallScore)],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-semibold tabular-nums text-foreground",
                                  ),
                                ],
                                [
                                  row.profileQualityScore === null
                                    ? "—"
                                    : percent(row.profileQualityScore),
                                ],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-normal tabular-nums text-foreground",
                                  ),
                                ],
                                [bucket(row.scoresByBucket?.easy)],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-normal tabular-nums text-foreground",
                                  ),
                                ],
                                [bucket(row.scoresByBucket?.medium)],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-normal tabular-nums text-foreground",
                                  ),
                                ],
                                [bucket(row.scoresByBucket?.hard)],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-normal tabular-nums text-foreground",
                                  ),
                                ],
                                [latencyText(row.latencyP50)],
                              ),
                              h.td(
                                [
                                  h.Class(
                                    "px-1 py-3 font-mono text-[13px] font-normal tabular-nums text-foreground",
                                  ),
                                ],
                                [latencyText(row.latencyP95)],
                              ),
                              h.td(
                                [h.Class("px-1 py-3 text-[13px] text-muted-foreground")],
                                [row.sourceType],
                              ),
                              h.td(
                                [h.Class("px-3.5 py-3 text-right")],
                                [
                                  h.button(
                                    [
                                      h.Type("button"),
                                      h.DataAttribute("benchmark-score-clear", row.endpointId),
                                      h.AriaDisabled(
                                        running ||
                                          modelsView?.benchmarkClearEndpointId === row.endpointId,
                                      ),
                                      h.OnClick(
                                        Message.BenchmarkEndpointClearConfirmed({
                                          endpointId: row.endpointId,
                                        }),
                                      ),
                                      h.Class(
                                        "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 text-[13px] font-semibold text-foreground",
                                      ),
                                    ],
                                    [
                                      modelsView?.benchmarkClearEndpointId === row.endpointId
                                        ? "Clearing…"
                                        : "Clear",
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
        ],
        h,
      ),
      referenceCard(
        "Taxonomy dimensions",
        "Filters switch which dimension is active.",
        [
          !taxonomyHasData
            ? h.p(
                [h.Class("text-sm leading-5 text-muted-foreground")],
                [
                  "No taxonomy dimension data is available yet. Benchmark results with taxonomy-tagged cases will appear here.",
                ],
              )
            : h.div(
                [h.Class("space-y-4")],
                [
                  h.div(
                    [h.Class("grid gap-3 md:grid-cols-3")],
                    [
                      select(
                        "Filter by role",
                        [
                          { label: "All roles", value: "" },
                          ...roleIds.map((value) => ({ label: value, value })),
                        ],
                        taxonomyFilters.role ?? "",
                        (next) =>
                          Message.BenchmarkTaxonomyFilterChanged({ filter: "role", value: next }),
                      ),
                      select(
                        "Filter by task",
                        [
                          { label: "All tasks", value: "" },
                          ...taskIds.map((value) => ({ label: value, value })),
                        ],
                        taxonomyFilters.task ?? "",
                        (next) =>
                          Message.BenchmarkTaxonomyFilterChanged({ filter: "task", value: next }),
                      ),
                      select(
                        "Filter by capability",
                        [
                          { label: "All capabilities", value: "" },
                          ...capabilityIds.map((value) => ({ label: value, value })),
                        ],
                        taxonomyFilters.capability ?? "",
                        (next) =>
                          Message.BenchmarkTaxonomyFilterChanged({
                            filter: "capability",
                            value: next,
                          }),
                      ),
                    ],
                  ),
                  activeTaxonomy === undefined
                    ? h.p(
                        [
                          h.DataAttribute("benchmark-taxonomy-empty", "select"),
                          h.Class("text-sm leading-5 text-muted-foreground"),
                        ],
                        ["Select a taxonomy dimension above to see per-model benchmark scores."],
                      )
                    : activeTaxonomyScores.length === 0
                      ? h.p(
                          [
                            h.DataAttribute("benchmark-taxonomy-empty", "no-scores"),
                            h.Class("text-sm leading-5 text-muted-foreground"),
                          ],
                          ["No benchmark data for the selected taxonomy dimension."],
                        )
                      : h.div(
                          [h.Class("space-y-3")],
                          [
                            h.p(
                              [
                                h.DataAttribute("benchmark-taxonomy-active", activeTaxonomy.label),
                                h.Class(
                                  "font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
                                ),
                              ],
                              [activeTaxonomy.label],
                            ),
                            h.div(
                              [h.Class("divide-y divide-border border-t border-border")],
                              activeTaxonomyScores.map((entry) =>
                                h.div(
                                  [
                                    h.DataAttribute("benchmark-taxonomy-row", entry.endpointId),
                                    h.Class("flex items-baseline justify-between gap-3 py-3"),
                                  ],
                                  [
                                    h.div(
                                      [h.Class("min-w-0")],
                                      [
                                        h.p(
                                          [
                                            h.Class(
                                              "truncate font-sans text-[13px] font-semibold text-foreground",
                                            ),
                                          ],
                                          [entry.displayName],
                                        ),
                                        h.p(
                                          [
                                            h.Class(
                                              "truncate font-mono text-[11px] text-muted-foreground",
                                            ),
                                          ],
                                          [entry.endpointId],
                                        ),
                                      ],
                                    ),
                                    h.p(
                                      [
                                        h.Class(
                                          "font-mono text-[13px] font-semibold tabular-nums text-foreground",
                                        ),
                                      ],
                                      [percent(entry.score)],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                ],
              ),
        ],
        h,
      ),
      referenceCard(
        "Run history",
        "Completed benchmark runs stored on this runtime.",
        [
          runs.rows.length === 0
            ? h.p(
                [h.Class("text-sm leading-5 text-muted-foreground")],
                ["No completed benchmark runs yet."],
              )
            : h.div(
                [h.Class("space-y-3")],
                runs.rows.flatMap((entry) => {
                  try {
                    // SAFETY: benchmarkRuns rows carry the BenchmarkRunListEntry record in meta.
                    const meta = JSON.parse(entry.meta) as {
                      readonly caseCounts?: {
                        readonly failed?: number;
                        readonly passed?: number;
                        readonly total?: number;
                      };
                      readonly completedAtMs?: number;
                      readonly endpointIds?: ReadonlyArray<string>;
                      readonly mode?: string;
                      readonly outcome?: string;
                      readonly suiteId?: string;
                    };
                    const completed =
                      typeof meta.completedAtMs === "number"
                        ? new Date(meta.completedAtMs).toISOString().slice(0, 16).replace("T", " ")
                        : "—";
                    const passedCount = meta.caseCounts?.passed;
                    const totalCount = meta.caseCounts?.total;
                    const outcomeLabel = totalCount === 0 ? "pending" : (meta.outcome ?? "—");
                    const modelCount = meta.endpointIds?.length ?? 0;
                    return [
                      h.div(
                        [
                          h.DataAttribute("benchmark-run-row", entry.id),
                          h.DataAttribute("benchmark-run-outcome", outcomeLabel),
                          h.Class(
                            "flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-3",
                          ),
                        ],
                        [
                          h.div(
                            [h.Class("min-w-0")],
                            [
                              h.p(
                                [
                                  h.Class(
                                    "font-sans text-[14px] font-semibold leading-[18px] text-foreground",
                                  ),
                                ],
                                [entry.id],
                              ),
                              h.p(
                                [h.Class("mt-0.5 text-xs leading-4 text-muted-foreground")],
                                [
                                  `${meta.mode ?? "—"} • ${String(entry.value)} cases • ${String(modelCount)} model${modelCount === 1 ? "" : "s"}`,
                                ],
                              ),
                              h.p(
                                [h.Class("mt-0.5 text-xs leading-4 text-muted-foreground")],
                                [`${completed} • ${meta.suiteId ?? "—"}`],
                              ),
                              h.p(
                                [
                                  h.DataAttribute("benchmark-run-outcome-cell", outcomeLabel),
                                  h.Class(
                                    `mt-1 font-sans text-xs font-semibold ${
                                      outcomeLabel === "failed"
                                        ? "text-destructive"
                                        : outcomeLabel === "partial"
                                          ? "text-[var(--rm-warning,#b45309)]"
                                          : "text-foreground"
                                    }`,
                                  ),
                                ],
                                [
                                  `Outcome: ${outcomeLabel} · ${
                                    typeof passedCount === "number" &&
                                    typeof totalCount === "number"
                                      ? `${String(passedCount)}/${String(totalCount)} passed`
                                      : "counts unavailable"
                                  }`,
                                ],
                              ),
                            ],
                          ),
                          h.div(
                            [h.Class("flex shrink-0 items-center gap-2")],
                            [
                              h.span(
                                [
                                  h.Class(
                                    "inline-flex h-6 items-center rounded-full border border-border px-2 font-mono text-[11px] uppercase text-muted-foreground",
                                  ),
                                ],
                                [meta.mode ?? "—"],
                              ),
                              h.button(
                                [
                                  h.Type("button"),
                                  h.DataAttribute("benchmark-run-detail", entry.id),
                                  h.OnClick(
                                    Message.BenchmarkRunDetailRequested({ runId: entry.id }),
                                  ),
                                  h.Class(
                                    "inline-flex h-[30px] items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground",
                                  ),
                                ],
                                ["View details"],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ];
                  } catch {
                    return [];
                  }
                }),
              ),
          ...(() => {
            const detail = modelsView?.benchmarkRunDetail;
            if (detail === undefined) return [];
            if (detail.status === "loading") {
              return [
                h.div(
                  [
                    h.DataAttribute("benchmark-run-detail-panel", ""),
                    h.Class(
                      "mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground",
                    ),
                  ],
                  [`Loading run detail ${detail.runId}…`],
                ),
              ];
            }
            if (detail.status === "error") {
              return [
                h.div(
                  [
                    h.DataAttribute("benchmark-run-detail-panel", ""),
                    h.Role("alert"),
                    h.Class(
                      "mt-4 rounded-md border border-destructive/40 bg-background p-3 text-xs text-destructive",
                    ),
                  ],
                  [`Run detail failed: ${detail.message ?? "unknown error"}`],
                ),
              ];
            }
            const parsed = parseBenchmarkRunResult(detail.json);
            const stats = benchmarkResultStats(parsed);
            const statusLine =
              (parsed?.status ?? "completed") +
              (parsed?.outcome === undefined ? "" : ` · outcome ${parsed.outcome}`) +
              (parsed?.errorMessage === undefined ? "" : ` — ${parsed.errorMessage}`);
            return [
              h.div(
                [
                  h.DataAttribute("benchmark-run-detail-panel", ""),
                  h.Class(
                    "mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground",
                  ),
                ],
                [
                  h.p(
                    [
                      h.DataAttribute("benchmark-run-detail-status", ""),
                      h.Class("font-sans text-sm font-semibold leading-5 text-foreground"),
                    ],
                    [`Run detail · ${detail.runId} · ${statusLine}`],
                  ),
                  h.p(
                    [
                      h.DataAttribute("benchmark-run-detail-cases", ""),
                      h.Class(
                        stats.failed > 0
                          ? "font-sans text-sm font-semibold leading-5 text-destructive"
                          : "font-sans text-sm leading-5 text-foreground",
                      ),
                    ],
                    [
                      `${String(stats.passed)}/${String(stats.executed)} cases passed${stats.failed > 0 ? ` — ${String(stats.failed)} failed` : ""}`,
                    ],
                  ),
                  h.div(
                    [h.Class("mt-2 overflow-x-auto")],
                    [
                      h.table(
                        [h.Class("w-full min-w-[760px] border-collapse text-left text-sm")],
                        [
                          h.thead(
                            [],
                            [
                              h.tr(
                                [h.Class("border-b border-border")],
                                [
                                  "CASE",
                                  "DIFFICULTY",
                                  "SCORE",
                                  "RESULT",
                                  "RATIONALE",
                                  "ACTUAL PREVIEW",
                                  "JUDGE ERROR",
                                ].map((heading) =>
                                  h.th(
                                    [
                                      h.Class(
                                        "px-2 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
                                      ),
                                    ],
                                    [heading],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          h.tbody(
                            [],
                            stats.cases.map((entry) => {
                              const passed = typeof entry.score === "number" && entry.score > 0;
                              return h.tr(
                                [
                                  h.DataAttribute("benchmark-case-row", entry.caseId ?? ""),
                                  h.Class("border-b border-border last:border-b-0"),
                                ],
                                [
                                  h.td(
                                    [h.Class("px-2 py-2 font-mono text-[12px] text-foreground")],
                                    [entry.caseId ?? "—"],
                                  ),
                                  h.td(
                                    [h.Class("px-2 py-2 text-[12px] text-foreground")],
                                    [entry.difficultyBucket ?? "—"],
                                  ),
                                  h.td(
                                    [h.Class("px-2 py-2 font-mono text-[12px] text-foreground")],
                                    [`${String(Math.round((entry.score ?? 0) * 100))}%`],
                                  ),
                                  h.td(
                                    [
                                      h.DataAttribute(
                                        "benchmark-case-result",
                                        passed ? "pass" : "fail",
                                      ),
                                      h.Class(
                                        `px-2 py-2 text-[12px] font-semibold ${passed ? "text-foreground" : "text-destructive"}`,
                                      ),
                                    ],
                                    [passed ? "PASS" : "FAIL"],
                                  ),
                                  h.td(
                                    [h.Class("px-2 py-2 text-[12px] text-foreground")],
                                    [entry.rationale ?? "—"],
                                  ),
                                  h.td(
                                    [
                                      h.Class(
                                        "px-2 py-2 font-mono text-[11px] text-muted-foreground",
                                      ),
                                    ],
                                    [entry.actualPreview ?? "—"],
                                  ),
                                  h.td(
                                    [h.Class("px-2 py-2 font-mono text-[11px] text-destructive")],
                                    [entry.judgeError ?? entry.errorMessage ?? "—"],
                                  ),
                                ],
                              );
                            }),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ];
          })(),
        ],
        h,
      ),
    ],
    h,
  );
};
