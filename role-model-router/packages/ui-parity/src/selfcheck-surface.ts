/**
 * R14: the deterministic selfcheck surface shared contract.
 *
 * Both clients render the same ordered semantic specimen at /selfcheck and publish its checksum in
 * data-selfcheck-marker. The marker is a checksum over this specimen, so changing a rendered value
 * changes the marker; a client that renders a different specimen cannot claim 0diff.
 */
export const SELFCHECK_ROUTE = "/selfcheck";
export const SELFCHECK_MARKER_ATTRIBUTE = "data-selfcheck-marker";
export const SELFCHECK_ENTRY_ATTRIBUTE = "data-selfcheck-key";
export const SELFCHECK_VALUE_ATTRIBUTE = "data-selfcheck-value";
export const SELFCHECK_TARGETS = ["react", "foldkit"] as const;
export type SelfcheckTarget = (typeof SELFCHECK_TARGETS)[number];

export interface SelfcheckEntry {
  readonly key: string;
  readonly value: string;
}

export interface SelfcheckCapture {
  readonly targetId: string;
  readonly marker: string | undefined;
  readonly entries: readonly SelfcheckEntry[];
}

/** Ordered semantic specimen; the visible labels are part of the parity contract. */
export const SELFCHECK_ENTRIES: readonly SelfcheckEntry[] = [
  { key: "heading", value: "RM3 selfcheck surface" },
  { key: "button", value: "Save changes" },
  { key: "badge", value: "READY" },
  { key: "input", value: "Operator token" },
  { key: "chart", value: "requests / hour" },
  { key: "table", value: "4 rows" },
];

const fnv1a32 = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

/** Canonical form is sorted by key so DOM order alone cannot mask a different specimen. */
export const canonicalSelfcheckEntries = (entries: readonly SelfcheckEntry[]): string =>
  [...entries]
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    .map((entry) => `${entry.key}\u0000${entry.value}`)
    .join("\u0001");

export const selfcheckMarker = (
  entries: readonly SelfcheckEntry[] = SELFCHECK_ENTRIES,
): string => fnv1a32(canonicalSelfcheckEntries(entries));

const sameEntries = (left: readonly SelfcheckEntry[], right: readonly SelfcheckEntry[]): boolean =>
  left.length === right.length &&
  left.every(
    (entry, index) =>
      entry.key === right[index]?.key && entry.value === right[index]?.value,
  );

const captureFor = (runs: readonly (readonly SelfcheckCapture[])[], targetId: string, run: number) =>
  runs[run]?.find((capture) => capture.targetId === targetId);

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

/**
 * 0DIFF requires: both targets captured in both runs, the same checksum from both clients, the same
 * ordered specimen, and identical captures across the two runs. Anything else is reported, never
 * rounded to a pass.
 */
export const evaluateSelfcheckSurfaceRuns = ({
  chromeAvailable,
  runs,
}: {
  readonly chromeAvailable: boolean;
  readonly runs: readonly (readonly SelfcheckCapture[])[];
}): SelfcheckSurfaceResult => {
  const base = { scope: "selfcheck-surface" as const, route: SELFCHECK_ROUTE };
  if (!chromeAvailable)
    return { ...base, reason: "no-browser-available", status: "NOT_RUN", verdict: "NOT_RUN" };
  if (runs.length === 0)
    return { ...base, reason: "no-capture", status: "NOT_RUN", verdict: "NOT_RUN" };
  if (runs.length !== 2)
    return {
      ...base,
      reason: `run-count: ${String(runs.length)}`,
      status: "FAILED",
      verdict: "DIVERGENCE",
    };
  for (const targetId of SELFCHECK_TARGETS) {
    for (let run = 0; run < 2; run += 1) {
      const capture = captureFor(runs, targetId, run);
      if (capture === undefined)
        return {
          ...base,
          reason: `capture-missing: ${targetId}[${String(run)}]`,
          status: "FAILED",
          verdict: "DIVERGENCE",
        };
      if (capture.marker === undefined || capture.marker.length === 0)
        return {
          ...base,
          reason: `marker-missing: ${targetId}[${String(run)}]`,
          status: "FAILED",
          verdict: "DIVERGENCE",
        };
    }
  }
  const react = captureFor(runs, "react", 0);
  const foldkit = captureFor(runs, "foldkit", 0);
  const markers = { react: react?.marker, foldkit: foldkit?.marker };
  if (react === undefined || foldkit === undefined)
    return { ...base, reason: "capture-missing", status: "FAILED", verdict: "DIVERGENCE" };
  if (react.marker !== foldkit.marker)
    return {
      ...base,
      comparisons: {
        deterministic: { equal: true },
        reactVsFoldkit: { equal: false, marker: react.marker },
      },
      markers,
      reason: `marker-mismatch: react=${String(react.marker)} foldkit=${String(foldkit.marker)}`,
      status: "FAILED",
      verdict: "DIVERGENCE",
    };
  if (!sameEntries(react.entries, foldkit.entries))
    return {
      ...base,
      comparisons: {
        deterministic: { equal: true },
        reactVsFoldkit: { equal: false, marker: react.marker },
      },
      markers,
      reason: "entry-mismatch: React and Foldkit rendered different specimens",
      status: "FAILED",
      verdict: "DIVERGENCE",
    };
  const deterministic = SELFCHECK_TARGETS.every((targetId) => {
    const first = captureFor(runs, targetId, 0);
    const second = captureFor(runs, targetId, 1);
    return (
      first !== undefined &&
      second !== undefined &&
      first.marker === second.marker &&
      sameEntries(first.entries, second.entries)
    );
  });
  if (!deterministic)
    return {
      ...base,
      comparisons: {
        deterministic: { equal: false },
        reactVsFoldkit: { equal: true, marker: react.marker },
      },
      markers,
      reason: "run-divergence: the two runs did not produce identical captures",
      status: "FAILED",
      verdict: "DIVERGENCE",
    };
  return {
    ...base,
    comparisons: {
      deterministic: { equal: true },
      reactVsFoldkit: { equal: true, marker: react.marker },
    },
    markers,
    status: "PASSED",
    verdict: "0DIFF",
  };
};
