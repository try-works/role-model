import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CheckboxControl } from "../components/checkbox-control";
import {
  Badge,
  DisclosureSection,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  bodyTextClassName,
  compactFieldButtonClassName,
  compactFieldButtonEmphasisClassName,
  fieldClassName,
  fieldLabelClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { RoleCatalogHierarchy, buildRoleTaskHierarchy } from "../lib/role-task-hierarchy";
import {
  type RuntimeRolePolicy,
  type RuntimeRolePolicyRole,
  createRolePolicyRole,
  fetchRolePolicy,
  updateRolePolicyRole,
  updateTaskDefinitions,
} from "../lib/runtime-api";

type RoleDraft = {
  roleId: string;
  name: string;
  description: string;
  roleKind: string;
  defaultSystemInstructions: string;
  taskTypesSupported: string;
  requiredCapabilities: string;
  preferredCapabilities: string;
  forbiddenCapabilities: string;
  toolPolicyMode: string;
  allowedTools: string;
  routingOverridesText: string;
  outputContracts: string;
  safetyPolicyRefs: string;
};

function parseTokenList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/g)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function formatTokenList(values: readonly string[] | undefined): string {
  return values?.join(", ") ?? "";
}

function createBlankRoleDraft(): RoleDraft {
  return {
    roleId: "",
    name: "",
    description: "",
    roleKind: "assistant",
    defaultSystemInstructions: "",
    taskTypesSupported: "",
    requiredCapabilities: "",
    preferredCapabilities: "",
    forbiddenCapabilities: "",
    toolPolicyMode: "allowed",
    allowedTools: "",
    routingOverridesText: "{}",
    outputContracts: "",
    safetyPolicyRefs: "",
  };
}

function toRoleDraft(role: RuntimeRolePolicyRole): RoleDraft {
  return {
    roleId: role.role_id,
    name: role.name,
    description: role.description,
    roleKind: role.role_kind,
    defaultSystemInstructions: role.default_system_instructions,
    taskTypesSupported: formatTokenList(role.task_types_supported),
    requiredCapabilities: formatTokenList(role.required_capabilities),
    preferredCapabilities: formatTokenList(role.preferred_capabilities),
    forbiddenCapabilities: formatTokenList(role.forbidden_capabilities),
    toolPolicyMode: role.tool_policy.mode,
    allowedTools: formatTokenList(role.tool_policy.allowed_tools),
    routingOverridesText: JSON.stringify(role.routing_policy_overrides ?? {}, null, 2),
    outputContracts: formatTokenList(role.output_contracts),
    safetyPolicyRefs: formatTokenList(role.safety_policy_refs),
  };
}

function toRolePayload(draft: RoleDraft): Record<string, unknown> {
  return {
    role_id: draft.roleId.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    role_kind: draft.roleKind.trim(),
    default_system_instructions: draft.defaultSystemInstructions.trim(),
    task_types_supported: parseTokenList(draft.taskTypesSupported),
    required_capabilities: parseTokenList(draft.requiredCapabilities),
    preferred_capabilities: parseTokenList(draft.preferredCapabilities),
    forbidden_capabilities: parseTokenList(draft.forbiddenCapabilities),
    tool_policy: {
      mode: draft.toolPolicyMode.trim(),
      allowed_tools: parseTokenList(draft.allowedTools),
    },
    routing_policy_overrides: JSON.parse(draft.routingOverridesText || "{}") as Record<
      string,
      unknown
    >,
    output_contracts: parseTokenList(draft.outputContracts),
    safety_policy_refs: parseTokenList(draft.safetyPolicyRefs),
  };
}

function updateRoleDraftField({
  setDraft,
  key,
  value,
}: {
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
  key: keyof RoleDraft;
  value: string;
}) {
  setDraft((current) => ({ ...current, [key]: value }));
}

function RoleIdentityFields({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Role id</span>
        <input
          className={fieldClassName}
          value={draft.roleId}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "roleId",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Name</span>
        <input
          className={fieldClassName}
          value={draft.name}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "name",
              value: event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}

function RoleDescriptionField({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClassName}>Description</span>
      <textarea
        className={`${fieldClassName} min-h-14`}
        value={draft.description}
        onChange={(event) =>
          updateRoleDraftField({
            setDraft,
            key: "description",
            value: event.target.value,
          })
        }
      />
    </label>
  );
}

const ROLE_KIND_OPTIONS = ["assistant", "capability"] as const;

