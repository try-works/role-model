import { useCallback, type MouseEvent } from "react";
import { Link } from "react-router";

import {
  bodyStrongTextClassName,
  bodyTextClassName,
  inlineLinkClassName,
  modalEyebrowClassName,
  mutedPanelClassName,
  navLabelClassName,
} from "../lib/design-system";
import type {
  BenchmarkCapability,
  RuntimeRolePolicy,
  RuntimeRolePolicyRole,
} from "../lib/runtime-api";
import { StatusPill } from "./page-primitives";

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

export function getLocalModelRolePickerGroupState({
  roleIds,
  selectedRoleIds,
}: {
  readonly roleIds: readonly string[];
  readonly selectedRoleIds: readonly string[];
}) {
  const selectedRoleSet = new Set(selectedRoleIds);
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

export function getNextRoleSelectionForGroup({
  allRoleIds,
  groupRoleIds,
  selectedRoleIds,
  defaultAllRoles,
}: {
  readonly allRoleIds: readonly string[];
  readonly groupRoleIds: readonly string[];
  readonly selectedRoleIds: readonly string[];
  readonly defaultAllRoles: boolean;
}) {
  const pickerState = getLocalModelRolePickerState({
    roleIds: allRoleIds,
    selectedRoleIds,
    defaultAllRoles,
  });
  const next = new Set(pickerState.selectedRoleIds);
  const everyRoleSelected = groupRoleIds.every((roleId) => next.has(roleId));
  if (everyRoleSelected) {
    groupRoleIds.forEach((roleId) => next.delete(roleId));
  } else {
    groupRoleIds.forEach((roleId) => next.add(roleId));
  }
  return allRoleIds.filter((roleId) => next.has(roleId));
}

function MixedStateCheckbox({
  checked,
  disabled,
  mixed = false,
  ariaLabel,
  onChange,
  onClick,
}: {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly mixed?: boolean;
  readonly ariaLabel?: string;
  readonly onChange?: () => void;
  readonly onClick?: (event: MouseEvent<HTMLInputElement>) => void;
}) {
  const setMixedRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) {
        node.indeterminate = mixed;
      }
    },
    [mixed],
  );

  return (
    <input
      ref={setMixedRef}
      type="checkbox"
      className="mt-0"
      checked={checked}
      aria-checked={mixed ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={onChange}
      onClick={onClick}
    />
  );
}

