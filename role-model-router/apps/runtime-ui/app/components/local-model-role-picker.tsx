import { type MouseEvent, useEffect, useId, useState } from "react";
import { Link } from "react-router";

import {
  bodyStrongTextClassName,
  bodyTextClassName,
  modalEyebrowClassName,
  mutedPanelClassName,
  navLabelClassName,
} from "../lib/design-system";
import type {
  BenchmarkCapability,
  RuntimeRolePolicy,
  RuntimeRolePolicyRole,
} from "../lib/runtime-api";
import { CheckboxControl } from "./checkbox-control";
import { Badge } from "./page-primitives";

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
    for (const roleId of groupRoleIds) {
      next.delete(roleId);
    }
  } else {
    for (const roleId of groupRoleIds) {
      next.add(roleId);
    }
  }
  return allRoleIds.filter((roleId) => next.has(roleId));
}

/** Snapshot which groups start expanded from explicit selection (mount only). */
export function getInitiallyExpandedRoleGroups({
  roles,
  selectedRoleIds,
  expandSelectedGroupsByDefault,
}: {
  readonly roles: readonly RuntimeRolePolicyRole[];
  readonly selectedRoleIds: readonly string[];
  readonly expandSelectedGroupsByDefault: boolean;
}): Record<string, boolean> {
  if (!expandSelectedGroupsByDefault || selectedRoleIds.length === 0) {
    return {};
  }
  const selected = new Set(selectedRoleIds);
  const open: Record<string, boolean> = {};
  for (const role of roles) {
    if (!selected.has(role.role_id)) continue;
    const groupId = role.primaryGroupId ?? "ungrouped";
    open[groupId] = true;
  }
  return open;
}

