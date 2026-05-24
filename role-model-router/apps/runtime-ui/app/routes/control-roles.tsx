import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
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

function RoleForm({
  draft,
  setDraft,
}: {
  draft: RoleDraft;
  setDraft: Dispatch<SetStateAction<RoleDraft>>;
}) {
  const update = (key: keyof RoleDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Role id</span>
        <input
          className={fieldClassName}
          value={draft.roleId}
          onChange={(event) => update("roleId", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Name</span>
        <input
          className={fieldClassName}
          value={draft.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-[var(--rm-fg)]">Description</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Role kind</span>
        <input
          className={fieldClassName}
          value={draft.roleKind}
          onChange={(event) => update("roleKind", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Tool policy mode</span>
        <select
          className={fieldClassName}
          value={draft.toolPolicyMode}
          onChange={(event) => update("toolPolicyMode", event.target.value)}
        >
          <option value="allowed">allowed</option>
          <option value="limited">limited</option>
          <option value="disabled">disabled</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-[var(--rm-fg)]">Default system instructions</span>
        <textarea
          className={`${fieldClassName} min-h-28`}
          value={draft.defaultSystemInstructions}
          onChange={(event) => update("defaultSystemInstructions", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Supported task types</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.taskTypesSupported}
          onChange={(event) => update("taskTypesSupported", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Allowed tools</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.allowedTools}
          onChange={(event) => update("allowedTools", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Required capabilities</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.requiredCapabilities}
          onChange={(event) => update("requiredCapabilities", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Preferred capabilities</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.preferredCapabilities}
          onChange={(event) => update("preferredCapabilities", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Forbidden capabilities</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.forbiddenCapabilities}
          onChange={(event) => update("forbiddenCapabilities", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Output contracts</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.outputContracts}
          onChange={(event) => update("outputContracts", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--rm-fg)]">Safety policy refs</span>
        <textarea
          className={`${fieldClassName} min-h-24`}
          value={draft.safetyPolicyRefs}
          onChange={(event) => update("safetyPolicyRefs", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-[var(--rm-fg)]">Routing policy overrides (JSON)</span>
        <textarea
          className={`${fieldClassName} min-h-32 font-mono text-xs`}
          spellCheck={false}
          value={draft.routingOverridesText}
          onChange={(event) => update("routingOverridesText", event.target.value)}
        />
      </label>
    </div>
  );
}

export default function ControlRolesRoute() {
  const [policy, setPolicy] = useState<RuntimeRolePolicy | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
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

  useEffect(() => {
    setEditDraft(selectedRole ? toRoleDraft(selectedRole) : null);
  }, [selectedRole]);

  const limitedRoleCount = useMemo(
    () => policy?.roleDefinitions.filter((role) => role.tool_policy.mode !== "allowed").length ?? 0,
    [policy],
  );

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
      <PageHeader
        eyebrow="Models"
        title="Runtime roles"
        description="Author full router-grade role policy in the live control plane, then manage which roles each task type can use without falling back to seeded JSON."
        actions={
          <>
            <Link className={secondaryButtonClassName} to="/app/models">
              Model bindings
            </Link>
            <Link className={secondaryButtonClassName} to="/app/router/config">
              Routing config
            </Link>
          </>
        }
      />

      {error ? <ErrorState label={error} /> : null}
      {!policy ? <LoadingState label="Loading runtime role policy…" /> : null}

      {policy ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FactCard
              label="Roles"
              value={policy.roleDefinitions.length}
              detail="Router-visible role definitions from the live runtime policy."
              emphasis
            />
            <FactCard
              label="Tasks"
              value={policy.taskDefinitions.length}
              detail="Task contracts currently participating in role allowlists."
            />
            <FactCard
              label="Restricted tool policy"
              value={limitedRoleCount}
              detail="Roles whose tool policy is limited or disabled."
            />
            <FactCard
              label="Selected role"
              value={selectedRole?.role_id ?? "None"}
              detail="Use the editor below to change the selected role definition."
            />
          </div>

          <SectionCard
            title="Role catalog"
            description="Scan live roles, supported task types, and tool posture before selecting a definition to edit."
          >
            {policy.roleDefinitions.length === 0 ? (
              <EmptyState label="No runtime roles are defined yet." />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {policy.roleDefinitions.map((role) => (
                  <button
                    key={role.role_id}
                    className={`${mutedPanelClassName} space-y-3 p-4 text-left ${
                      selectedRoleId === role.role_id ? "border-[var(--rm-accent)]" : ""
                    }`}
                    type="button"
                    onClick={() => setSelectedRoleId(role.role_id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--rm-fg)]">{role.name}</p>
                        <p className="mt-1 break-all text-xs uppercase tracking-[0.16em] text-[var(--rm-muted)]">
                          {role.role_id}
                        </p>
                      </div>
                      <StatusPill
                        tone={role.tool_policy.mode === "allowed" ? "success" : "warning"}
                      >
                        {role.tool_policy.mode}
                      </StatusPill>
                    </div>
                    <p className="text-sm leading-6 text-[var(--rm-secondary)]">
                      {role.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {role.task_types_supported.map((taskType) => (
                        <StatusPill key={taskType} tone="neutral">
                          {taskType}
                        </StatusPill>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Create role"
            description="Add a new router-visible role with the full runtime policy fields required by the bridge."
          >
            <div className="space-y-4">
              <RoleForm draft={createDraft} setDraft={setCreateDraft} />
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
          </SectionCard>

          <SectionCard
            title="Edit selected role"
            description="Update the active runtime role definition in-place, including tool policy, task coverage, and routing overrides."
          >
            {!editDraft ? (
              <EmptyState label="Select a role from the catalog to edit it." />
            ) : (
              <div className="space-y-4">
                <RoleForm
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
                    onClick={() => setEditDraft(selectedRole ? toRoleDraft(selectedRole) : null)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Task allowlists"
            description="Each task keeps its existing contract fields while allowed roles stay editable from the same live policy surface."
          >
            {policy.taskDefinitions.length === 0 ? (
              <EmptyState label="No task definitions are available yet." />
            ) : (
              <div className="space-y-4">
                {policy.taskDefinitions.map((task) => (
                  <div key={task.task_type} className={`${mutedPanelClassName} space-y-3 p-4`}>
                    <div>
                      <p className="font-medium text-[var(--rm-fg)]">{task.task_type}</p>
                      <p className="mt-1 text-sm text-[var(--rm-secondary)]">{task.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {task.required_capabilities.map((capability) => (
                        <StatusPill key={capability} tone="neutral">
                          {capability}
                        </StatusPill>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {policy.roleDefinitions.map((role) => (
                        <label
                          key={`${task.task_type}:${role.role_id}`}
                          className="flex items-center gap-2 rounded-none border border-[var(--rm-border)] px-3 py-2 text-sm text-[var(--rm-secondary)]"
                        >
                          <input
                            checked={(taskRoleSelections[task.task_type] ?? []).includes(
                              role.role_id,
                            )}
                            type="checkbox"
                            onChange={() => toggleTaskRole(task.task_type, role.role_id)}
                          />
                          <span>{role.role_id}</span>
                        </label>
                      ))}
                    </div>
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
          </SectionCard>

          {statusMessage ? (
            <p className="text-sm text-[var(--rm-secondary)]">{statusMessage}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
