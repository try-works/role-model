import { describe, expect, test } from "vitest";

import {
  decodeAgentStrategySection,
  derivePostureAliasInventory,
  findAgentStrategyAlias,
  mergeAliasInventory,
  validateAgentStrategyBindings,
} from "../src/agent-strategy.js";
import {
  mergeUnifiedRuntimeConfigDocuments,
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
} from "../src/unified-runtime-config.js";

/**
 * Run 103 / SP5e - the config path: the structured `routing` block, the `agent_strategies` and
 * `workloads` blocks, and the posture-alias derivation that feeds the live alias inventory
 * (design document sections 4 and 6.2, requirements R1, R5, R6, R10).
 */
const customWeights = {
  quality: 0.35,
  latency: 0.1,
  throughput: 0.05,
  cost: 0.35,
  reliability: 0.1,
  preference: 0.05,
};

const run103ConfigText = [
  "version: 1.0",
  "execution_mode: remote_only",
  "routing:",
  "  mode: intelligent",
  "  scoring_strategy: custom",
  "  pin_weights: false",
  "  weights:",
  "    quality: 0.35",
  "    latency: 0.1",
  "    throughput: 0.05",
  "    cost: 0.35",
  "    reliability: 0.1",
  "    preference: 0.05",
  "agent_strategies:",
  "  coder:",
  "    role_id: coder",
  "    scoring_strategy: quality",
  "  researcher:",
  "    role_id: researcher",
  "workloads:",
  "  batch:",
  "    scoring_strategy: cost",
  "  embedding:",
  "    required_capabilities:",
  "      - embeddings.text",
  "",
].join("\n");

const baseSectionInput = {
  executionModes: ["remote_only"] as const,
  runtimeMode: "baseline" as const,
  modelIdsByExecutionMode: { remote_only: ["remote-b"] },
};

describe("agent strategy entry validation", () => {
  test("rejects an unknown key instead of ignoring it", () => {
    const section = decodeAgentStrategySection({
      ...baseSectionInput,
      agentStrategies: { coder: { role_id: "coder", temperature: 1 } },
    });
    expect(section.violations.join(" ")).toMatch(/unknown key "temperature"/);
    expect(section.aliases).toEqual([]);
  });

  test("rejects an unknown capability key on an agent strategy but allows it on a workload entry", () => {
    const section = decodeAgentStrategySection({
      ...baseSectionInput,
      agentStrategies: { coder: { role_id: "coder", required_capabilities: ["embeddings.text"] } },
    });
    expect(section.violations.join(" ")).toMatch(/unknown key "required_capabilities"/);
  });
});

describe("agent strategy binding validation", () => {
  const section = decodeAgentStrategySection({
    ...baseSectionInput,
    agentStrategies: { coder: { role_id: "coder" } },
    workloads: {
      batch: { required_capabilities: ["embeddings.text", "no.such.capability"] },
    },
  });

  test("an unknown role_id is a violation", () => {
    const validation = validateAgentStrategyBindings({
      entries: section.entries,
      knownRoleIds: ["researcher"],
    });
    expect(validation.violations.join(" ")).toMatch(/unknown role_id "coder"/);
  });

  test("an unknown capability is a warning, not a violation", () => {
    const validation = validateAgentStrategyBindings({
      entries: section.entries,
      knownRoleIds: ["coder"],
      knownCapabilities: ["embeddings.text"],
    });
    expect(validation.violations).toEqual([]);
    expect(validation.warnings.join(" ")).toMatch(/unknown capability "no.such.capability"/);
  });

  test("a known role and capability produce no findings", () => {
    const validation = validateAgentStrategyBindings({
      entries: section.entries,
      knownRoleIds: ["coder"],
    });
    expect(validation.violations).toEqual([]);
  });
});

