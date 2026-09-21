/**
 * Runtime extension activation boundaries (run 98 `R18`).
 *
 * One declaration per package decides the operator-selectable modes, the default mode and
 * the actions/capabilities the host refuses. List and mutate paths read this table so the
 * runtime surface cannot drift from the enforcement, and the runtime UI renders the same
 * record instead of branching on extension ids.
 *
 * `knowledge-worker` is evidence-only: it derives candidates and serves bounded evidence,
 * so its ceiling is `advisory` (its evidence feeds the policy-gated advisory path) and its
 * default stays `shadow` (`AC-R13-02`). `bounded`/`active` would assert direct routing or
 * prompt effects the worker does not have, and the production activation ceremony plus
 * prompt injection remain prohibited (`AC-R13-03`, `AC-R18-02`).
 */

export type ExtensionMode = "disabled" | "shadow" | "advisory" | "bounded" | "active";

export const EXTENSION_MODE_VALUES: readonly ExtensionMode[] = Object.freeze([
  "disabled",
  "shadow",
  "advisory",
  "bounded",
  "active",
]);

export type ExtensionActivationBoundary = {
  /** True when routing influence is governed by the versioned activation policy. */
  readonly policyGated: boolean;
  readonly defaultMode: ExtensionMode;
  readonly allowedModes: readonly ExtensionMode[];
  readonly prohibitedActions: readonly string[];
  readonly prohibitedCapabilities: readonly string[];
};

export const DEFAULT_EXTENSION_ACTIVATION_BOUNDARY: ExtensionActivationBoundary = Object.freeze({
  policyGated: false,
  defaultMode: "active",
  allowedModes: EXTENSION_MODE_VALUES,
  prohibitedActions: Object.freeze([]),
  prohibitedCapabilities: Object.freeze([]),
});

const BOUNDARIES: Readonly<Record<string, ExtensionActivationBoundary>> = Object.freeze({
  "knowledge-worker": Object.freeze({
    policyGated: true,
    defaultMode: "shadow",
    allowedModes: Object.freeze(["disabled", "shadow", "advisory"] as ExtensionMode[]),
    prohibitedActions: Object.freeze(["activate_production", "deactivate_production"]),
    prohibitedCapabilities: Object.freeze([
      "knowledge:prompt-inject",
      "knowledge:activate",
      "knowledge:deactivate",
    ]),
  }),
});

export function extensionActivationBoundaryFor(id: string): ExtensionActivationBoundary {
  return BOUNDARIES[id] ?? DEFAULT_EXTENSION_ACTIVATION_BOUNDARY;
}

export function isExtensionModeAllowed(id: string, mode: ExtensionMode): boolean {
  return extensionActivationBoundaryFor(id).allowedModes.includes(mode);
}

export function isExtensionActionProhibited(id: string, action: string): boolean {
  return extensionActivationBoundaryFor(id).prohibitedActions.includes(action);
}

export function extensionModeCeilingError(id: string, mode: string): string {
  const boundary = extensionActivationBoundaryFor(id);
  return (
    `${id} mode ${mode} is not permitted: the declared boundary ceiling is ` +
    `${boundary.allowedModes.at(-1)} (allowed: ${boundary.allowedModes.join(", ")})`
  );
}
