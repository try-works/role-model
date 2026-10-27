import { describe, expect, test } from "vitest";

import { createCliServerOptions } from "../src/cli.js";
import {
  assertComposedBackendOwner,
  isComposedBackendOwner,
  withBackendProviderPermits,
  type BackendOwner,
} from "../src/composition-dag.js";

/**
 * S310b/S311 (R27): the composition DAG is the construction site for the Backend owner. The host uses the
 * DAG-built instance by identity, a legacy construction is rejected, the provider path (options AND raw
 * backend consumers like the pairwise judge) runs under the DAG ProviderPermits bound, and the restored
 * getRoutableInventory/anonymousLearningReads fields keep the 181-name options ledger complete.
 */

type FakeBackend = {
  readonly effectiveRegistry: { diagnostics: never[]; endpoints: never[]; lifecycleSummary: { active: number; degraded: number; offline: number } };
  getEffectiveRoutableInventory: () => null;
  getExecutionCatalog: () => { catalogVersion: string; source: Record<string, never> };
  operatorAuthToken: string;
  executeChatCompletions: (...args: readonly never[]) => Promise<{ kind: string }>;
  executeResponses: (...args: readonly never[]) => Promise<{ kind: string }>;
};

// SAFETY: the test double is checked by satisfies FakeBackend above; the CLI/owner inputs accept the
// real backend types, so the double is cast at each call boundary through this one helper.
const asNever = <T>(value: T): never => value as never;

const makeBackend = (): { backend: FakeBackend; stats: () => { maxActive: number }; failNext: () => void } => {
  let active = 0;
  let maxActive = 0;
  let failOnce = false;
  const track = async (kind: string): Promise<{ kind: string }> => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 40));
    active -= 1;
    if (failOnce) {
      failOnce = false;
      throw new Error("provider failure");
    }
    return { kind };
  };
  const backend = {
    effectiveRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } },
    getEffectiveRoutableInventory: () => null,
    getExecutionCatalog: () => ({ catalogVersion: "1", source: {} }),
    operatorAuthToken: "s310b-token",
    executeChatCompletions: (..._args) => track("chat"),
    executeResponses: (..._args) => track("responses"),
  } satisfies FakeBackend;
  return { backend, failNext: () => { failOnce = true; }, stats: () => ({ maxActive }) };
};

describe("S310b DAG Backend owner", () => {
  test("the host uses the DAG-built Backend owner by identity (and a legacy construction is rejected)", () => {
    const { backend } = makeBackend();
    let captured: BackendOwner | undefined;
    const options = createCliServerOptions(
      { host: "127.0.0.1", port: 0 },
      asNever(backend),
      undefined,
      (owner) => {
        captured = owner;
      },
    );
    expect(captured).toBeDefined();
    expect(options).toBe(captured?.options);
    expect(isComposedBackendOwner(captured)).toBe(true);
    expect(() => assertComposedBackendOwner({ host: "127.0.0.1", port: 0 })).toThrow();
  });

  test("executeChatCompletions/executeResponses run under the DAG permit bound and release on failure", async () => {
    const { backend, stats, failNext } = makeBackend();
    // Production wraps the backend at createRuntimeBridgeBackend; the double is wrapped the same way.
    const wrapped = withBackendProviderPermits(asNever(backend));
    const options = createCliServerOptions({ host: "127.0.0.1", port: 0 }, asNever(wrapped));
    await Promise.all(Array.from({ length: 6 }, () => options.executeChatCompletions(asNever({}), "r", undefined, undefined)));
    expect(stats().maxActive).toBeLessThanOrEqual(4);
    failNext();
    await expect(options.executeChatCompletions(asNever({}), "r", undefined, undefined)).rejects.toThrow(/provider failure/);
    // Permit released after the rejection: the next call still succeeds and stays bounded.
    await Promise.all(Array.from({ length: 6 }, () => options.executeResponses(asNever({}), "r", undefined, undefined)));
    expect(stats().maxActive).toBeLessThanOrEqual(4);
    await expect(options.executeResponses(asNever({}), "r", undefined, undefined)).resolves.toBeDefined();
  });

  test("raw backend consumers (pairwise judge path) are permit-bounded through the DAG wrapper", async () => {
    const { backend, stats } = makeBackend();
    const bounded = withBackendProviderPermits(asNever(backend));
    await Promise.all(Array.from({ length: 6 }, () => bounded.executeChatCompletions(asNever({}), "r", undefined, undefined)));
    expect(stats().maxActive).toBeLessThanOrEqual(4);
    await Promise.all(Array.from({ length: 6 }, () => bounded.executeResponses(asNever({}), "r", undefined, undefined)));
    expect(stats().maxActive).toBeLessThanOrEqual(4);
  });

  test("restored getRoutableInventory/anonymousLearningReads keep the 181-name options ledger complete", () => {
    const { backend } = makeBackend();
    const options = createCliServerOptions(
      {
        anonymousLearningReads: "on",
        host: "127.0.0.1",
        observabilityScope: asNever({ metricScopeId: "s310b" }),
        port: 0,
        rescoreLearningScores: async () => ({}),
        resolveLearningPolicySource: async () => ({}),
      },
      asNever(backend),
    );
    expect(options.getRoutableInventory).toBeTypeOf("function");
    expect(options.getRoutableInventory?.()).toBeNull();
    expect(options.anonymousLearningReads).toBe("on");
    expect(Object.keys(options).length).toBe(181);
    const withoutAnonymous = createCliServerOptions({ host: "127.0.0.1", port: 0 }, asNever(backend));
    expect("anonymousLearningReads" in withoutAnonymous).toBe(false);
  });

  test("withBackendProviderPermits preserves live getters (effectiveRegistry follows execution-mode changes)", async () => {
    let executionMode: "local" | "remote" = "local";
    const liveRegistry = () => ({
      diagnostics: [],
      endpoints: executionMode === "local" ? [] : [{ endpointId: "remote-1" }],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    });
    const liveBackend = {
      get effectiveRegistry() {
        return liveRegistry();
      },
      getExecutionCatalog: () => ({ catalogVersion: "1", source: {} }),
      operatorAuthToken: "s310b-token",
      executeChatCompletions: async () => ({ kind: "chat" }),
      executeResponses: async () => ({ kind: "responses" }),
    } satisfies {
      readonly effectiveRegistry: ReturnType<typeof liveRegistry>;
      getExecutionCatalog: () => { catalogVersion: string; source: Record<string, never> };
      operatorAuthToken: string;
      executeChatCompletions: (...args: readonly never[]) => Promise<{ kind: string }>;
      executeResponses: (...args: readonly never[]) => Promise<{ kind: string }>;
    };
    const wrapped = withBackendProviderPermits(liveBackend);
    expect(wrapped.effectiveRegistry.endpoints).toHaveLength(0);
    executionMode = "remote";
    expect(wrapped.effectiveRegistry.endpoints).toHaveLength(1);
    expect(wrapped.effectiveRegistry.endpoints[0]?.endpointId).toBe("remote-1");
  });
});