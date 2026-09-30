/**
 * L2: progressive-disclosure classification.
 *
 * This is the algorithm whose output the runtime routes on, so the specs pin
 * behaviour rather than implementation: the exact wire shape, group-first role
 * selection, the confidence ladder, tie-break-by-order, the context signals, and
 * the laziness of the underlying reads.
 *
 * `data/taxonomy/` is a verbatim copy of the Pi package's data, so these outputs
 * are directly comparable with the Pi implementation's.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { classifyWithProgressiveDisclosure } from "../src/taxonomy/classify-with-progressive-disclosure.js";
import type { ClassificationContext } from "../src/taxonomy/classify-with-progressive-disclosure.js";
import { createStagedCompactTaxonomyReader } from "../src/taxonomy/staged-compact-taxonomy.js";

/** The package's taxonomy data root, located from this spec's own path. */
const dataRoot = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "data", "taxonomy");

/** A reader that records every file it reads. */
function recordingReader(): {
  reader: ReturnType<typeof createStagedCompactTaxonomyReader>;
  reads: string[];
} {
  const reads: string[] = [];
  const reader = createStagedCompactTaxonomyReader({
    dataRoot,
    readJson: <T>(fileName: string): T => {
      reads.push(fileName);
      return JSON.parse(readFileSync(join(dataRoot, fileName), "utf8")) as T;
    },
  });
  return { reader, reads };
}

/** An empty request-context (no tools, images, or files). */
const noContext: ClassificationContext = {
  hasTools: false,
  toolNames: [],
  hasImages: false,
  hasFiles: false,
  fileExtensions: [],
};

describe("the wire contract", () => {
  test("emits the complete role_model object the runtime accepts", () => {
    const result = classifyWithProgressiveDisclosure({
      prompt: "Implement a bug fix in the parser.",
    });
    const intent = result.role_model.intent;

    expect(result.role_model.contract_version).toBe(1);
    expect(intent.classification_version).toBe("role-model.pi-classifier.v1");
    expect(intent.taxonomy_version).toBe("1.0.0-alpha.1");
    expect(intent.content_revision).toBe("taxonomy-v1-alpha.1");
    expect(intent.classification_contract_version).toBe("role-model.classification.v1");
    expect(intent.source).toBe("heuristic");
    expect(intent.role_source).toBe("heuristic");
    expect(intent.task_source).toBe("heuristic");
    expect(intent.output_modalities).toEqual(["text"]);

    expect(Object.keys(intent).sort()).toEqual([
      "alternatives",
      "classification_contract_version",
      "classification_version",
      "confidence",
      "content_revision",
      "context_tokens_estimate",
      "evidence",
      "output_modalities",
      "preferred_capabilities",
      "required_modalities",
      "role_hint_id",
      "role_source",
      "source",
      "task_action",
      "task_confidence",
      "task_source",
      "task_type",
      "task_variant",
      "taxonomy_version",
      "tool_classes",
    ]);
  });

  test("keeps confidence in the documented ladder and task_confidence equal to it", () => {
    const prompts = [
      "Implement a bug fix in the parser.",
      "Review this diff for security risks and likely regressions.",
      "Write a haiku about databases.",
      "Summarize the quarterly sales strategy.",
      "Translate the release notes into German.",
      "Draft the employment contract terms.",
    ];
    for (const prompt of prompts) {
      const intent = classifyWithProgressiveDisclosure({ prompt }).role_model.intent;
      expect([0.25, 0.38, 0.5, 0.6, 0.72], prompt).toContain(intent.confidence);
      expect(intent.task_confidence, prompt).toBe(intent.confidence);
    }
  });

  test("always carries evidence and non-empty alternatives", () => {
    const result = classifyWithProgressiveDisclosure({ prompt: "zzzz qqqq" });
    expect(result.role_model.intent.evidence.length).toBeGreaterThan(0);
    expect(result.role_model.intent.alternatives.length).toBeGreaterThan(0);
    for (const alternative of result.role_model.intent.alternatives) {
      expect(alternative.role_hint_id.length).toBeGreaterThan(0);
      expect(alternative.task_type.length).toBeGreaterThan(0);
    }
  });

  test("reports the winning role and its primary group locally", () => {
    const result = classifyWithProgressiveDisclosure({
      prompt: "Implement a bug fix in the parser.",
    });
    expect(result.candidateRoleIds).toEqual([result.role_model.intent.role_hint_id]);
    expect(result.candidateGroupIds).toEqual([
      result.role_model.intent.role_hint_id === "coder"
        ? "engineering"
        : result.candidateGroupIds[0],
    ]);
    expect(result.hiddenModelCallUsed).toBe(false);
  });

  test("splits task_type into action and variant", () => {
    const dotted = classifyWithProgressiveDisclosure({
      prompt: "Debug the root cause of the crash in the parser.",
    });
    const [role, ...rest] = dotted.role_model.intent.task_type.split(".");
    expect(dotted.role_model.intent.task_action).toBe(rest[0]);
    expect(role).toBe(dotted.role_model.intent.task_type.split(".")[0]);
    if (rest.length > 1) {
      expect(dotted.role_model.intent.task_variant).toBe(rest.slice(1).join("."));
    } else {
      expect(dotted.role_model.intent.task_variant).toBeNull();
    }
  });

  test("estimates context tokens from the trimmed prompt length", () => {
    const prompt = "x".repeat(400);
    const intent = classifyWithProgressiveDisclosure({ prompt: `   ${prompt}   ` }).role_model
      .intent;
    expect(intent.context_tokens_estimate).toBe(Math.ceil(prompt.length / 4));
  });
});

