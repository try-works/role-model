import { createHash } from "node:crypto";

export interface ConfiguredModelKey {
  readonly providerAccountId: string;
  readonly modelId: string;
}

export interface ConfiguredMembershipEntry {
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly endpointId: string;
  readonly reasoningEffort?: string | null;
}

export interface ConfiguredModelReferenceDescriptor {
  readonly kind: string;
  readonly owner: string;
  readonly path: string;
  readonly policy: "block" | "auto-prune" | "auto-reassign-or-clear";
  readonly providerAccountId?: string;
  readonly modelId?: string;
  readonly endpointId?: string;
}

export type ConfiguredModelReferenceInspector = (
  target: ConfiguredModelKey,
) => readonly ConfiguredModelReferenceDescriptor[];

export function inspectConfiguredModelReferences(
  target: ConfiguredModelKey,
  inspectors: readonly ConfiguredModelReferenceInspector[],
): ConfiguredModelReferenceDescriptor[] {
  return inspectors.flatMap((inspector) => inspector(target));
}

export function configuredModelKey(value: ConfiguredModelKey): string {
  return `${value.providerAccountId}\u0000${value.modelId}`;
}

/**
 * Canonical, order-stable membership revision for the configured model pool.
 * The unit of membership is the endpoint variant: two effort variants of the same
 * base model produce distinct tuples, so adding/removing a sibling variant changes
 * the revision (FD1/FD2).
 */
export function computeConfiguredMembershipRevision(
  entries: readonly ConfiguredMembershipEntry[],
): string {
  const canonical = entries
    .map((entry) => ({
      providerAccountId: entry.providerAccountId,
      modelId: entry.modelId,
      endpointId: entry.endpointId,
      reasoningEffort: entry.reasoningEffort ?? null,
    }))
    .sort((left, right) => {
      return (
        left.providerAccountId.localeCompare(right.providerAccountId, "en") ||
        left.modelId.localeCompare(right.modelId, "en") ||
        left.endpointId.localeCompare(right.endpointId, "en") ||
        String(left.reasoningEffort ?? "").localeCompare(String(right.reasoningEffort ?? ""), "en")
      );
    });
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function matchesConfiguredModelReferenceTarget(input: {
  readonly target: ConfiguredModelKey;
  readonly suppliedBySibling: boolean;
  readonly reference: ConfiguredModelReferenceDescriptor;
  readonly targetEndpointIds?: ReadonlySet<string>;
}): boolean {
  return (
    (input.reference.providerAccountId === input.target.providerAccountId &&
      input.reference.modelId === input.target.modelId) ||
    (input.reference.providerAccountId === undefined &&
      !input.suppliedBySibling &&
      input.reference.modelId === input.target.modelId) ||
    (input.reference.endpointId !== undefined &&
      input.targetEndpointIds?.has(input.reference.endpointId) === true)
  );
}

function computeSuppliedBySibling(
  configuredKeys: readonly ConfiguredModelKey[],
  target: ConfiguredModelKey,
): boolean {
  return configuredKeys.some(
    (entry) =>
      entry.modelId === target.modelId && entry.providerAccountId !== target.providerAccountId,
  );
}

export function findConfiguredModelBlockingReferences(input: {
  readonly target: ConfiguredModelKey;
  readonly configuredKeys: readonly ConfiguredModelKey[];
  readonly references: readonly ConfiguredModelReferenceDescriptor[];
  readonly targetEndpointIds?: ReadonlySet<string>;
}): ConfiguredModelReferenceDescriptor[] {
  const suppliedBySibling = computeSuppliedBySibling(input.configuredKeys, input.target);
  return input.references.filter(
    (reference) =>
      reference.policy === "block" &&
      matchesConfiguredModelReferenceTarget({
        target: input.target,
        suppliedBySibling,
        reference,
        targetEndpointIds: input.targetEndpointIds,
      }),
  );
}

export function findConfiguredModelReferencesByPolicy(input: {
  readonly target: ConfiguredModelKey;
  readonly configuredKeys: readonly ConfiguredModelKey[];
  readonly references: readonly ConfiguredModelReferenceDescriptor[];
  readonly policy: ConfiguredModelReferenceDescriptor["policy"];
  readonly targetEndpointIds?: ReadonlySet<string>;
}): ConfiguredModelReferenceDescriptor[] {
  const suppliedBySibling = computeSuppliedBySibling(input.configuredKeys, input.target);
  return input.references.filter(
    (reference) =>
      reference.policy === input.policy &&
      matchesConfiguredModelReferenceTarget({
        target: input.target,
        suppliedBySibling,
        reference,
        targetEndpointIds: input.targetEndpointIds,
      }),
  );
}
