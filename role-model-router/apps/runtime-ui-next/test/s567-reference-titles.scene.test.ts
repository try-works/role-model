import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import type { Model } from "../src/model";
import { view } from "../src/view";
import { REFERENCE_TITLES } from "./support/reference-titles";
import { shellModel } from "./support/runtime-shell";

/**
 * S567: the page-title story. The shipped 0.0.20 shell shows the createRoute title of the page in
 * its 48px header (app-shell.tsx SubPageHeaderBar). The Foldkit shell must show the same string for
 * every ported route - including the five studio workspaces, whose titles differ per tab.
 */

const CASES = [
  ["Index", "/app", undefined],
  ["Models", "/app/models", undefined],
  ["ModelsRoles", "/app/models/roles", undefined],
  ["Benchmark", "/app/models/benchmark", undefined],
  ["Learning", "/app/learning", undefined],
  ["LearningConfiguration", "/app/learning/configuration", undefined],
  ["LearningPacks", "/app/learning/packs", undefined],
  ["LearningDecisions", "/app/learning/decisions", undefined],
  ["LearningEvidence", "/app/learning/evidence", undefined],
  ["LearningHistory", "/app/learning/history", undefined],
  ["LocalChoose", "/app/local/choose", undefined],
  ["LocalPeers", "/app/local/endpoints", undefined],
  ["LocalPeerModels", "/app/local/peer-models", undefined],
  ["LocalLogs", "/app/local/llama-swap/logs", undefined],
  ["LocalLlamaSwapModels", "/app/local/llama-swap/models", undefined],
  ["LocalSwap", "/app/local/llama-swap/swap", undefined],
  ["LocalPolicy", "/app/local/llama-swap/policy", undefined],
  ["Providers", "/app/remote/providers", undefined],
  ["Endpoints", "/app/connect", undefined],
  ["IntegrationsDownstream", "/app/connect/downstream", undefined],
  ["IntegrationsUpstream", "/app/connect/upstream", undefined],
  ["ControlController", "/app/router/controller", undefined],
  ["Router", "/app/router", undefined],
  ["RouterStrategy", "/app/router/strategy", undefined],
  ["RouterAgentStrategy", "/app/router/agent-strategy", undefined],
  ["RouterWorkloads", "/app/router/workloads", undefined],
  ["RouterCandidates", "/app/router/candidates", undefined],
  ["RouterDecisions", "/app/router/decisions", undefined],
  ["Runtime", "/app/system/runtime", undefined],
  ["SystemOperator", "/app/system/operator", undefined],
  ["SessionReadiness", "/app/system/session-readiness", undefined],
  ["SystemPeers", "/app/system/peers", undefined],
  ["SystemExtensions", "/app/system/extensions", undefined],
  ["StorageRetention", "/app/system/storage-retention", undefined],
  ["ObserveActivity", "/app/observe/activity", undefined],
  ["ObserveLogs", "/app/observe/logs", undefined],
  ["ObserveRouting", "/app/observe/routing", undefined],
  ["Observability", "/app/observe/observability-snapshot", undefined],
  ["Queues", "/app/observe/queues", undefined],
  ["Requests", "/app/observe/requests", undefined],
  ["StoreReceipts", "/app/observe/store-degradation-receipts", undefined],
  ["Studio", "/app/studio/chat", "chat"],
  ["Studio", "/app/studio/images", "images"],
  ["Studio", "/app/studio/audio", "audio"],
  ["Studio", "/app/studio/rerank", "rerank"],
  ["Studio", "/app/studio/advanced", "advanced"],
] as const;

const renderTitle = async (tag: string, path: string, tab: string | undefined): Promise<string> => {
  const base = shellModel({ route: { _tag: tag } as Model["route"] });
  const model: Model =
    tab === undefined
      ? base
      : {
          ...base,
          studio: {
            ...(base.studio ?? ({ tab: "chat" } as never)),
            tab: tab as never,
          } as Model["studio"],
        };
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return (container.querySelector("h1")?.textContent ?? "").trim();
};

describe("S567 page titles match the 0.0.20 reference", () => {
  for (const [tag, path, tab] of CASES) {
    it(`${tag}${tab === undefined ? "" : `:${tab}`} shows the reference title`, async () => {
      const expected = REFERENCE_TITLES[path];
      expect(expected, path).toBeDefined();
      await expect(renderTitle(tag, path, tab)).resolves.toBe(expected);
    });
  }
});