describe("agent strategy alias lookup", () => {
  const section = decodeAgentStrategySection({
    ...baseSectionInput,
    agentStrategies: { coder: { role_id: "coder" } },
  });

  test("finds an entry by its materialised alias id", () => {
    expect(
      findAgentStrategyAlias({
        entries: section.entries,
        executionModes: ["remote_only"],
        aliasId: "coder.remote-only",
      })?.roleId,
    ).toBe("coder");
    expect(
      findAgentStrategyAlias({
        entries: section.entries,
        executionModes: ["remote_only"],
        aliasId: "coder.local-only",
      }),
    ).toBeNull();
  });
});

describe("posture alias derivation", () => {
  const section = decodeAgentStrategySection({
    ...baseSectionInput,
    agentStrategies: { coder: { role_id: "coder", scoring_strategy: "quality" } },
    workloads: { batch: { scoring_strategy: "cost" } },
  });

  test("appends posture rows to the canonical inventory and reports empty scopes", () => {
    const derivation = derivePostureAliasInventory({
      canonical: [{ aliasId: "baseline.remote-only", mode: "basic", modelIds: ["remote-b"] }],
      entries: section.entries,
      executionModes: ["remote_only", "local_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"], local_only: [] },
    });
    expect(derivation.rows.map((row) => row.aliasId)).toEqual([
      "baseline.remote-only",
      "coder.remote-only",
      "batch.remote-only",
    ]);
    expect(derivation.skipped).toEqual([
      { aliasId: "coder.local-only", reason: "ALIAS_POOL_EMPTY" },
      { aliasId: "batch.local-only", reason: "ALIAS_POOL_EMPTY" },
    ]);
    expect(derivation.violations).toEqual([]);
  });

  test("reports a posture alias that would shadow an existing alias", () => {
    const derivation = derivePostureAliasInventory({
      canonical: [{ aliasId: "coder.remote-only", mode: "basic", modelIds: ["remote-b"] }],
      entries: section.entries,
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"] },
    });
    expect(derivation.violations.join(" ")).toMatch(/collides/);
    // The canonical row stays authoritative; only the colliding posture row is skipped.
    expect(derivation.rows.map((row) => row.aliasId)).toEqual([
      "coder.remote-only",
      "batch.remote-only",
    ]);
  });

  test("a malformed entry never materialises", () => {
    const malformed = decodeAgentStrategySection({
      ...baseSectionInput,
      agentStrategies: { coder: { role_id: "coder", nope: true } },
    });
    const derivation = derivePostureAliasInventory({
      canonical: [],
      entries: malformed.entries,
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"] },
    });
    expect(derivation.rows).toEqual([]);
    expect(derivation.violations.join(" ")).toMatch(/unknown key "nope"/);
  });
});

