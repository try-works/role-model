export interface CompactTaxonomy {
  readonly manifest: {
    readonly taxonomyVersion: string;
    readonly contentRevision: string;
    readonly classificationContractVersion: string;
    readonly entryCounts: {
      readonly groups: number;
      readonly roles: number;
      readonly taskTypes: number;
    };
    readonly entryFiles: Record<string, string>;
    readonly contentHashes: Record<string, string>;
    readonly runtimeContentHashes?: Record<string, string>;
    readonly roleTaskChunkFiles?: Record<string, string>;
    readonly roleTaskChunkHashes?: Record<string, string>;
  };
  readonly groups: readonly {
    readonly id: string;
    readonly label: string;
    readonly description?: string;
    readonly primaryRoleIds: readonly string[];
    readonly secondaryRoleIds: readonly string[];
  }[];
  readonly roleSummaries: readonly {
    readonly id: string;
    readonly label: string;
    readonly description?: string;
    readonly primaryGroupId: string;
    readonly secondaryGroupIds: readonly string[];
    readonly typicalTaskIds?: readonly string[];
    readonly classification?: {
      readonly summary: string;
      readonly positiveSignals: readonly string[];
      readonly negativeSignals: readonly string[];
    };
  }[];
  readonly roleTaskIndex: Record<
    string,
    readonly {
      readonly id: string;
      readonly label: string;
    }[]
  >;
  readonly roleTaskChunks: Record<
    string,
    readonly {
      readonly id: string;
      readonly label: string;
      readonly description?: string;
      readonly primaryRole: string;
      readonly compatibleRoles: readonly string[];
      readonly requiredCapabilities: readonly string[];
      readonly preferredCapabilities: readonly string[];
      readonly requiredModalities: readonly string[];
      readonly toolClasses: readonly string[];
      readonly classifier?: {
        readonly useWhen: string;
        readonly doNotUseWhen: string;
      };
      readonly variants: readonly string[];
    }[]
  >;
}

export type CompactRoleTask = CompactTaxonomy["roleTaskChunks"][string][number];