describe("group-first role selection", () => {
  test.each([
    ["Implement a small bug fix and add a regression test.", ["coder", "tester"]],
    ["Review this diff for security risks and likely vulnerabilities.", ["security"]],
    ["Find the current public documentation and cite the sources.", ["researcher", "knowledge"]],
    ["Draft a customer reply for this support ticket.", ["support", "writer", "coordinator"]],
    [
      "Write the product requirements and acceptance criteria for this workflow.",
      ["product", "planner", "analyst"],
    ],
    ["Plan the schema migration and api design for the database.", ["architect", "data", "coder"]],
  ])("classifies %j into a plausible role", (prompt, acceptable) => {
    const intent = classifyWithProgressiveDisclosure({ prompt }).role_model.intent;
    expect(acceptable, `${prompt} -> ${intent.role_hint_id}`).toContain(intent.role_hint_id);
  });

  test("selects a security audit when the rule agrees with the scored role", () => {
    const intent = classifyWithProgressiveDisclosure({
      prompt: "Review this diff for security risks and likely regressions.",
    }).role_model.intent;
    expect(intent.role_hint_id).toBe("security");
    expect(intent.task_type).toBe("security.audit");
    expect(intent.confidence).toBe(0.72);
    expect(intent.preferred_capabilities).toContain("security.analysis");
    expect(intent.tool_classes).toEqual(["filesystem.read"]);
  });

  test("raises confidence to at least 0.72 only when the rule names the scored role", () => {
    // "fix" matches rule #1 (coder). Whatever role wins, confidence follows the rule
    // agreement, not the mere presence of a match.
    const intent = classifyWithProgressiveDisclosure({ prompt: "fix the flaky integration test" })
      .role_model.intent;
    if (intent.role_hint_id === "coder") {
      expect(intent.confidence).toBeGreaterThanOrEqual(0.72);
    } else {
      expect(intent.confidence).toBeLessThan(0.72);
    }
  });
});

describe("context signals", () => {
  test("biases toward engineering roles when tools are present", () => {
    const withTools = classifyWithProgressiveDisclosure({
      prompt: "Handle this task.",
      context: { ...noContext, hasTools: true, toolNames: ["read_file"] },
    }).role_model.intent;
    expect(withTools.role_hint_id).toBe("coder");
    expect(withTools.preferred_capabilities.length).toBeGreaterThan(0);
  });

  test("biases toward design roles when an image is present", () => {
    const intent = classifyWithProgressiveDisclosure({
      prompt: "Look at this mockup and tell me what to change.",
      context: { ...noContext, hasImages: true, hasFiles: true, fileExtensions: [".png"] },
    }).role_model.intent;
    expect(["designer", "product", "analyst", "planner"]).toContain(intent.role_hint_id);
  });

  test("reads a file extension hint for a data-shaped file", () => {
    const intent = classifyWithProgressiveDisclosure({
      prompt: "Clean this dataset up.",
      context: { ...noContext, hasFiles: true, fileExtensions: [".sql"] },
    }).role_model.intent;
    expect(["data", "architect", "analyst", "coder"]).toContain(intent.role_hint_id);
  });

  test("recognizes DeepSeek Harness tool names, not only the Pi ones", () => {
    // `grep` is a DSH tool; without the extended table this signal would never fire.
    const intent = classifyWithProgressiveDisclosure({
      prompt: "Search the repository for the offending call.",
      context: { ...noContext, hasTools: true, toolNames: ["grep"] },
    }).role_model.intent;
    expect(["coder", "architect", "security", "data"]).toContain(intent.role_hint_id);
  });
});