describe("unified runtime config routing and posture blocks", () => {
  test("decodes the structured routing block into a posture", () => {
    const config = parseUnifiedRuntimeConfigText(run103ConfigText);
    expect(config.routingPosture?.mode).toBe("intelligent");
    expect(config.routingPosture?.scoringStrategy).toBe("custom");
    expect(config.routingPosture?.pinWeights).toBe(false);
    expect(config.routingPosture?.operator?.weights).toEqual(customWeights);
    expect(config.routingStrategy).toBe("controller");
  });

  test("decodes the posture blocks", () => {
    const config = parseUnifiedRuntimeConfigText(run103ConfigText);
    expect(config.agentStrategies?.map((entry) => entry.name)).toEqual(["coder", "researcher"]);
    expect(config.agentStrategies?.[0]).toMatchObject({
      kind: "role",
      roleId: "coder",
      scoringStrategy: "quality",
      violations: [],
    });
    expect(config.workloads?.map((entry) => entry.name)).toEqual(["batch", "embedding"]);
    expect(config.workloads?.[1]?.requiredCapabilities).toEqual(["embeddings.text"]);
  });

  test("renders both blocks back and keeps the legacy key out of the file", () => {
    const config = parseUnifiedRuntimeConfigText(run103ConfigText);
    const rendered = renderUnifiedRuntimeConfigText(config);
    expect(rendered).toContain("agent_strategies:");
    expect(rendered).toContain("role_id: coder");
    expect(rendered).toContain("required_capabilities:");
    expect(rendered).toContain("scoring_strategy: custom");
    expect(rendered).not.toContain("strategy: controller");

    const reparsed = parseUnifiedRuntimeConfigText(rendered);
    expect(reparsed.agentStrategies).toEqual(config.agentStrategies);
    expect(reparsed.workloads).toEqual(config.workloads);
    expect(reparsed.routingPosture).toEqual(config.routingPosture);
  });

  test("reads a legacy strategy string and migrates it on the next write", () => {
    const config = parseUnifiedRuntimeConfigText(
      "version: 1.0\nrouting:\n  strategy: latency-first\n",
    );
    expect(config.routingPosture).toBeUndefined();
    expect(config.routingStrategy).toBe("latency-first");
    const rendered = renderUnifiedRuntimeConfigText(config);
    expect(rendered).not.toContain("latency-first");
    expect(rendered).toContain("scoring_strategy: latency");
    const reparsed = parseUnifiedRuntimeConfigText(rendered);
    expect(reparsed.routingPosture).toMatchObject({
      mode: "baseline",
      scoringStrategy: "latency",
    });
  });

  test("degrades an unknown mode on read but still fails closed to baseline", () => {
    const config = parseUnifiedRuntimeConfigText(
      ["version: 1.0", "routing:", "  mode: turbo", ""].join("\n"),
    );
    expect(config.routingPosture?.mode).toBe("baseline");
    expect(config.routingPosture?.degradations.join(" ")).toMatch(/turbo/);
  });

  test("rejects an unknown mode on the write path", () => {
    expect(() =>
      mergeUnifiedRuntimeConfigDocuments({ version: "1.0" }, { routing: { mode: "turbo" } }),
    ).toThrow(/routing\.mode must be baseline, difficulty, hybrid, or intelligent/);
  });

  test("rejects a legacy routing string that names nothing on the write path", () => {
    expect(() =>
      mergeUnifiedRuntimeConfigDocuments({ version: "1.0" }, { routing: { strategy: "turbo" } }),
    ).toThrow(/routing\.strategy "turbo" is not a known mode or scoring strategy/);
    expect(() =>
      mergeUnifiedRuntimeConfigDocuments(
        { version: "1.0" },
        { routing: { strategy: "latency-first" } },
      ),
    ).not.toThrow();
  });

  test("rejects weights that are declared for a preset strategy", () => {
    expect(() =>
      mergeUnifiedRuntimeConfigDocuments(
        { version: "1.0" },
        {
          routing: {
            mode: "baseline",
            scoring_strategy: "quality",
            weights: customWeights,
          },
        },
      ),
    ).toThrow(/routing\.weights is only valid when scoring_strategy is custom/);
  });

  test("requires weights for a custom strategy on the write path", () => {
    expect(() =>
      mergeUnifiedRuntimeConfigDocuments(
        { version: "1.0" },
        { routing: { mode: "baseline", scoring_strategy: "custom" } },
      ),
    ).toThrow(/routing\.weights is required when scoring_strategy is custom/);
  });

  test("degrades invalid custom weights on read and rejects them on the write path", () => {
    const invalidWeightsText = [
      "version: 1.0",
      "routing:",
      "  mode: baseline",
      "  scoring_strategy: custom",
      "  weights:",
      "    quality: 0.5",
      "    latency: 0.5",
      "    throughput: 0.5",
      "    cost: 0.5",
      "    reliability: 0.5",
      "    preference: 0.5",
      "",
    ].join("\n");
    const degraded = parseUnifiedRuntimeConfigText(invalidWeightsText);
    expect(degraded.routingPosture?.scoringStrategy).toBeNull();
    expect(degraded.routingPosture?.degradations.join(" ")).toMatch(/weights must sum to 1.0/);

    expect(() =>
      mergeUnifiedRuntimeConfigDocuments(
        { version: "1.0" },
        {
          routing: {
            mode: "baseline",
            scoring_strategy: "custom",
            weights: {
              quality: 0.5,
              latency: 0.5,
              throughput: 0.5,
              cost: 0.5,
              reliability: 0.5,
              preference: 0.5,
            },
          },
        },
      ),
    ).toThrow(/weights must sum to 1.0/);
  });

  test("carries the posture blocks through a config patch in either spelling", () => {
    const current = { version: "1.0", execution_mode: "remote_only" };
    const snake = mergeUnifiedRuntimeConfigDocuments(current, {
      agent_strategies: { coder: { role_id: "coder" } },
    });
    expect(snake.agentStrategies?.[0]?.roleId).toBe("coder");

    const camel = mergeUnifiedRuntimeConfigDocuments(current, {
      agentStrategies: { coder: { role_id: "coder" } },
      workloads: { batch: { scoring_strategy: "cost" } },
    });
    expect(camel.agentStrategies?.[0]?.roleId).toBe("coder");
    expect(camel.workloads?.[0]?.scoringStrategy).toBe("cost");
  });

  /** Run 103 review F5: a partial `routing` patch must not reset the keys it does not name. */
  test("merges a partial routing patch into the existing block", () => {
    const current = {
      version: "1.0",
      routing: { mode: "hybrid", scoring_strategy: "latency", pin_weights: true },
    };
    const merged = mergeUnifiedRuntimeConfigDocuments(current, {
      routing: { scoring_strategy: "quality" },
    });
    expect(merged.routingPosture).toMatchObject({
      mode: "hybrid",
      scoringStrategy: "quality",
      pinWeights: true,
    });
  });

  /**
   * Run 103 follow-up review N2: `pin_weights` and `weights` are shared by both vocabularies, so a
   * patch that names only one of them must not switch vocabulary and drop the inherited legacy string.
   */
  test("a shared-flag-only patch keeps the inherited legacy posture", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      { version: "1.0", routing: { strategy: "hybrid" } },
      { routing: { pin_weights: true } },
    );
    expect(merged.routingPosture).toMatchObject({ mode: "hybrid", pinWeights: true });
    expect(merged.routingStrategy).toBe("hybrid");
  });
});

