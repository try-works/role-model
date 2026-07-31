import { Badge } from "@role-model/ui";

import { CheckboxControl } from "../components/checkbox-control";
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

  return (
    <div className="flex flex-col">
      {hierarchy.map((role, index) => {
        const selected = selectedRoleId === role.roleId;
        const isExpanded = expandedRoleId === role.roleId;
        const toolLabel =
          role.toolPolicyMode === "allowed"
            ? "tools allowed"
            : role.toolPolicyMode === "limited"
              ? "tools limited"
              : `tools ${role.toolPolicyMode}`;
        const isLast = index === hierarchy.length - 1;

        return (
          <div
            key={role.roleId}
            className={`${selected ? "border-l-[3px] border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]" : "border-l-[3px] border-l-transparent"} ${isLast ? "" : "border-b border-[var(--rm-border)]"}`}
          >
            <div className="flex items-center gap-3 px-3.5 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => onSelectRole(role.roleId)}
              >
                <div className="flex w-40 shrink-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                      {role.label}
                    </span>
                    {isHighRiskRole(role) ? <Badge tone="error">High risk</Badge> : null}
                  </div>
                  <span className="font-mono text-[11px] leading-[14px] text-[var(--rm-muted)]">
                    {groupLabel(role.primaryGroupId).toLowerCase()} · {toolLabel}
                  </span>
                </div>
                <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] text-[var(--rm-muted)]">
                  {role.description}
                </span>
                <span className="w-[72px] shrink-0 text-right text-[12px] font-normal leading-4 text-[var(--rm-muted)]">
                  {role.tasks.length} task{role.tasks.length === 1 ? "" : "s"}
                </span>
              </button>
              <button
                type="button"
                className="inline-flex h-7 shrink-0 items-center rounded-[6px] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2.5 text-[12px] font-semibold leading-4 text-[var(--rm-fg)]"
                onClick={() => onToggleTaskDetail(role.roleId)}
              >
                {isExpanded ? "Hide task detail" : "Task detail"}
              </button>
            </div>
            {isExpanded ? (
              <div className="space-y-2 border-t border-[var(--rm-border)] px-3.5 py-3">
                {role.tasks.length === 0 ? (
                  <p className="text-sm text-[var(--rm-secondary)]">
                    No tasks are currently assigned.
                  </p>
                ) : (
                  role.tasks.map((task) => (
                    <div key={task.taskType} className="space-y-1">
                      <p className="font-mono text-[12px] font-semibold text-[var(--rm-fg)]">
                        {task.taskType}
                      </p>
                      <p className="text-sm text-[var(--rm-secondary)]">{task.description}</p>
                    </div>
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
    <div className="space-y-1.5">
      {hierarchy.map((role) => {
        const isChecked = selected.has(role.roleId);
        const isExpanded = expandedRoleId === role.roleId;
        return (
          <div
            key={role.roleId}
            className={`overflow-hidden rounded-lg ${
              isExpanded ? "bg-[var(--rm-surface-strong)]" : ""
            }`}
          >
            <div className="flex min-h-8 items-center gap-2.5 px-2.5 py-2">
              <CheckboxControl
                checked={isChecked}
                aria-label={`Bind role ${role.roleId}`}
                onChange={() => onToggleRole(role.roleId, !isChecked)}
              />
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                onClick={() => onToggleExpandedRole(role.roleId)}
                aria-expanded={isExpanded}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                  {role.roleId}
                </span>
                <span className="shrink-0 text-[11px] leading-[14px] text-[var(--rm-muted)]">
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
              <div className="space-y-0.5 px-2.5 pb-2">
                {role.tasks.length === 0 ? (
                  <p className="px-1 py-1 pl-6 text-[12px] text-[var(--rm-secondary)]">
                    No tasks under this role.
                  </p>
                ) : (
                  role.tasks.map((task) => (
                    <label
                      key={task.taskType}
                      className={`flex min-h-7 items-center gap-2.5 py-1.5 pl-6 text-[12px] leading-4 ${
                        isChecked ? "text-[var(--rm-fg)]" : "text-[var(--rm-muted)]"
                      }`}
                    >
                      <CheckboxControl
                        checked={isChecked}
                        disabled={!isChecked}
                        aria-label={`Task ${task.taskType}`}
                      />
                      <span className="truncate">{task.taskType}</span>
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