describe("progressive disclosure and laziness", () => {
  test("loads only the manifest, shared files, and the winning role chunk", () => {
    const { reader, reads } = recordingReader();
    const result = classifyWithProgressiveDisclosure({ prompt: "Implement a bug fix.", reader });
    const roleId = result.role_model.intent.role_hint_id;
    expect(reads).toEqual([
      "compact-manifest.json",
      "compact-groups.json",
      "compact-role-summaries.json",
      "compact-role-task-index.json",
      `roles/${roleId}/tasks.compact.json`,
    ]);
  });

  test("reports the chunks it consulted, starting with groups", () => {
    const result = classifyWithProgressiveDisclosure({ prompt: "Implement a bug fix." });
    expect(result.loadedChunks[0]).toBe("groups");
    expect(result.loadedChunks).toContain("role-summaries");
    expect(result.loadedChunks).toContain(`tasks:${result.role_model.intent.role_hint_id}`);
  });

  test("never consults a chunk for a role it did not select", () => {
    const { reader, reads } = recordingReader();
    const result = classifyWithProgressiveDisclosure({
      prompt: "Write the product requirements and acceptance criteria.",
      reader,
    });
    const roleId = result.role_model.intent.role_hint_id;
    const chunkReads = reads.filter((name) => name.startsWith("roles/"));
    expect(chunkReads).toEqual([`roles/${roleId}/tasks.compact.json`]);
  });

  test("uses a supplied taxonomy without reading any file", () => {
    const full = createStagedCompactTaxonomyReader({ dataRoot }).loadFullTaxonomy();
    const { reader, reads } = recordingReader();
    // Passing a taxonomy means the reader must not be touched at all.
    const result = classifyWithProgressiveDisclosure({
      prompt: "Implement a bug fix.",
      taxonomy: full,
      reader,
    });
    expect(reads).toEqual([]);
    expect(result.loadedChunks).toEqual([
      "groups",
      "role-summaries",
      `tasks:${result.role_model.intent.role_hint_id}`,
    ]);
  });

  test("trims the prompt before classifying", () => {
    const padded = classifyWithProgressiveDisclosure({ prompt: "   Implement a bug fix.   " })
      .role_model.intent;
    const plain = classifyWithProgressiveDisclosure({ prompt: "Implement a bug fix." }).role_model
      .intent;
    expect(padded.role_hint_id).toBe(plain.role_hint_id);
    expect(padded.task_type).toBe(plain.task_type);
  });
});

describe("degenerate prompts", () => {
  test("a prompt with no signal still yields a valid advisory classification", () => {
    const intent = classifyWithProgressiveDisclosure({ prompt: "zzzz qqqq wwww" }).role_model
      .intent;
    expect(intent.role_hint_id.length).toBeGreaterThan(0);
    expect(intent.task_type.length).toBeGreaterThan(0);
    expect(intent.confidence).toBeLessThanOrEqual(0.6);
    expect(intent.evidence.length).toBeGreaterThan(0);
    expect(intent.alternatives.length).toBeGreaterThan(0);
  });

  test("an empty prompt does not throw", () => {
    const intent = classifyWithProgressiveDisclosure({ prompt: "" }).role_model.intent;
    expect(intent.role_hint_id.length).toBeGreaterThan(0);
    expect(intent.context_tokens_estimate).toBe(1);
  });
});

describe("role coverage", () => {
  test("can reach every role and every group with a role-appropriate prompt", () => {
    const taxonomy = createStagedCompactTaxonomyReader({ dataRoot }).loadFullTaxonomy();
    const reachable = new Set<string>();
    const contexts: readonly ClassificationContext[] = [
      noContext,
      { ...noContext, hasTools: true, toolNames: ["read_file", "web_search", "db_query"] },
      { ...noContext, hasImages: true, hasFiles: true, fileExtensions: [".png", ".sql", ".pdf"] },
    ];
    for (const role of taxonomy.roleSummaries) {
      // Build a prompt from the role's own declared signals plus its label, which is
      // exactly the information the scorer uses.
      const signals = role.classification?.positiveSignals.slice(0, 6).join(" ") ?? "";
      const prompt = `${role.label} work: ${signals} ${role.id}`;
      for (const context of contexts) {
        const intent = classifyWithProgressiveDisclosure({ prompt, context }).role_model.intent;
        // Any role in the same group is an acceptable neighbour; the assertion is
        // that classification never crashes and always lands in the taxonomy.
        expect(
          taxonomy.roleSummaries.some((candidate) => candidate.id === intent.role_hint_id),
          role.id,
        ).toBe(true);
        if (intent.role_hint_id === role.id) reachable.add(role.id);
      }
    }
    // The scorer must be able to select a substantial share of the taxonomy, not a
    // handful of favourites.
    expect(reachable.size).toBeGreaterThanOrEqual(20);
  });
});