/** Run 103 review F6: a declared `model_ids` slice narrows the alias pool instead of being inert. */
describe("agent strategy model slice", () => {
  test("intersects the declared slice with the execution scope", () => {
    const section = decodeAgentStrategySection({
      agentStrategies: { coder: { role_id: "coder", model_ids: ["remote-b"] } },
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-a", "remote-b"] },
    });
    expect(section.violations).toEqual([]);
    expect(section.aliases[0]?.modelIds).toEqual(["remote-b"]);
  });

  test("an empty intersection stays empty and is reported honestly", () => {
    const section = decodeAgentStrategySection({
      agentStrategies: { coder: { role_id: "coder", model_ids: ["no-such-model"] } },
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-a"] },
    });
    const derivation = derivePostureAliasInventory({
      canonical: [],
      entries: section.entries,
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-a"] },
    });
    expect(derivation.rows).toEqual([]);
    expect(derivation.skipped).toEqual([
      { aliasId: "coder.remote-only", reason: "ALIAS_POOL_EMPTY" },
    ]);
  });

  test("a posture name declared twice names the real cause of the rejection", () => {
    const duplicate = mergeAliasInventory({
      canonical: [],
      postureAliases: [
        {
          aliasId: "coder.remote-only",
          name: "coder",
          kind: "role",
          mode: "baseline",
          roleId: "coder",
          scoringStrategy: null,
          requiredCapabilities: [],
          modelIds: ["remote-a"],
        },
        {
          aliasId: "coder.remote-only",
          name: "coder",
          kind: "workload",
          mode: "baseline",
          roleId: null,
          scoringStrategy: null,
          requiredCapabilities: [],
          modelIds: ["remote-a"],
        },
      ],
    });
    expect(duplicate.violations.join(" ")).toMatch(/declared twice/);
  });
});
