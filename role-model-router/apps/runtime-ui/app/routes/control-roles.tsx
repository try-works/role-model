import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DisclosureSection,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
  StatusPill,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  bodyTextClassName,
  fieldClassName,
  foregroundEmphasisClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityStrongTextClassName,
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
        <span className={utilityStrongTextClassName}>Role id</span>
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
        <span className={utilityStrongTextClassName}>Name</span>
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

function RoleDefaultInstructionsField({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  return (
    <label className="grid gap-2">
      <span className={utilityStrongTextClassName}>Default system instructions</span>
      <textarea
        className={`${fieldClassName} min-h-28`}
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
      <span className={utilityStrongTextClassName}>Routing policy overrides (JSON)</span>
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
  includeRoutingOverrides = true,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
  includeRoutingOverrides?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 md:col-span-2">
        <span className={utilityStrongTextClassName}>Description</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
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
      <label className="grid gap-2">
        <span className={utilityStrongTextClassName}>Role kind</span>
        <input
          className={fieldClassName}
          value={draft.roleKind}
          onChange={(event) =>
            updateRoleDraftField({
              setDraft,
              key: "roleKind",
              value: event.target.value,
            })
          }
        />
      </label>
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
      <label className="grid gap-2">
        <span className={utilityStrongTextClassName}>Supported task types</span>
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
        <span className={utilityStrongTextClassName}>Allowed tools</span>
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
        <span className={utilityStrongTextClassName}>Required capabilities</span>
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
        <span className={utilityStrongTextClassName}>Preferred capabilities</span>
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
        <span className={utilityStrongTextClassName}>Forbidden capabilities</span>
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
        <span className={utilityStrongTextClassName}>Output contracts</span>
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
        <span className={utilityStrongTextClassName}>Safety policy refs</span>
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
    const suffix =
      selectedRole.task_types_supported.length > 3
        ? ` +${selectedRole.task_types_supported.length - 3} more`
        : "";
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
              description="Add a new router-visible role with the runtime policy fields required by the bridge."
            >
              <DisclosureSection summary="Open create role form">
                <div className="space-y-4">
                  <RoleIdentityFields draft={createDraft} setDraft={setCreateDraft} />
                  <RoleDefaultInstructionsField draft={createDraft} setDraft={setCreateDraft} />
                  <DisclosureSection summary="Advanced policy fields">
                    <RoleAdvancedPolicyFields draft={createDraft} setDraft={setCreateDraft} />
                  </DisclosureSection>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={primaryButtonClassName}
                      type="button"
                      disabled={savingCreate}
                      onClick={() => void saveNewRole()}
                    >
                      {savingCreate ? "Creating…" : "Create role"}
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      disabled={savingCreate}
                      onClick={() => setCreateDraft(createBlankRoleDraft())}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </DisclosureSection>
            </SectionCard>

            <SectionCard
              title="Role catalog"
              description="The runtime page leads with a role-first catalog before task detail editing. Scan live roles first, then open task detail only when you want the lower-level task contract for a specific role."
            >
              {policy.roleDefinitions.length === 0 ? (
                <EmptyState label="No runtime roles are defined yet." />
              ) : (
                <div className="max-h-[68vh] overflow-auto pr-1">
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
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
                      <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                        <p className={utilityStrongTextClassName}>{expandedRole.label}</p>
                        <p className={supportingTextClassName}>
                          Role id: <span className="font-mono">{expandedRole.roleId}</span>
                        </p>
                      </div>
                      {expandedRole.tasks.map((task) => (
                        <div key={task.taskType} className={`${mutedPanelClassName} space-y-3 p-4`}>
                          <div>
                            <p className={bodyStrongTextClassName}>{task.taskType}</p>
                            <p className={`mt-1 ${supportingTextClassName}`}>{task.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {task.requiredCapabilities.map((capability) => (
                              <StatusPill key={capability} tone="neutral">
                                {capability}
                              </StatusPill>
                            ))}
                          </div>
                          <label
                            className={`flex items-center gap-2 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-3 py-2 ${supportingTextClassName}`}
                          >
                            <input
                              checked={(taskRoleSelections[task.taskType] ?? []).includes(
                                expandedRole.roleId,
                              )}
                              type="checkbox"
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
                  description="Update the active runtime role definition in-place, including tool policy, task coverage, and routing overrides."
                >
                  <div className="max-h-[52vh] overflow-auto pr-1">
                    {!editDraft ? (
                      <EmptyState label="Select a role from the catalog to edit it." />
                    ) : (
                      <div className="space-y-4">
                        <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                          <p className={bodyTextClassName}>
                            <span className={foregroundEmphasisClassName}>tool policy mode:</span>{" "}
                            {editDraft.toolPolicyMode} •{" "}
                            <span className={foregroundEmphasisClassName}>supported tasks:</span>{" "}
                            {selectedRoleTaskPreview}
                          </p>
                        </div>
                        <RoleRoutingOverridesField
                          draft={editDraft}
                          setDraft={(updater) =>
                            setEditDraft((current) => {
                              if (!current) {
                                return current;
                              }
                              return typeof updater === "function" ? updater(current) : updater;
                            })
                          }
                        />
                        <DisclosureSection summary="Edit all role fields">
                          <div className="space-y-4">
                            <RoleIdentityFields
                              draft={editDraft}
                              setDraft={(updater) =>
                                setEditDraft((current) => {
                                  if (!current) {
                                    return current;
                                  }
                                  return typeof updater === "function" ? updater(current) : updater;
                                })
                              }
                            />
                            <RoleDefaultInstructionsField
                              draft={editDraft}
                              setDraft={(updater) =>
                                setEditDraft((current) => {
                                  if (!current) {
                                    return current;
                                  }
                                  return typeof updater === "function" ? updater(current) : updater;
                                })
                              }
                            />
                            <RoleAdvancedPolicyFields
                              draft={editDraft}
                              includeRoutingOverrides={false}
                              setDraft={(updater) =>
                                setEditDraft((current) => {
                                  if (!current) {
                                    return current;
                                  }
                                  return typeof updater === "function" ? updater(current) : updater;
                                })
                              }
                            />
                          </div>
                        </DisclosureSection>
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
