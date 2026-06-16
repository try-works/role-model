import { Link } from "react-router";

import { mutedPanelClassName } from "../lib/design-system";
import type { RuntimeRolePolicy } from "../lib/runtime-api";

export function LocalModelRolePicker({
  rolePolicy,
  selectedRoleIds,
  onChange,
  disabled = false,
}: {
  rolePolicy: RuntimeRolePolicy | null;
  selectedRoleIds: readonly string[];
  onChange: (roleIds: readonly string[]) => void;
  disabled?: boolean;
}) {
  const roles = rolePolicy?.roleDefinitions ?? [];
  const selected = new Set(selectedRoleIds);

  const toggleRole = (roleId: string) => {
    const next = new Set(selected);
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    onChange([...next].sort((left, right) => left.localeCompare(right, "en")));
  };

  return (
    <div className={`${mutedPanelClassName} space-y-3 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
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
        <ul className="space-y-2">
          {roles.map((role) => (
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
                  <span className="font-medium">{role.name}</span>
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
      )}
    </div>
  );
}