export function LocalModelRolePicker({
  rolePolicy,
  selectedRoleIds,
  onChange,
  disabled = false,
  defaultAllRoles = true,
  expandSelectedGroupsByDefault = true,
  benchmarkCapability = null,
}: {
  rolePolicy: RuntimeRolePolicy | null;
  selectedRoleIds: readonly string[];
  onChange: (roleIds: readonly string[]) => void;
  disabled?: boolean;
  defaultAllRoles?: boolean;
  expandSelectedGroupsByDefault?: boolean;
  benchmarkCapability?: BenchmarkCapability | null;
}) {
  const roles = rolePolicy?.roleDefinitions ?? [];
  const allRoleIds = roles.map((role) => role.role_id);
  const explicitlySelectedRoleIds = new Set(selectedRoleIds);
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
  const formatRoleCount = (count: number): string => `${count} role${count === 1 ? "" : "s"}`;
  const commitSelection = (next: Set<string>) => {
    onChange([...next].sort((left, right) => left.localeCompare(right, "en")));
  };

  const toggleRole = (roleId: string) => {
    const next = new Set(selected);
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    commitSelection(next);
  };

  const toggleRoleGroup = (groupRoleIds: readonly string[]) => {
    commitSelection(
      new Set(
        getNextRoleSelectionForGroup({
          allRoleIds,
          groupRoleIds,
          selectedRoleIds,
          defaultAllRoles,
        }),
      ),
    );
  };

  const toggleAllRoles = () => {
    onChange(allSelected ? [] : allRoleIds);
  };

  return (
    <div className={`${mutedPanelClassName} space-y-3 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={modalEyebrowClassName}>Runtime roles</p>
        <Link to="/app/models/roles" className={inlineLinkClassName}>
          Manage role definitions
        </Link>
      </div>
      <p className={bodyTextClassName}>Roles control which routing tasks can select this model.</p>
      {roles.length === 0 ? (
        <p className={bodyTextClassName}>No runtime roles are defined yet.</p>
      ) : (
        <div className="space-y-4">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-3 py-2 ${bodyTextClassName} text-[var(--rm-fg)]`}
          >
            <MixedStateCheckbox
              checked={allSelected}
              mixed={pickerState.partiallySelected}
              disabled={disabled}
              onChange={toggleAllRoles}
            />
            <span className={bodyStrongTextClassName}>All roles</span>
          </label>
          {[...groupedRoles.entries()].map(([groupId, groupRoles]) => (
            (() => {
              const groupRoleIds = groupRoles.map((role) => role.role_id);
              const groupState = getLocalModelRolePickerGroupState({
                roleIds: groupRoleIds,
                selectedRoleIds: pickerState.selectedRoleIds,
              });
              const selectedCount = groupState.selectedRoleIds.length;
              const explicitSelectionCount = groupRoles.filter((role) =>
                explicitlySelectedRoleIds.has(role.role_id),
              ).length;
              const defaultOpen = expandSelectedGroupsByDefault && explicitSelectionCount > 0;
              const label = groupLabel(groupId);

              return (
                <details
                  key={groupId}
                  open={defaultOpen}
                  className="overflow-hidden rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                >
                  <summary className="group flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <input
                        readOnly
                        type="checkbox"
                        className="mt-0 shrink-0"
                        checked={groupState.allSelected}
                        ref={(node) => {
                          if (node) {
                            node.indeterminate = groupState.partiallySelected;
                          }
                        }}
                        aria-checked={groupState.partiallySelected ? "mixed" : groupState.allSelected}
                        aria-label={`Select ${label} roles`}
                        disabled={disabled}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleRoleGroup(groupRoleIds);
                        }}
                      />
                      <span className="min-w-0 space-y-0.5">
                        <span className={modalEyebrowClassName}>{label}</span>
                        <span className={`block ${navLabelClassName} text-[var(--rm-secondary)]`}>
                          {selectedCount > 0
                            ? `${selectedCount} selected · ${formatRoleCount(groupRoles.length)}`
                            : formatRoleCount(groupRoles.length)}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2.5 py-1 ${navLabelClassName} text-[var(--rm-secondary)] transition-colors group-hover:text-[var(--rm-accent)]`}
                    >
                      <span className="group-open:hidden">Expand</span>
                      <span className="hidden group-open:inline">Collapse</span>
                    </span>
                  </summary>
                  <ul className="space-y-2 border-t border-[var(--rm-border)] px-3 py-2.5">
                    {groupRoles.map((role) => (
                      <li key={role.role_id}>
                        <label
                          className={`flex cursor-pointer items-start gap-2.5 ${bodyTextClassName} text-[var(--rm-fg)]`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selected.has(role.role_id)}
                            disabled={disabled}
                            onChange={() => toggleRole(role.role_id)}
                          />
                          <span>
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={bodyStrongTextClassName}>{role.name}</span>
                              {isHighRiskRole(role) ? (
                                <StatusPill
                                  className={modalEyebrowClassName}
                                  tone="warning"
                                >
                                  High risk
                                </StatusPill>
                              ) : null}
                              {typeof benchmarkCapability?.eligibleRoleScores?.[role.role_id] ===
                              "number" ? (
                                <StatusPill
                                  className={modalEyebrowClassName}
                                  tone="accent"
                                >
                                  Benchmarked{" "}
                                  {formatBenchmarkPercent(
                                    benchmarkCapability.eligibleRoleScores[role.role_id] ?? 0,
                                  )}
                                </StatusPill>
                              ) : typeof benchmarkCapability?.roleScores?.[role.role_id] ===
                                "number" ? (
                                <StatusPill
                                  className={modalEyebrowClassName}
                                  tone="neutral"
                                >
                                  Unassigned evidence{" "}
                                  {formatBenchmarkPercent(
                                    benchmarkCapability.roleScores[role.role_id] ?? 0,
                                  )}
                                </StatusPill>
                              ) : null}
                              {lowCoverageRoleIds.has(role.role_id) ? (
                                <StatusPill className={modalEyebrowClassName} tone="warning">
                                  Low coverage
                                </StatusPill>
                              ) : null}
                            </span>
                            {role.secondaryGroupIds && role.secondaryGroupIds.length > 0 ? (
                              <span className={`mt-1 block ${navLabelClassName} text-[var(--rm-muted)]`}>
                                Secondary: {role.secondaryGroupIds.map(groupLabel).join(", ")}
                              </span>
                            ) : null}
                            {role.description ? (
                              <span className={`mt-1 block ${bodyTextClassName} text-[var(--rm-secondary)]`}>
                                {role.description}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
}