function MixedStateCheckbox({
  id,
  checked,
  disabled,
  mixed = false,
  ariaLabel,
  onChange,
  onClick,
}: {
  readonly id?: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly mixed?: boolean;
  readonly ariaLabel?: string;
  readonly onChange?: () => void;
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <CheckboxControl
      id={id}
      checked={checked}
      mixed={mixed}
      disabled={disabled}
      aria-label={ariaLabel}
      className="mt-0"
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
  const [clearedDefaultAll, setClearedDefaultAll] = useState(false);
  const roles = rolePolicy?.roleDefinitions ?? [];
  const [openByGroupId, setOpenByGroupId] = useState<Record<string, boolean>>(() =>
    getInitiallyExpandedRoleGroups({
      roles,
      selectedRoleIds,
      expandSelectedGroupsByDefault,
    }),
  );
  const allRoleIds = roles.map((role) => role.role_id);
  // Empty + defaultAllRoles means "all" until the operator clears All roles once.
  const effectiveDefaultAllRoles = defaultAllRoles && !clearedDefaultAll;
  const pickerState = getLocalModelRolePickerState({
    roleIds: allRoleIds,
    selectedRoleIds,
    defaultAllRoles: effectiveDefaultAllRoles,
  });
  const selected = new Set(pickerState.selectedRoleIds);
  const allSelected = pickerState.allSelected;

  useEffect(() => {
    if (selectedRoleIds.length > 0) {
      setClearedDefaultAll(false);
    }
  }, [selectedRoleIds]);

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
  const allRolesId = useId();
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
          defaultAllRoles: effectiveDefaultAllRoles,
        }),
      ),
    );
  };

  const toggleAllRoles = () => {
    if (allSelected) {
      setClearedDefaultAll(true);
      onChange([]);
      return;
    }
    setClearedDefaultAll(false);
    onChange(allRoleIds);
  };

  return (
    <div className={`${mutedPanelClassName} space-y-3 rounded-[var(--rm-radius-field)] p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-xs uppercase leading-4 tracking-[0.04em] text-foreground">
          Runtime roles
        </p>
        <Link
          to="/app/models/roles"
          className="font-sans text-xs leading-4 text-foreground underline-offset-2"
          style={{ textDecoration: "underline" }}
        >
          Manage role definitions
        </Link>
      </div>
      <p className="font-sans text-xs font-normal leading-4 text-foreground">
        All roles are selected by default. Deselect any roles this model should not serve.
      </p>
      {roles.length === 0 ? (
        <p className={bodyTextClassName}>No runtime roles are defined yet.</p>
      ) : (
        <div className="space-y-4">
          <div
            className={`flex cursor-pointer items-center gap-3 rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] px-3 py-2 ${bodyTextClassName} text-[var(--rm-fg)]`}
          >
            <MixedStateCheckbox
              id={allRolesId}
              checked={allSelected}
              mixed={pickerState.partiallySelected}
              disabled={disabled}
              onChange={toggleAllRoles}
            />
            <label htmlFor={allRolesId} className={`${bodyStrongTextClassName} cursor-pointer`}>
              All roles
            </label>
          </div>
          {[...groupedRoles.entries()].map(([groupId, groupRoles]) =>
            (() => {
              const groupRoleIds = groupRoles.map((role) => role.role_id);
              const groupState = getLocalModelRolePickerGroupState({
                roleIds: groupRoleIds,
                selectedRoleIds: pickerState.selectedRoleIds,
              });
              const selectedCount = groupState.selectedRoleIds.length;
              const label = groupLabel(groupId);
              const isOpen = openByGroupId[groupId] === true;

              return (
                <details
                  key={groupId}
                  open={isOpen}
                  onToggle={(event) => {
                    const nextOpen = event.currentTarget.open;
                    setOpenByGroupId((current) => ({ ...current, [groupId]: nextOpen }));
                  }}
                  className="overflow-hidden rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                >
                  <summary className="group flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <CheckboxControl
                        checked={groupState.allSelected}
                        mixed={groupState.partiallySelected}
                        aria-label={`Select ${label} roles`}
                        disabled={disabled}
                        className="mt-0"
                        onPointerDown={(event) => {
                          // Some browsers toggle <details> on pointerdown before click.
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          // Keep summary from toggling expand/collapse on checkbox hit.
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
                          <CheckboxControl
                            checked={selected.has(role.role_id)}
                            disabled={disabled}
                            className="mt-1"
                            aria-label={role.name}
                            onChange={() => toggleRole(role.role_id)}
                          />
                          <span>
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={bodyStrongTextClassName}>{role.name}</span>
                              {isHighRiskRole(role) ? <Badge tone="error">High risk</Badge> : null}
                              {typeof benchmarkCapability?.eligibleRoleScores?.[role.role_id] ===
                              "number" ? (
                                <Badge className={modalEyebrowClassName} tone="accent">
                                  Benchmarked{" "}
                                  {formatBenchmarkPercent(
                                    benchmarkCapability.eligibleRoleScores[role.role_id] ?? 0,
                                  )}
                                </Badge>
                              ) : typeof benchmarkCapability?.roleScores?.[role.role_id] ===
                                "number" ? (
                                <Badge className={modalEyebrowClassName} tone="neutral">
                                  Unassigned evidence{" "}
                                  {formatBenchmarkPercent(
                                    benchmarkCapability.roleScores[role.role_id] ?? 0,
                                  )}
                                </Badge>
                              ) : null}
                              {lowCoverageRoleIds.has(role.role_id) ? (
                                <Badge className={modalEyebrowClassName} tone="warning">
                                  Low coverage
                                </Badge>
                              ) : null}
                            </span>
                            {role.secondaryGroupIds && role.secondaryGroupIds.length > 0 ? (
                              <span
                                className={`mt-1 block ${navLabelClassName} text-[var(--rm-muted)]`}
                              >
                                Secondary: {role.secondaryGroupIds.map(groupLabel).join(", ")}
                              </span>
                            ) : null}
                            {role.description ? (
                              <span
                                className={`mt-1 block ${bodyTextClassName} text-[var(--rm-secondary)]`}
                              >
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
            })(),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact role toggle pills for Local register/load rows (Paper Local specimens).
 * Selected roles render as pills; unselected stay behind an Add control so the
 * row never becomes a full role-chip wall. Full accordion `LocalModelRolePicker`
 * remains for Remote CardStack expanders.
 */
export function CompactRolePills({
  rolePolicy,
  selectedRoleIds,
  onChange,
  disabled = false,
  defaultAllRoles = true,
}: {
  rolePolicy: RuntimeRolePolicy | null;
  selectedRoleIds: readonly string[];
  onChange: (roleIds: readonly string[]) => void;
  disabled?: boolean;
  defaultAllRoles?: boolean;
}) {
  const [clearedDefaultAll, setClearedDefaultAll] = useState(false);
  const roles = rolePolicy?.roleDefinitions ?? [];
  const allRoleIds = roles.map((role) => role.role_id);
  const effectiveDefaultAllRoles = defaultAllRoles && !clearedDefaultAll;
  const pickerState = getLocalModelRolePickerState({
    roleIds: allRoleIds,
    selectedRoleIds,
    defaultAllRoles: effectiveDefaultAllRoles,
  });
  const selected = new Set(pickerState.selectedRoleIds);
  const selectedRoles = roles.filter((role) => selected.has(role.role_id));
  const unselectedRoles = roles.filter((role) => !selected.has(role.role_id));

  useEffect(() => {
    if (selectedRoleIds.length > 0) {
      setClearedDefaultAll(false);
    }
  }, [selectedRoleIds]);

  const toggleRole = (roleId: string) => {
    const next = new Set(selected);
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    onChange([...next].sort((left, right) => left.localeCompare(right, "en")));
  };

  if (roles.length === 0) {
    return <p className={bodyTextClassName}>No runtime roles are defined yet.</p>;
  }

  if (pickerState.allSelected) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          aria-pressed
          onClick={() => {
            setClearedDefaultAll(true);
            onChange([]);
          }}
          className="inline-flex h-7 items-center rounded-md border border-[var(--rm-border-strong)] bg-[var(--rm-panel)] px-2.5 font-mono text-[11px] leading-4 text-[var(--rm-fg)] transition"
        >
          All roles
        </button>
        <span className={`${navLabelClassName} text-[var(--rm-muted)]`}>
          {roles.length} selected · click to clear
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedRoles.map((role) => (
        <button
          key={role.role_id}
          type="button"
          disabled={disabled}
          aria-pressed
          onClick={() => toggleRole(role.role_id)}
          className="inline-flex h-7 items-center rounded-md border border-[var(--rm-border-strong)] bg-[var(--rm-panel)] px-2.5 font-mono text-[11px] leading-4 text-[var(--rm-fg)] transition"
        >
          {role.role_id}
        </button>
      ))}
      {unselectedRoles.length > 0 ? (
        <details className="relative">
          <summary
            className={[
              "inline-flex h-7 list-none cursor-pointer items-center rounded-md border border-dashed border-[var(--rm-border)] px-2.5 font-mono text-[11px] leading-4 text-[var(--rm-muted)] transition marker:content-none hover:text-[var(--rm-fg)]",
              disabled ? "pointer-events-none opacity-50" : "",
            ].join(" ")}
          >
            + Add role
          </summary>
          <div
            className={`${mutedPanelClassName} absolute left-0 z-20 mt-1 flex max-h-48 min-w-[12rem] flex-col gap-1 overflow-y-auto p-2`}
          >
            {unselectedRoles.map((role) => (
              <button
                key={role.role_id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setClearedDefaultAll(false);
                  toggleRole(role.role_id);
                }}
                className="rounded-sm px-2 py-1.5 text-left font-mono text-[11px] leading-4 text-[var(--rm-fg)] hover:bg-[var(--rm-panel)]"
              >
                {role.role_id}
              </button>
            ))}
          </div>
        </details>
      ) : null}
      {pickerState.noneSelected ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setClearedDefaultAll(false);
            onChange(allRoleIds);
          }}
          className="inline-flex h-7 items-center rounded-md border border-dashed border-[var(--rm-border)] px-2.5 font-mono text-[11px] leading-4 text-[var(--rm-muted)] transition hover:text-[var(--rm-fg)]"
        >
          Select all roles
        </button>
      ) : null}
    </div>
  );
}
