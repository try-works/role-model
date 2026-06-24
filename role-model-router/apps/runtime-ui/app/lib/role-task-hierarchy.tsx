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
  const groupedHierarchy = hierarchy.reduce(
    (groups, role) => {
      const existing = groups.get(role.primaryGroupId) ?? [];
      existing.push(role);
      groups.set(role.primaryGroupId, existing);
      return groups;
    },
    new Map<string, RoleTaskHierarchyItem[]>(),
  );

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
                        {isHighRiskRole(role) ? <StatusPill tone="warning">High risk</StatusPill> : null}
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
