import { describe, expect, test } from "vitest";

import {
  EFFORT_EVIDENCE_LABELS,
  EFFORT_RESOLUTION_LABELS,
  classifyEffortEvidence,
  formatEffectiveEffortDisclosure,
  formatEffortArmTruthDisclosure,
  formatEffortEvidenceLabel,
  formatEffortResolutionLabel,
  isProminentEffortResolution,
  readEffortResolutionKind,
} from "./effort-truth";

describe("run 106 R11 effort evidence exactness", () => {
  test("classifies borrowed cross-effort evidence before exact or prior", () => {
    expect(
      classifyEffortEvidence({
        evidenceSource: "profile-derived",
        relatedEffortOverallScore: 0.82,
      }),
    ).toBe("borrowed");
    expect(
      classifyEffortEvidence({
        evidenceSource: "run-artifact",
        relatedEffortOverallScore: 0.61,
      }),
    ).toBe("borrowed");
  });

  test("classifies a real run artifact as exact benchmark evidence", () => {
    expect(classifyEffortEvidence({ evidenceSource: "run-artifact" })).toBe("exact");
  });

  test("classifies a derived profile as prior evidence, never exact", () => {
    expect(classifyEffortEvidence({ evidenceSource: "profile-derived" })).toBe("prior");
  });

  test("classifies absent or unknown evidence sources as none", () => {
    expect(classifyEffortEvidence({})).toBe("none");
    expect(classifyEffortEvidence({ evidenceSource: "unknown-label" })).toBe("none");
    expect(classifyEffortEvidence({ evidenceSource: null })).toBe("none");
    expect(classifyEffortEvidence({ evidenceSource: undefined })).toBe("none");
  });

  test("labels every evidence kind so borrowed evidence never reads as exact", () => {
    expect(formatEffortEvidenceLabel("exact")).toBe("Exact (run artifact)");
    expect(formatEffortEvidenceLabel("borrowed")).toBe("Borrowed (sibling effort)");
    expect(formatEffortEvidenceLabel("prior")).toBe("Prior (profile-derived)");
    expect(formatEffortEvidenceLabel("none")).toBe("No benchmark evidence");
    expect(EFFORT_EVIDENCE_LABELS.borrowed).not.toContain("Exact");
  });
});

describe("run 106 R11 effective reasoning-effort disclosure", () => {
  test("discloses a fixed named effort without hiding the source", () => {
    expect(
      formatEffectiveEffortDisclosure({ reasoningEffort: "high", effortSource: "fixed" }),
    ).toBe("High (fixed)");
    expect(
      formatEffectiveEffortDisclosure({ reasoningEffort: "xhigh", effortSource: "fixed" }),
    ).toBe("XHigh (fixed)");
  });

  test("discloses a coerced effort explicitly", () => {
    expect(
      formatEffectiveEffortDisclosure({ reasoningEffort: "high", effortSource: "variant_coerced" }),
    ).toBe("High (coerced)");
    expect(
      formatEffectiveEffortDisclosure({ reasoningEffort: "medium", effortSource: "variant" }),
    ).toBe("Medium (coerced)");
  });

  test("distinguishes provider-default from no effort and disabled reasoning", () => {
    expect(
      formatEffectiveEffortDisclosure({ reasoningEffort: null, effortSource: "provider-default" }),
    ).toBe("Provider default");
    expect(formatEffectiveEffortDisclosure({ reasoningEffort: null, effortSource: null })).toBe(
      "No reasoning effort",
    );
    expect(formatEffectiveEffortDisclosure({ reasoningEffort: "none", effortSource: null })).toBe(
      "Disabled reasoning",
    );
    expect(formatEffectiveEffortDisclosure({ reasoningEffort: "off", effortSource: null })).toBe(
      "Disabled reasoning",
    );
  });

  test("keeps a named effort visible when its source is unknown", () => {
    expect(formatEffectiveEffortDisclosure({ reasoningEffort: "turbo", effortSource: null })).toBe(
      "Turbo",
    );
  });
});

describe("run 106 R11 effort policy/resolution surfacing", () => {
  test("reads the resolution kind from the R3/R10 wire field spellings", () => {
    expect(readEffortResolutionKind({ effortResolution: "unsupported_fallback" })).toBe(
      "unsupported_fallback",
    );
    expect(readEffortResolutionKind({ effort_resolution: "exact_primary" })).toBe("exact_primary");
    expect(readEffortResolutionKind({ resolution: "exact_fallback_expanded" })).toBe(
      "exact_fallback_expanded",
    );
  });

  test("rejects unknown or absent resolution values instead of inventing one", () => {
    expect(readEffortResolutionKind({ resolution: "nearest_effort_map" })).toBe(null);
    expect(readEffortResolutionKind({})).toBe(null);
    expect(readEffortResolutionKind(null)).toBe(null);
    expect(readEffortResolutionKind("unsupported_fallback")).toBe(null);
  });

  test("labels the full closed resolution vocabulary", () => {
    expect(formatEffortResolutionLabel("router_managed")).toBe("Router-managed");
    expect(formatEffortResolutionLabel("exact_primary")).toBe("Exact effort (primary pool)");
    expect(formatEffortResolutionLabel("exact_fallback_expanded")).toBe(
      "Exact effort primary · fallback expanded",
    );
    expect(formatEffortResolutionLabel("unsupported_fallback")).toBe(
      "Unsupported effort · routed fallback",
    );
    expect(formatEffortResolutionLabel("strict_rejected")).toBe("Strict effort rejected");
    expect(formatEffortResolutionLabel("equivalent_mapped")).toBe("Equivalent effort mapped");
    expect(EFFORT_RESOLUTION_LABELS).toHaveProperty("unsupported_fallback");
  });

  test("marks unsupported fallback and fallback expansion as prominent", () => {
    expect(isProminentEffortResolution("unsupported_fallback")).toBe(true);
    expect(isProminentEffortResolution("exact_fallback_expanded")).toBe(true);
    expect(isProminentEffortResolution("exact_primary")).toBe(false);
    expect(isProminentEffortResolution("router_managed")).toBe(false);
    expect(isProminentEffortResolution("strict_rejected")).toBe(false);
    expect(isProminentEffortResolution("equivalent_mapped")).toBe(false);
  });
});

describe("run 106 R11 combined arm truth disclosure", () => {
  test("co-displays effective effort and evidence exactness in one operator line", () => {
    expect(
      formatEffortArmTruthDisclosure({
        reasoningEffort: "high",
        effortSource: "fixed",
        evidence: { evidenceSource: "run-artifact" },
      }),
    ).toBe("High (fixed) · Exact (run artifact)");
    expect(
      formatEffortArmTruthDisclosure({
        reasoningEffort: null,
        effortSource: "provider-default",
        evidence: { evidenceSource: "profile-derived", relatedEffortOverallScore: 0.78 },
      }),
    ).toBe("Provider default · Borrowed (sibling effort)");
  });

  test("never echoes a credential, prompt, or provider body", () => {
    const disclosure = formatEffortArmTruthDisclosure({
      reasoningEffort: "high",
      effortSource: "fixed",
      evidence: { evidenceSource: "run-artifact" },
    });
    expect(disclosure).not.toMatch(/sk-|Bearer|Authorization|api[_-]?key/i);
    expect(disclosure).not.toContain("system prompt");
    expect(disclosure).not.toContain("request body");
  });
});
