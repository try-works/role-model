export interface SelfcheckEntry {
  readonly key: string;
  readonly value: string;
}

export interface SelfcheckCapture {
  readonly targetId: string;
  readonly marker: string | undefined;
  readonly entries: readonly SelfcheckEntry[];
}

export interface SelfcheckSurfaceResult {
  readonly scope: "selfcheck-surface";
  readonly status: "PASSED" | "FAILED" | "NOT_RUN";
  readonly verdict: "0DIFF" | "DIVERGENCE" | "NOT_RUN";
  readonly route: string;
  readonly comparisons?: {
    readonly reactVsFoldkit: { readonly equal: boolean; readonly marker: string | undefined };
    readonly deterministic: { readonly equal: boolean };
  };
  readonly markers?: { readonly react: string | undefined; readonly foldkit: string | undefined };
  readonly reason?: string;
}

export declare const SELFCHECK_ROUTE: string;
export declare const SELFCHECK_TARGETS: readonly string[];
export declare const SELFCHECK_ENTRIES: readonly SelfcheckEntry[];
export declare const SELFCHECK_MARKER: string;
export declare const canonicalSelfcheckEntries: (entries: readonly SelfcheckEntry[]) => string;
export declare const selfcheckMarker: (entries?: readonly SelfcheckEntry[]) => string;
export declare const parseSelfcheckSurfaceDom: (html: string, targetId: string) => SelfcheckCapture;
export declare const evaluateSelfcheckSurfaceRuns: (input: {
  readonly chromeAvailable: boolean;
  readonly runs: readonly (readonly SelfcheckCapture[])[];
}) => SelfcheckSurfaceResult;
