import { describe, expect, test } from "vitest";

import {
  decodeAgentStrategySection,
  derivePostureAliasInventory,
  findAgentStrategyAlias,
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

  test("falls back to the legacy strategy string when no routing block is declared", () => {
    const config = parseUnifiedRuntimeConfigText("version: 1.0\nrouting:\n  strategy: latency-first\n");
    expect(config.routingPosture).toBeUndefined();
    expect(config.routingStrategy).toBe("latency-first");
    expect(renderUnifiedRuntimeConfigText(config)).toContain("strategy: latency-first");
  });

  test("rejects custom weights that do not satisfy the schema", () => {
    expect(() =>
      parseUnifiedRuntimeConfigText(
        [
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
        ].join("\n"),
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
});
