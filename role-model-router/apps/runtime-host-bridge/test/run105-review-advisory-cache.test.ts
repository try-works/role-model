import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { TrackBRouteAdvisorySourceResult } from "../src/route-advisory-source.js";
const routing = vi.hoisted(() => ({ advisories: [] as unknown[] }));
vi.mock("@role-model-router/protocol-routing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@role-model-router/protocol-routing")>();
  return { ...original, routeRuntimeRequest: (input: Parameters<typeof original.routeRuntimeRequest>[0]) => {
    routing.advisories.push(input.advisoryConsideration);

    return original.routeRuntimeRequest(input);
  } };
});
import { createRuntimeBridgeBackend } from "../src/index.js";
import { clearTrackBDurableRouteAdvisoryCacheForTests, clearTrackBRouteAdvisoryCacheForTests,
  recallTrackBDurableRouteAdvisory, rememberTrackBDurableRouteAdvisory, rememberTrackBRouteAdvisory,
  readTrackBRouteAdvisorySourceFromRuntime } from "../src/track-b-runtime.js";
const channel = "development", scope = "run105-review-advisory-cache";
const pair = { roleId: "coder", taskTypeId: "coder.review" };
function advisory(roleId: string | null, taskTypeId: string | null, endpointId: string | null = "endpoint-a"): TrackBRouteAdvisorySourceResult {
  return { roleId, taskTypeId, preferredRoutePackage: endpointId,
    advisoryLadder: endpointId ? [{ endpointId, rank: 1, status: "available" }] : [],
    advisoryState: endpointId ? "fresh" : "unavailable", confidence: endpointId ? 0.82 : 0,
    candidateId: endpointId ? "candidate-a" : null, advisoryId: endpointId ? "pack-a" : null,
    cohortPercent: endpointId ? 25 : 0, reason: endpointId ? null : "rolled back",
    taxonomyVersion: "1.0.0-alpha.1", revalidationDue: false };
}
function remember(roleId: string | null, taskTypeId: string | null, endpointId = "endpoint-a", nowMs = 1000, dimensions = { channel, scope }) {
  return rememberTrackBDurableRouteAdvisory({ ...dimensions, roleId, advisory: advisory(roleId, taskTypeId, endpointId), nowMs });
}
function recall(roleId: string | null, taskTypeId: string | null, dimensions = { channel, scope }) {
  return recallTrackBDurableRouteAdvisory({ ...dimensions, roleId, taskTypeId });
}
beforeEach(() => {
  clearTrackBDurableRouteAdvisoryCacheForTests(); clearTrackBRouteAdvisoryCacheForTests(); routing.advisories.length = 0;
});
afterEach(() => vi.unstubAllEnvs());
describe("run105 review exact advisory cache", () => {
  test.each(["missing", "stopped", "excluded"])("classified live backend never resurrects transient advisory after %s", async (state) => {
    vi.stubEnv("ROLE_MODEL_LEARNING_STAGE", "S3");
    const root = await mkdtemp(path.join(os.tmpdir(), "run105-cache-live-"));
    const backend = await createRuntimeBridgeBackend({
      repoRoot: path.resolve(import.meta.dirname, "../../../.."), fixtureRoot: path.join(import.meta.dirname, "fixtures"),
      runtimeStateRoot: root, scopeId: scope,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({ loginId: "cache-login", verificationUrl: "https://auth.openai.com/codex/device", userCode: "CACHE", wsUrl: "ws://127.0.0.1:4596", pid: 4596 }),
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(path.join(codexHome, "auth.json"), JSON.stringify({ auth_mode: "chatgpt", tokens: { access_token: "test-access", refresh_token: "test-refresh", account_id: "cache-account" }, last_refresh: new Date().toISOString() }));
          return { account: { type: "chatgpt", email: "cache@example.com", planType: "pro" }, requiresOpenaiAuth: true };
        },
      },
      codexExecutionAdapter: { executeRequest: async ({ requestId }) => ({ statusCode: 200, body: { id: requestId, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "ready" } }] } }) },
    });
    try {
      const pending = await backend.startProviderDeviceAuthorization({ providerAccountId: "openai.personal.codex-subscription", providerId: "openai", providerKind: "provider-openai", variantId: "openai-codex-subscription", orgScope: "personal", accountScope: "workspace-default", allowedModels: ["chatgpt/gpt-5.4"], deniedModels: [], entitlementTags: ["chat"], budgetPolicyRef: "budget.default", quotaPolicyRef: "quota.default" });
      await backend.pollProviderDeviceAuthorization({ authRequestId: pending.authRequestId });
      const endpoint = await backend.activateEndpoint({ providerAccountId: "openai.personal.codex-subscription", modelId: "chatgpt/gpt-5.4", region: "global" });
      rememberTrackBRouteAdvisory({ channel, scope, routePackage: endpoint.endpointId, preferredRoutePackage: endpoint.endpointId, advisoryState: "fresh", confidence: 1, candidateId: "transient-candidate", advisoryId: "transient-pack", taskTypeId: null, nowMs: Date.now() });
      if (state !== "missing") {
        remember("coder", "coder.edit", endpoint.endpointId, Date.now());
        const unavailable = await readTrackBRouteAdvisorySourceFromRuntime({ channel, scope, roleId: "coder", taskTypeId: "coder.edit", stage: "S3", policyCohortPercent: 25, nowMs: Date.now(), evidenceMaxAgeMs: 900000,
          runtime: { invoke: async () => ({ schemaVersion: "role-model.route-ladder-read.v1", contract: "RouteLadderPackV1", roleId: "coder", taskTypeId: "coder.edit",
            ladder: { contract: "RouteLadderPackV1", scopeId: scope, version: 1, rolledBack: { on: state === "stopped" }, rungs: [{ endpointId: endpoint.endpointId, rank: 1, status: state === "excluded" ? "unavailable" : "available" }] } }) } as never });
        expect(unavailable).toMatchObject({ advisoryState: "unavailable", reason: state === "stopped" ? "rolled back" : "no admitted rung" });
        rememberTrackBDurableRouteAdvisory({ channel, scope, roleId: "coder", advisory: unavailable, nowMs: Date.now() });
        // A later task publication cannot overwrite the authoritative unavailable answer.
        remember("coder", "coder.explain", endpoint.endpointId, Date.now());
      }
      routing.advisories.length = 0;
      await backend.executeChatCompletions({ model: "chatgpt/gpt-5.4", messages: [{ role: "user", content: "Review this change." }] }, "req-cache-" + state, undefined, { requestedRoleId: "coder", taskType: "coder.edit" });
      expect(routing.advisories.length).toBeGreaterThan(0);
      for (const value of routing.advisories) {
        if (state === "missing") expect(value).toBeUndefined();
        else expect(value).toMatchObject({ roleId: "coder", taskTypeId: "coder.edit", advisoryState: "unavailable", preferredEndpointId: null });
      }
    } finally { await backend.shutdown?.(); await rm(root, { recursive: true, force: true }); }
  }, 120000);

  test("same role retains two tasks without overwriting or borrowing", () => {
    remember("coder", "coder.review", "review"); remember("coder", "coder.explain", "explain");
    expect(recall("coder", "coder.review")?.preferredRoutePackage).toBe("review");
    expect(recall("coder", "coder.explain")?.preferredRoutePackage).toBe("explain");
    expect(recall("coder", "coder.edit")).toBeNull();
  });
  test("same task retains different roles without borrowing", () => {
    remember("coder", "coder.review", "coder"); remember("reviewer", "coder.review", "reviewer");
    expect(recall("coder", "coder.review")?.preferredRoutePackage).toBe("coder");
    expect(recall("reviewer", "coder.review")?.preferredRoutePackage).toBe("reviewer");
    expect(recall("writer", "coder.review")).toBeNull();
  });
  test("channel and runtime scope isolate identical pairs", () => {
    remember("coder", "coder.review", "development");
    remember("coder", "coder.review", "stage", 1000, { channel: "stage", scope });
    remember("coder", "coder.review", "other", 1000, { channel, scope: "other" });
    expect(recall("coder", "coder.review")?.preferredRoutePackage).toBe("development");
    expect(recall("coder", "coder.review", { channel: "stage", scope })?.preferredRoutePackage).toBe("stage");
    expect(recall("coder", "coder.review", { channel, scope: "other" })?.preferredRoutePackage).toBe("other");
  });
  test("only genuinely no-role/no-task recall can use legacy entry", () => {
    remember(null, null, "legacy"); remember("coder", "coder.review", "classified");
    expect(recall(null, null)?.preferredRoutePackage).toBe("legacy");
    expect(recall("coder", null)).toBeNull(); expect(recall(null, "coder.review")).toBeNull();
  });
  test("re-remember refreshes actual recency beyond 512 entries", () => {
    for (let i = 0; i < 512; i++) remember("coder", "task-" + i, "endpoint-" + i, i);
    remember("coder", "task-0", "refreshed", 1000); remember("coder", "task-512", "new", 1001);
    expect(recall("coder", "task-0")?.preferredRoutePackage).toBe("refreshed");
    expect(recall("coder", "task-1")).toBeNull();
    expect(recall("coder", "task-512")?.preferredRoutePackage).toBe("new");
  });
  test("source wrapper forwards explicit effective stage and cohort", async () => {
    const document = { type: "route_ladder_evidence", version: 1, scope,
      provenance: { scopeId: scope, ...pair, taxonomyVersion: "1.0.0-alpha.1", groupIds: ["group-a"], endpointEvidence: { "endpoint-a": { comparisonCount: 1, meanConfidence: 0.82 } }, confidence: 0.82, evidenceAtMs: 1000 } };
    const canonical = (value: unknown): string => Array.isArray(value) ? "[" + value.map(canonical).join(",") + "]" : value && typeof value === "object" ? "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical((value as Record<string, unknown>)[key])).join(",") + "}" : JSON.stringify(value);
    const packId = createHash("sha256").update(canonical(document)).digest("hex");
    const invoke = vi.fn(async (_id: string, envelope: { capability: string }) => {
      if (envelope.capability === "knowledge:read-route-ladder") return {
        schemaVersion: "role-model.route-ladder-read.v1", contract: "RouteLadderPackV1", ...pair,
        ladder: { contract: "RouteLadderPackV1", scopeId: scope, version: 1, packId, taxonomyVersion: "1.0.0-alpha.1", completeness: { admitted: 1, configured: 1 }, rolledBack: { on: false }, rungs: [{ endpointId: "endpoint-a", rank: 1, status: "available" }] },
      };
      if (envelope.capability === "knowledge:read") return document;
      return { schemaVersion: "role-model.route-package-rollout-state.v1", scopeId: scope, state: "disabled", cohortPercent: 40, killSwitchAtMs: null, breaches: [] };
    });
    const result = await readTrackBRouteAdvisorySourceFromRuntime({ channel, scope, ...pair,
      stage: "S2", policyCohortPercent: 15, nowMs: 1000, evidenceMaxAgeMs: 900000, runtime: { invoke } as never });
    expect(result).toMatchObject({ advisoryState: "fresh", cohortPercent: 15, ...pair });
  });
  test("publisher role cannot relabel a fresh advisory learned for another role", () => {
    rememberTrackBDurableRouteAdvisory({ channel, scope, roleId: "writer", advisory: advisory("coder", "coder.review"), nowMs: 1000 });
    expect(recall("writer", "coder.review")).toBeNull();
    expect(recall("coder", "coder.review")).toMatchObject(pair);
  });
  test("source role and task persist when publisher omits redundant role input", () => {
    rememberTrackBDurableRouteAdvisory({ channel, scope, advisory: advisory("coder", "coder.review"), nowMs: 1000 });
    expect(recall("coder", "coder.review")).toMatchObject(pair); expect(recall(null, null)).toBeNull();
  });
});
