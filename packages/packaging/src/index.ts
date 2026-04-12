export interface StableConfigArtifact {
  readonly artifactId: string;
  readonly generatedAtMs: number;
  readonly endpoints: ReadonlyArray<{
    readonly endpointId: string;
    readonly endpointKind: string;
    readonly providerKind: string;
    readonly modelId: string;
    readonly servingSource: string;
    readonly modalities: readonly string[];
    readonly strategyTags: readonly string[];
  }>;
}

export function createStableConfigArtifact(input: StableConfigArtifact): StableConfigArtifact {
  return input;
}
