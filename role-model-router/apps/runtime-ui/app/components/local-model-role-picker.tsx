import { Link } from "react-router";

import { mutedPanelClassName } from "../lib/design-system";
import type {
  BenchmarkCapability,
  RuntimeRolePolicy,
  RuntimeRolePolicyRole,
} from "../lib/runtime-api";

export function getLocalModelRolePickerState({
  roleIds,
  selectedRoleIds,
  defaultAllRoles,
}: {
  readonly roleIds: readonly string[];
  readonly selectedRoleIds: readonly string[];
  readonly defaultAllRoles: boolean;
}) {
  const selectedRoleSet = new Set(
    defaultAllRoles && selectedRoleIds.length === 0 ? roleIds : selectedRoleIds,
  );
  const nextSelectedRoleIds = roleIds.filter((roleId) => selectedRoleSet.has(roleId));
  const allSelected = roleIds.length > 0 && nextSelectedRoleIds.length === roleIds.length;
  const noneSelected = nextSelectedRoleIds.length === 0;
  return {
    selectedRoleIds: nextSelectedRoleIds,
    allSelected,
    noneSelected,
    partiallySelected: !allSelected && !noneSelected,
  };
}

export function LocalModelRolePicker({
  rolePolicy,
  selectedRoleIds,
  onChange,
  disabled = false,
  defaultAllRoles = true,
  benchmarkCapability = null,
}: {
  rolePolicy: RuntimeRolePolicy | null;
  selectedRoleIds: readonly string[];
  onChange: (roleIds: readonly string[]) => void;
  disabled?: boolean;
  defaultAllRoles?: boolean;
  benchmarkCapability?: BenchmarkCapability | null;
}) {
  const roles = rolePolicy?.roleDefinitions ?? [];
  const allRoleIds = roles.map((role) => role.role_id);
  const pickerState = getLocalModelRolePickerState({
    roleIds: allRoleIds,
    selectedRoleIds,
    defaultAllRoles,
  });
  const selected = new Set(pickerState.selectedRoleIds);
  const allSelected = pickerState.allSelected;

  const groupLabel = (groupId: string): string =>
    groupId
      .split(/[_-]+/)
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(" ");

  const isHighRiskRole = (role: RuntimeRolePolicyRole): boolean =>
    role.riskLevel === "high" ||
    ["security", "legal", "finance", "recruiter", "health"].includes(role.role_id);

  const groupedRoles = roles.reduce((groups, role) => {
    const groupId = role.primaryGroupId ?? "ungrouped";
    const existing = groups.get(groupId) ?? [];
    existing.push(role);
    groups.set(groupId, existing);
    return groups;
  }, new Map<string, RuntimeRolePolicyRole[]>());

  const formatBenchmarkPercent = (value: number): string => `${Math.round(value * 100)}%`;
  const lowCoverageRoleIds = new Set(benchmarkCapability?.coverage?.lowCoverageRoleIds ?? []);

  const toggleRole = (roleId: string) => {
    const next = new Set(selected);
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    onChange([...next].sort((left, right) => left.localeCompare(right, "en")));
  };

  const toggleAllRoles = () => {
    onChange(allSelected ? [] : allRoleIds);
  };

  return (
    <div className={`${mutedPanelClassName} space-y-3 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rm-muted)]">
          Runtime roles
        </p>
        <Link
          to="/app/models/roles"
          className="text-xs text-[var(--rm-accent)] underline-offset-2 hover:underline"
        >
          Manage role definitions
        </Link>
      </div>
      <p className="text-sm text-[var(--rm-secondary)]">
        Roles control which routing tasks can select this model.
      </p>
      {roles.length === 0 ? (
        <p className="text-sm text-[var(--rm-muted)]">No runtime roles are defined yet.</p>
      ) : (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-3 py-2 text-sm text-[var(--rm-fg)]">
            <input
              type="checkbox"
              className="mt-0"
              checked={allSelected}
              aria-checked={pickerState.partiallySelected ? "mixed" : allSelected}
              disabled={disabled}
              onChange={toggleAllRoles}
            />
            <span className="font-semibold">All roles</span>
          </label>
          {[...groupedRoles.entries()].map(([groupId, groupRoles]) => (
            <section key={groupId} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                {groupLabel(groupId)}
              </p>
              <ul className="space-y-2">
                {groupRoles.map((role) => (
                  <li key={role.role_id}>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--rm-fg)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(role.role_id)}
                        disabled={disabled}
                        onChange={() => toggleRole(role.role_id)}
                      />
                      <span>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{role.name}</span>
                          {isHighRiskRole(role) ? (
                            <span className="rounded-[var(--rm-radius-pill)] border border-[var(--rm-warning)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--rm-warning)]">
                              High risk
                            </span>
                          ) : null}
                          {typeof benchmarkCapability?.eligibleRoleScores?.[role.role_id] ===
                          "number" ? (
                            <span className="rounded-[var(--rm-radius-pill)] border border-[var(--rm-accent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--rm-accent)]">
                              Benchmarked{" "}
                              {formatBenchmarkPercent(
                                benchmarkCapability.eligibleRoleScores[role.role_id] ?? 0,
                              )}
                            </span>
                          ) : typeof benchmarkCapability?.roleScores?.[role.role_id] === "number" ? (
                            <span className="rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--rm-secondary)]">
                              Unassigned evidence{" "}
                              {formatBenchmarkPercent(
                                benchmarkCapability.roleScores[role.role_id] ?? 0,
                              )}
                            </span>
                          ) : null}
                          {lowCoverageRoleIds.has(role.role_id) ? (
                            <span className="rounded-[var(--rm-radius-pill)] border border-[var(--rm-warning)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--rm-warning)]">
                              Low coverage
                            </span>
                          ) : null}
                        </span>
                        {role.secondaryGroupIds && role.secondaryGroupIds.length > 0 ? (
                          <span className="mt-1 block text-xs text-[var(--rm-muted)]">
                            Secondary: {role.secondaryGroupIds.map(groupLabel).join(", ")}
                          </span>
                        ) : null}
                        {role.description ? (
                          <span className="mt-1 block text-[var(--rm-secondary)]">
                            {role.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
