export interface ConfiguredModelKey {
  readonly providerAccountId: string;
  readonly modelId: string;
}

export interface ConfiguredModelReferenceDescriptor {
  readonly kind: string;
  readonly owner: string;
  readonly path: string;
  readonly policy: "block" | "auto-prune";
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

export function findConfiguredModelBlockingReferences(input: {
  readonly target: ConfiguredModelKey;
  readonly configuredKeys: readonly ConfiguredModelKey[];
  readonly references: readonly ConfiguredModelReferenceDescriptor[];
  readonly targetEndpointIds?: ReadonlySet<string>;
}): ConfiguredModelReferenceDescriptor[] {
  const suppliedBySibling = input.configuredKeys.some(
    (entry) =>
      entry.modelId === input.target.modelId &&
      entry.providerAccountId !== input.target.providerAccountId,
  );
  return input.references.filter(
    (reference) =>
      reference.policy === "block" &&
      ((reference.providerAccountId === input.target.providerAccountId &&
        reference.modelId === input.target.modelId) ||
        (reference.providerAccountId === undefined &&
          !suppliedBySibling &&
          reference.modelId === input.target.modelId) ||
        (reference.endpointId !== undefined && input.targetEndpointIds?.has(reference.endpointId))),
  );
}
