/**
 * R14 single source of truth for the packaged selfcheck surface.
 *
 * Plain ESM so BOTH clients (through the generated/typed facade), the packaged lane and the
 * selfcheck runner import this exact module. Do not copy the specimen, checksum or evaluator.
 */
export const SELFCHECK_ROUTE = "/selfcheck";
export const SELFCHECK_TARGETS = ["react", "foldkit"];

/** Ordered semantic specimen; the visible labels are part of the parity contract. */
export const SELFCHECK_ENTRIES = [
  { key: "heading", value: "RM3 selfcheck surface" },
  { key: "button", value: "Save changes" },
  { key: "badge", value: "READY" },
  { key: "input", value: "Operator token" },
  { key: "chart", value: "requests / hour" },
  { key: "table", value: "4 rows" },
];

const fnv1a32 = (input) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

/** Canonical form is sorted by key so DOM order alone cannot mask a different specimen. */
export const canonicalSelfcheckEntries = (entries) =>
  [...entries]
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    .map((entry) => `${entry.key}\u0000${entry.value}`)
    .join("\u0001");

export const selfcheckMarker = (entries = SELFCHECK_ENTRIES) => fnv1a32(canonicalSelfcheckEntries(entries));

/** The marker the surface must publish; clients import this instead of re-hashing. */
export const SELFCHECK_MARKER = selfcheckMarker(SELFCHECK_ENTRIES);

const decodeEntities = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

/** Extracts the served marker and ordered specimen entries from a rendered /selfcheck document. */
export const parseSelfcheckSurfaceDom = (html, targetId) => {
  const text = String(html);
  const markerMatch = /data-selfcheck-marker="([^"]+)"/.exec(text);
  const entries = [];
  const tagPattern = /<[^>]*\bdata-selfcheck-key="([^"]+)"[^>]*>/g;
  for (const match of text.matchAll(tagPattern)) {
    const tag = match[0];
    const valueMatch = /data-selfcheck-value="([^"]+)"/.exec(tag);
    if (valueMatch === null) continue;
    entries.push({
      key: decodeEntities(match[1]),
      value: decodeEntities(valueMatch[1]),
    });
  }
  return {
    entries,
    marker: markerMatch === null ? undefined : decodeEntities(markerMatch[1]),
    targetId,
  };
};

const sameEntries = (left, right) =>
  left.length === right.length &&
  left.every((entry, index) => entry.key === right[index]?.key && entry.value === right[index]?.value);

const captureFor = (runs, targetId, run) => runs[run]?.find((capture) => capture.targetId === targetId);

/**
 * 0DIFF requires: both targets captured in both runs, the same checksum from both clients, the same
 * ordered specimen, and identical captures across the two runs. Anything else is reported, never
 * rounded to a pass.
 */
export const evaluateSelfcheckSurfaceRuns = ({ chromeAvailable, runs }) => {
  const base = { route: SELFCHECK_ROUTE, scope: "selfcheck-surface" };
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
  const markers = { foldkit: foldkit?.marker, react: react?.marker };
  if (react === undefined || foldkit === undefined)
    return { ...base, reason: "capture-missing", status: "FAILED", verdict: "DIVERGENCE" };
  if (react.marker !== foldkit.marker)
    return {
      ...base,
      markers,
      reason: `marker-mismatch: react=${String(react.marker)} foldkit=${String(foldkit.marker)}`,
      status: "FAILED",
      verdict: "DIVERGENCE",
    };
  if (!sameEntries(react.entries, foldkit.entries))
    return {
      ...base,
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