function RoleKindField({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  const known = new Set<string>(ROLE_KIND_OPTIONS);
  const options = known.has(draft.roleKind.trim())
    ? [...ROLE_KIND_OPTIONS]
    : [draft.roleKind.trim(), ...ROLE_KIND_OPTIONS].filter(Boolean);

  return (
    <SelectField
      label="Kind"
      value={draft.roleKind}
      onChange={(value) =>
        updateRoleDraftField({
          setDraft,
          key: "roleKind",
          value,
        })
      }
    >
      {options.map((kind) => (
        <option key={kind} value={kind}>
          {kind}
        </option>
      ))}
    </SelectField>
  );
}

function RoleToolPolicyField({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  return (
    <SelectField
      label="Tool policy mode"
      value={draft.toolPolicyMode}
      onChange={(value) =>
        updateRoleDraftField({
          setDraft,
          key: "toolPolicyMode",
          value,
        })
      }
    >
      <option value="allowed">allowed</option>
      <option value="limited">limited</option>
      <option value="disabled">disabled</option>
    </SelectField>
  );
}

function RoleDefaultInstructionsField({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClassName}>Default system instructions</span>
      <textarea
        className={`${fieldClassName} min-h-[72px]`}
        value={draft.defaultSystemInstructions}
        onChange={(event) =>
          updateRoleDraftField({
            setDraft,
            key: "defaultSystemInstructions",
            value: event.target.value,
          })
        }
      />
    </label>
  );
}

function RoleRoutingOverridesField({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClassName}>Routing policy overrides (JSON)</span>
      <textarea
        className={`${fieldClassName} min-h-32 font-mono`}
        spellCheck={false}
        value={draft.routingOverridesText}
        onChange={(event) =>
          updateRoleDraftField({
            setDraft,
            key: "routingOverridesText",
            value: event.target.value,
          })
        }
      />
    </label>
  );
}

function RoleAdvancedPolicyFields({
  draft,
  setDraft,
  includeDescription = true,
  includeRoleKind = true,
  includeToolPolicy = true,
  includeRoutingOverrides = true,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
  includeDescription?: boolean;
  includeRoleKind?: boolean;
  includeToolPolicy?: boolean;
  includeRoutingOverrides?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {includeDescription ? (
        <div className="md:col-span-2">
          <RoleDescriptionField draft={draft} setDraft={setDraft} />
        </div>
      ) : null}
      {includeRoleKind ? <RoleKindField draft={draft} setDraft={setDraft} /> : null}
      {includeToolPolicy ? <RoleToolPolicyField draft={draft} setDraft={setDraft} /> : null}
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Supported task types</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.taskTypesSupported}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "taskTypesSupported",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Allowed tools</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.allowedTools}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "allowedTools",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Required capabilities</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.requiredCapabilities}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "requiredCapabilities",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Preferred capabilities</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.preferredCapabilities}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "preferredCapabilities",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Forbidden capabilities</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.forbiddenCapabilities}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "forbiddenCapabilities",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Output contracts</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.outputContracts}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "outputContracts",
              value: event.target.value,
            })
          }
        />
      </label>
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>Safety policy refs</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.safetyPolicyRefs}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "safetyPolicyRefs",
              value: event.target.value,
            })
          }
        />
      </label>
      {includeRoutingOverrides ? (
        <div className="md:col-span-2">
          <RoleRoutingOverridesField draft={draft} setDraft={setDraft} />
        </div>
      ) : null}
    </div>
  );
}

