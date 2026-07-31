import { StatusPill } from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "./design-system";
import type { RuntimeRolePolicyRole, RuntimeTaskDefinition } from "./runtime-api";

type RoleTaskHierarchyTask = {
  readonly taskType: string;
  readonly description: string;
  readonly requiredCapabilities: readonly string[];
  readonly preferredCapabilities: readonly string[];
  readonly allowedRoles: readonly string[];
};

export type RoleTaskHierarchyItem = {
  readonly roleId: string;
  readonly label: string;
  readonly description: string;
  readonly primaryGroupId: string;
  readonly secondaryGroupIds: readonly string[];
  readonly riskLevel?: string;
  readonly toolPolicyMode: string;
  readonly tasks: readonly RoleTaskHierarchyTask[];
};

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function groupLabel(groupId: string): string {
  return groupId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function isHighRiskRole(role: { readonly roleId: string; readonly riskLevel?: string }): boolean {
  return (
    role.riskLevel === "high" ||
    ["security", "legal", "finance", "recruiter", "health"].includes(role.roleId)
  );
}

export function buildRoleTaskHierarchy(
  roleDefinitions: readonly RuntimeRolePolicyRole[],
  taskDefinitions: readonly RuntimeTaskDefinition[],
): readonly RoleTaskHierarchyItem[] {
  return [...roleDefinitions]
    .sort((left, right) => compareText(left.role_id, right.role_id))
    .map((roleDefinition) => ({
      roleId: roleDefinition.role_id,
      label: roleDefinition.name,
      description: roleDefinition.description,
      primaryGroupId: roleDefinition.primaryGroupId ?? "ungrouped",
      secondaryGroupIds: roleDefinition.secondaryGroupIds ?? [],
      riskLevel: roleDefinition.riskLevel,
      toolPolicyMode: roleDefinition.tool_policy.mode,
      tasks: taskDefinitions
        .filter(
          (taskDefinition) =>
            taskDefinition.allowed_roles.includes(roleDefinition.role_id) ||
            roleDefinition.task_types_supported.includes(taskDefinition.task_type),
        )
        .sort((left, right) => compareText(left.task_type, right.task_type))
        .map((taskDefinition) => ({
          taskType: taskDefinition.task_type,
          description: taskDefinition.description,
          requiredCapabilities: [...taskDefinition.required_capabilities].sort(compareText),
          preferredCapabilities: [...taskDefinition.preferred_capabilities].sort(compareText),
          allowedRoles: [...taskDefinition.allowed_roles].sort(compareText),
        })),
    }));
}

export function RoleCatalogHierarchy({
  roleDefinitions,
  taskDefinitions,
  expandedRoleId,
  onToggleTaskDetail,
  selectedRoleId,
  onSelectRole,
}: {
  readonly roleDefinitions: readonly RuntimeRolePolicyRole[];
  readonly taskDefinitions: readonly RuntimeTaskDefinition[];
  readonly expandedRoleId: string | null;
  readonly onToggleTaskDetail: (roleId: string) => void;
  readonly selectedRoleId: string | null;
  readonly onSelectRole: (roleId: string) => void;
}) {
  const hierarchy = buildRoleTaskHierarchy(roleDefinitions, taskDefinitions);
  const groupedHierarchy = hierarchy.reduce((groups, role) => {
    const existing = groups.get(role.primaryGroupId) ?? [];
    existing.push(role);
    groups.set(role.primaryGroupId, existing);
    return groups;
  }, new Map<string, RoleTaskHierarchyItem[]>());

  return (
    <div className="space-y-6">
      {[...groupedHierarchy.entries()].map(([groupId, roles]) => (
        <section key={groupId} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--rm-muted)]">
            {groupLabel(groupId)}
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {roles.map((role) => {
              const isExpanded = expandedRoleId === role.roleId;
              return (
                <article
                  key={role.roleId}
                  className={`${mutedPanelClassName} space-y-4 p-4 ${
                    selectedRoleId === role.roleId ? "border-[var(--rm-accent)]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--rm-fg)]">{role.label}</p>
                        {isHighRiskRole(role) ? (
                          <StatusPill tone="warning">High risk</StatusPill>
                        ) : null}
                      </div>
                      <p className="mt-1 break-all text-xs uppercase tracking-[0.16em] text-[var(--rm-muted)]">
                        {role.roleId}
                      </p>
                      {role.secondaryGroupIds.length > 0 ? (
                        <p className="mt-1 text-xs text-[var(--rm-muted)]">
                          Secondary: {role.secondaryGroupIds.map(groupLabel).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <StatusPill tone={role.toolPolicyMode === "allowed" ? "success" : "warning"}>
                      {role.toolPolicyMode}
                    </StatusPill>
                  </div>
                  <p className="text-sm leading-6 text-[var(--rm-secondary)]">{role.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      onClick={() => onSelectRole(role.roleId)}
                    >
                      {selectedRoleId === role.roleId ? "Selected" : "Select role"}
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      onClick={() => onToggleTaskDetail(role.roleId)}
                    >
                      {isExpanded ? "Hide task detail" : "Task detail"}
                    </button>
                  </div>
                  {isExpanded ? (
                    <div className="space-y-3 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-4 py-3">
                      {role.tasks.length === 0 ? (
                        <p className="text-sm text-[var(--rm-secondary)]">
                          No tasks are currently assigned.
                        </p>
                      ) : (
                        role.tasks.map((task) => (
                          <div key={task.taskType} className="space-y-2">
                            <div className="flex flex-wrap items-start gap-2">
                              <StatusPill tone="neutral">{task.taskType}</StatusPill>
                            </div>
                            <p className="text-sm text-[var(--rm-secondary)]">{task.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const roleTreeChevronPath = {
  expanded: "M4 6l4 4 4-4",
  collapsed: "M6 4l4 4-4 4",
} as const;

/** Compact Paper Models-inventory roles→tasks binder (checkbox rows + expand). */
export function ModelRoleBindingTree({
  roleDefinitions,
  taskDefinitions,
  selectedRoleIds,
  expandedRoleId,
  onToggleRole,
  onToggleExpandedRole,
}: {
  readonly roleDefinitions: readonly RuntimeRolePolicyRole[];
  readonly taskDefinitions: readonly RuntimeTaskDefinition[];
  readonly selectedRoleIds: readonly string[];
  readonly expandedRoleId: string | null;
  readonly onToggleRole: (roleId: string, nextChecked: boolean) => void;
  readonly onToggleExpandedRole: (roleId: string) => void;
}) {
  const hierarchy = buildRoleTaskHierarchy(roleDefinitions, taskDefinitions);
  const selected = new Set(selectedRoleIds);

  return (
    <div className="space-y-1">
      {hierarchy.map((role) => {
        const isChecked = selected.has(role.roleId);
        const isExpanded = expandedRoleId === role.roleId;
        return (
          <div key={role.roleId} className="rounded-[var(--rm-radius-field)]">
            <div className="flex items-center gap-2 px-1 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded-[var(--rm-radius-sm)] border-[var(--rm-border-strong)] accent-[var(--rm-accent)]"
                checked={isChecked}
                onChange={(event) => onToggleRole(role.roleId, event.target.checked)}
                aria-label={`Bind role ${role.roleId}`}
              />
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => onToggleExpandedRole(role.roleId)}
                aria-expanded={isExpanded}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--rm-fg)]">
                  {role.roleId}
                </span>
                <span className="shrink-0 text-[12px] text-[var(--rm-muted)]">
                  {role.tasks.length} task{role.tasks.length === 1 ? "" : "s"}
                </span>
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-[var(--rm-muted)]"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    d={isExpanded ? roleTreeChevronPath.expanded : roleTreeChevronPath.collapsed}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
            {isExpanded ? (
              <div className="space-y-1 border-l border-[var(--rm-border)] pb-2 pl-5 ml-2">
                {role.tasks.length === 0 ? (
                  <p className="px-1 py-1 text-[12px] text-[var(--rm-secondary)]">
                    No tasks under this role.
                  </p>
                ) : (
                  role.tasks.map((task) => (
                    <label
                      key={task.taskType}
                      className="flex items-center gap-2 px-1 py-1.5 text-[13px] text-[var(--rm-fg)]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded-[var(--rm-radius-sm)] border-[var(--rm-border-strong)] accent-[var(--rm-accent)]"
                        checked={isChecked}
                        disabled={!isChecked}
                        readOnly
                        aria-label={`Task ${task.taskType}`}
                      />
                      <span className="truncate font-mono text-[12px]">{task.taskType}</span>
                    </label>
                  ))
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
