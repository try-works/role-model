import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { describe, expect, test } from "vitest";

import { mapChatCompletionsRequest } from "../src/index.js";
import { createPrivateKwJoinWorkerFactory } from "../src/kw-private-loader.js";
import {
  clearKwPromptInjectSessionsForTests,
  registerKwPromptInjectSession,
} from "../src/kw-prompt-inject.js";
import { setKwJoinWorkerFactory } from "../src/track-b-operations.js";

const distributionRoot = process.env.ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT?.trim() ?? "";
const evidenceRoot = process.env.ROLE_MODEL_EVIDENCE_ROOT?.trim() ?? "";
const seaPath = process.env.ROLE_MODEL_SEA_PATH?.trim() ?? "";
const hasPackagedSurface =
  Boolean(distributionRoot && existsSync(distributionRoot)) &&
  Boolean(evidenceRoot && existsSync(path.join(evidenceRoot, "other/rebuild-receipt.json"))) &&
  Boolean(seaPath && existsSync(seaPath));

const registry = {
  endpoints: [
    {
      identity: {
        endpoint_id: "openai.personal.codex.global.gpt-5-4",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "chatgpt/gpt-5.4",
        runtime_version: "1",
        region: "global",
      },
      declared: {
        endpoint_id: "openai.personal.codex.global.gpt-5-4",
        capabilities: ["text.chat", "tools.function_calling"],
        modalities: ["text"],
        max_context_tokens: 128000,
        tool_calling: { supported: true, style: "openai" },
        supports_embeddings: false,
      },
      status: "active",
    },
  ],
  diagnostics: [],
  lifecycleSummary: { active: 1, degraded: 0, unavailable: 0 },
} as unknown as EndpointRegistryResult;

function knowledgeBase(authority: {
  issue: (claims: Record<string, unknown>) => unknown;
  groupDigest: (group: unknown) => string;
}) {
  const group = {
    policy: "p",
    task: "t",
    scorer: "exact@1",
    seed: 1,
    comparabilityKey: "run85-map-surface",
    positive: [{ id: "p", score: 1, evidenceRef: "sha256:p" }],
    negative: [{ id: "n", score: 0, evidenceRef: "sha256:n" }],
  };
  return {
    group,
    validation: {
      trainingIds: ["t"],
      holdoutIds: ["h"],
      replayIds: ["r"],
      evalIds: ["e"],
    },
    scope: { routePackage: "rp" },
    semanticAdvantages: ["prefer verified evidence"],
    receipt: authority.issue({
      kind: "knowledge_validation",
      groupDigest: authority.groupDigest(group),
      reviewed: true,
      safetyReviewed: true,
      redacted: true,
      holdoutPassed: true,
    }),
  };
}

function hasInjectPayload(messages: readonly { content?: unknown }[] | undefined) {
  return (messages ?? []).some(
    (message) =>
      typeof message?.content === "string" &&
      message.content.includes("ROLE_MODEL_KW_PROMPT_INJECT_V1"),
  );
}

describe.skipIf(!hasPackagedSurface)("mapChatCompletionsRequest KW inject locked surface", () => {
  test("OFF refuses without KW payload; ON prepends via applyRequestedRoleExecutionPolicy", async () => {
    clearKwPromptInjectSessionsForTests();
    setKwJoinWorkerFactory(undefined);

    const receiptPath = path.join(evidenceRoot, "other/rebuild-receipt.json");
    expect(existsSync(receiptPath)).toBe(true);
    expect(existsSync(seaPath)).toBe(true);
    const rebuildReceipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
      sea?: { sha256?: string };
    };
    const seaSha = createHash("sha256").update(readFileSync(seaPath)).digest("hex");
    expect(seaSha).toBe(rebuildReceipt.sea?.sha256);

    const off = mapChatCompletionsRequest(
      registry,
      {
        model: "chatgpt/gpt-5.4",
        messages: [{ role: "user", content: "hello from run85" }],
      } as never,
      "req-off",
      [],
      undefined,
      undefined,
      { sessionId: "map-85", kwProductionActivation: false },
    );
    const offMessages = off.executionRequest.messages ?? [];
    expect(hasInjectPayload(offMessages)).toBe(false);

    const factory = createPrivateKwJoinWorkerFactory({
      distributionRoot,
      prepareWorker: async (worker) => {
        const authority = (
          worker as {
            authority?: {
              issue: (claims: Record<string, unknown>) => unknown;
              groupDigest: (group: unknown) => string;
            };
          }
        ).authority;
        if (!authority) throw new Error("authority required");
        const signed = knowledgeBase(authority);
        worker.bootstrapShadowReady?.(signed);
        worker.activate?.({
          activationPolicyVersion: 1,
          operatorAttestation: "activate-production",
          receipt: signed.receipt,
        });
      },
    });
    const worker = await factory("map-85");
    if (!worker) throw new Error("expected KW join worker for map-85");
    registerKwPromptInjectSession("map-85", worker);

    const on = mapChatCompletionsRequest(
      registry,
      {
        model: "chatgpt/gpt-5.4",
        messages: [{ role: "user", content: "hello from run85" }],
      } as never,
      "req-on",
      [],
      undefined,
      undefined,
      {
        sessionId: "map-85",
        kwProductionActivation: true,
        kwPromptInjectQuery: {
          scopeId: "run85",
          query: "verified evidence",
          filters: { activeOnly: true, sensitivityMax: "private" },
          limit: 5,
        },
      },
    );
    const onMessages = on.executionRequest.messages ?? [];
    expect(onMessages[0]?.role).toBe("system");
    expect(String(onMessages[0]?.content)).toContain("ROLE_MODEL_KW_PROMPT_INJECT_V1");
    expect(String(onMessages[0]?.content)).toContain("prefer verified evidence");

    worker.deactivate?.({
      deactivationPolicyVersion: 1,
      operatorAttestation: "deactivate-production",
    });
    const softOff = mapChatCompletionsRequest(
      registry,
      {
        model: "chatgpt/gpt-5.4",
        messages: [{ role: "user", content: "hello from run85" }],
      } as never,
      "req-soft-off",
      [],
      undefined,
      undefined,
      { sessionId: "map-85", kwProductionActivation: true },
    );
    const softOffMessages = softOff.executionRequest.messages ?? [];
    expect(hasInjectPayload(softOffMessages)).toBe(false);

    const hop = {
      schemaVersion: "role-model.run85.sea-inject-hop.v1",
      probe: "run85_sea_inject_hop",
      seaSha256: seaSha,
      distributionRoot,
      surface: "applyRequestedRoleExecutionPolicy",
      via: "mapChatCompletionsRequest",
      off: {
        ok: !hasInjectPayload(offMessages),
        injectedPayloadPresent: hasInjectPayload(offMessages),
        expectedRefuse: "kw_prompt_inject_requires_activation",
      },
      on: {
        ok: hasInjectPayload(onMessages),
        injectedPayloadPresent: hasInjectPayload(onMessages),
        systemMessagePreview: String(onMessages[0]?.content ?? "").slice(0, 240),
      },
      softOff: {
        ok: !hasInjectPayload(softOffMessages),
        injectedPayloadPresent: hasInjectPayload(softOffMessages),
      },
      pass: true,
    };
    const outDir = path.join(evidenceRoot, "logs/phase5");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "sea-inject-hop.json"), `${JSON.stringify(hop, null, 2)}\n`);

    clearKwPromptInjectSessionsForTests();
    setKwJoinWorkerFactory(undefined);
  });
});