export default function ControlRolesRoute() {
  const [policy, setPolicy] = useState<RuntimeRolePolicy | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<RoleDraft>(createBlankRoleDraft());
  const [editDraft, setEditDraft] = useState<RoleDraft | null>(null);
  const [taskRoleSelections, setTaskRoleSelections] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);

  const loadPolicy = useCallback(async (preferredRoleId?: string | null) => {
    const nextPolicy = await fetchRolePolicy();
    setPolicy(nextPolicy);
    setTaskRoleSelections(
      Object.fromEntries(
        nextPolicy.taskDefinitions.map(
          (task) => [task.task_type, [...task.allowed_roles]] as const,
        ),
      ),
    );
    const nextSelectedRoleId =
      preferredRoleId && nextPolicy.roleDefinitions.some((role) => role.role_id === preferredRoleId)
        ? preferredRoleId
        : (nextPolicy.roleDefinitions[0]?.role_id ?? null);
    setSelectedRoleId(nextSelectedRoleId);
    setEditDraft(
      nextSelectedRoleId
        ? toRoleDraft(
            nextPolicy.roleDefinitions.find((role) => role.role_id === nextSelectedRoleId) ??
              nextPolicy.roleDefinitions[0],
          )
        : null,
    );
  }, []);

  useEffect(() => {
    void loadPolicy().catch((value: unknown) =>
      setError(value instanceof Error ? value.message : "Could not load runtime roles."),
    );
  }, [loadPolicy]);

  const updateEditDraft: Dispatch<SetStateAction<RoleDraft>> = (updater) => {
    setEditDraft((current) => {
      if (!current) {
        return current;
      }
      return typeof updater === "function" ? updater(current) : updater;
    });
  };

  const selectedRole = useMemo(
    () => policy?.roleDefinitions.find((role) => role.role_id === selectedRoleId) ?? null,
    [policy, selectedRoleId],
  );
  const roleTaskHierarchy = useMemo(
    () =>
      policy
        ? buildRoleTaskHierarchy(policy.roleDefinitions, policy.taskDefinitions)
        : ([] as const),
    [policy],
  );
  const expandedRole = useMemo(
    () => roleTaskHierarchy.find((role) => role.roleId === expandedRoleId) ?? null,
    [expandedRoleId, roleTaskHierarchy],
  );

  useEffect(() => {
    setEditDraft(selectedRole ? toRoleDraft(selectedRole) : null);
  }, [selectedRole]);

  const selectedRoleTaskPreview = useMemo(() => {
    if (!selectedRole) {
      return "none";
    }
    const tasks = selectedRole.task_types_supported.slice(0, 3);
    const overflow = selectedRole.task_types_supported.length - 3;
    const suffix = overflow > 0 ? ` +${overflow}` : "";
    return tasks.length > 0 ? `${tasks.join(", ")}${suffix}` : "none";
  }, [selectedRole]);

  const saveNewRole = async () => {
    setSavingCreate(true);
    setStatusMessage(null);
    try {
      const payload = toRolePayload(createDraft);
      await createRolePolicyRole(payload);
      await loadPolicy(createDraft.roleId.trim());
      setCreateDraft(createBlankRoleDraft());
      setError(null);
      setStatusMessage("Role created.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not create role.");
    } finally {
      setSavingCreate(false);
    }
  };

  const saveSelectedRole = async () => {
    if (!selectedRole || !editDraft) {
      return;
    }
    setSavingEdit(true);
    setStatusMessage(null);
    try {
      await updateRolePolicyRole(selectedRole.role_id, toRolePayload(editDraft));
      await loadPolicy(selectedRole.role_id);
      setError(null);
      setStatusMessage("Role updated.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update role.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleTaskRole = (taskType: string, roleId: string) => {
    setTaskRoleSelections((current) => {
      const nextRoleIds = new Set(current[taskType] ?? []);
      if (nextRoleIds.has(roleId)) {
        nextRoleIds.delete(roleId);
      } else {
        nextRoleIds.add(roleId);
      }
      return {
        ...current,
        [taskType]: [...nextRoleIds].sort((left, right) => left.localeCompare(right, "en")),
      };
    });
  };

  const saveTasks = async () => {
    if (!policy) {
      return;
    }
    setSavingTasks(true);
    setStatusMessage(null);
    try {
      await updateTaskDefinitions(
        policy.taskDefinitions.map((task) => ({
          ...task,
          allowed_roles: taskRoleSelections[task.task_type] ?? [...task.allowed_roles],
        })),
      );
      await loadPolicy(selectedRoleId);
      setError(null);
      setStatusMessage("Task allowlists updated.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update task allowlists.");
    } finally {
      setSavingTasks(false);
    }
  };

  if (error && !policy) {
    return <ErrorState label={error} />;
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorState label={error} /> : null}
      {!policy ? <LoadingState label="Loading runtime role policy…" /> : null}

      {policy ? (
        <>
          <div className="space-y-6">
            <SectionCard
              title="Create role"
              description="Add a router-visible role with identity, instructions, and policy fields."
            >
              <div className="space-y-4">
                <RoleIdentityFields draft={createDraft} setDraft={setCreateDraft} />
                <RoleDescriptionField draft={createDraft} setDraft={setCreateDraft} />
                <RoleDefaultInstructionsField draft={createDraft} setDraft={setCreateDraft} />
                <div className="flex flex-wrap gap-3">
                  <button
                    className={compactFieldButtonEmphasisClassName}
                    type="button"
                    disabled={savingCreate}
                    onClick={() => void saveNewRole()}
                  >
                    {savingCreate ? "Creating…" : "Create role"}
                  </button>
                  <button
                    className={compactFieldButtonClassName}
                    type="button"
                    disabled={savingCreate}
                    onClick={() => setCreateDraft(createBlankRoleDraft())}
                  >
                    Reset
                  </button>
                </div>
                <DisclosureSection summary="Advanced policy fields">
                  <RoleAdvancedPolicyFields
                    draft={createDraft}
                    setDraft={setCreateDraft}
                    includeDescription={false}
                  />
                </DisclosureSection>
              </div>
            </SectionCard>

            <SectionCard
              title="Role catalog"
              description="Select a role to edit identity and task allowlists. Expand Task detail only when you need the lower-level task contract."
            >
              {policy.roleDefinitions.length === 0 ? (
                <EmptyState label="No runtime roles are defined yet." />
              ) : (
                <div className="max-h-[68vh] overflow-auto">
                  <RoleCatalogHierarchy
                    roleDefinitions={policy.roleDefinitions}
                    taskDefinitions={policy.taskDefinitions}
                    expandedRoleId={expandedRoleId}
                    onToggleTaskDetail={(roleId) =>
                      setExpandedRoleId((current) => (current === roleId ? null : roleId))
                    }
                    selectedRoleId={selectedRoleId}
                    onSelectRole={setSelectedRoleId}
                  />
                </div>
              )}
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
              <SectionCard
                title="Role task allowlists"
                description="Tasks stay nested under the selected role so allowlist editing follows the same role-first hierarchy shown in the catalog."
              >
                <div className="max-h-[52vh] overflow-auto pr-1">
                  {policy.taskDefinitions.length === 0 ? (
                    <EmptyState label="No task definitions are available yet." />
                  ) : !expandedRole ? (
                    <EmptyState label="Open Task detail on a role to inspect or edit its task memberships." />
                  ) : (
                    <div className="space-y-4">
                      <div className={`${mutedPanelClassName} space-y-1 p-4`}>
                        <p className={bodyStrongTextClassName}>{expandedRole.label}</p>
                        <p className={supportingTextClassName}>
                          Role id: <span className="font-mono">{expandedRole.roleId}</span>
                          {" · "}
                          {expandedRole.tasks.length} tasks in allowlist
                        </p>
                      </div>
                      {expandedRole.tasks.map((task) => (
                        <div
                          key={task.taskType}
                          className={`${mutedPanelClassName} space-y-2.5 p-3`}
                        >
                          <div>
                            <p className={bodyStrongTextClassName}>{task.taskType}</p>
                            <p className={`mt-1 ${supportingTextClassName}`}>{task.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {task.requiredCapabilities.map((capability) => (
                              <Badge
                                key={capability}
                                tone="neutral"
                                className="font-mono text-[11px] leading-[14px] font-normal"
                              >
                                {capability}
                              </Badge>
                            ))}
                          </div>
                          <label className="flex h-8 items-center gap-2 rounded-[var(--rm-radius-md)] border border-[var(--rm-border)] px-2.5 font-mono text-[12px] leading-4 text-[var(--rm-fg)]">
                            <CheckboxControl
                              checked={(taskRoleSelections[task.taskType] ?? []).includes(
                                expandedRole.roleId,
                              )}
                              aria-label={`Allow ${expandedRole.roleId} for ${task.taskType}`}
                              onChange={() => toggleTaskRole(task.taskType, expandedRole.roleId)}
                            />
                            <span>{expandedRole.roleId}</span>
                          </label>
                        </div>
                      ))}
                      <button
                        className={primaryButtonClassName}
                        type="button"
                        disabled={savingTasks}
                        onClick={() => void saveTasks()}
                      >
                        {savingTasks ? "Saving…" : "Save task allowlists"}
                      </button>
                    </div>
                  )}
                </div>
              </SectionCard>

              <div className="space-y-6">
                <SectionCard
                  title="Edit selected role"
                  description="Update identity, instructions, tool policy, and routing overrides."
                >
                  <div className="max-h-[52vh] overflow-auto pr-1">
                    {!editDraft ? (
                      <EmptyState label="Select a role from the catalog to edit it." />
                    ) : (
                      <div className="space-y-4">
                        <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                          <p className={bodyTextClassName}>
                            tool policy {editDraft.toolPolicyMode}
                            {" · "}
                            supported tasks {selectedRoleTaskPreview}
                          </p>
                        </div>
                        <RoleIdentityFields draft={editDraft} setDraft={updateEditDraft} />
                        <RoleKindField draft={editDraft} setDraft={updateEditDraft} />
                        <RoleDescriptionField draft={editDraft} setDraft={updateEditDraft} />
                        <RoleDefaultInstructionsField
                          draft={editDraft}
                          setDraft={updateEditDraft}
                        />
                        <RoleToolPolicyField draft={editDraft} setDraft={updateEditDraft} />
                        <RoleRoutingOverridesField draft={editDraft} setDraft={updateEditDraft} />
                        <div className="flex flex-wrap gap-3">
                          <button
                            className={primaryButtonClassName}
                            type="button"
                            disabled={savingEdit}
                            onClick={() => void saveSelectedRole()}
                          >
                            {savingEdit ? "Saving…" : "Save role"}
                          </button>
                          <button
                            className={secondaryButtonClassName}
                            type="button"
                            disabled={savingEdit}
                            onClick={() =>
                              setEditDraft(selectedRole ? toRoleDraft(selectedRole) : null)
                            }
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {statusMessage ? <p className={supportingTextClassName}>{statusMessage}</p> : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
