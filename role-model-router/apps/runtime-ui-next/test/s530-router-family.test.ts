import { Effect } from "effect";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";
import type { Model } from "../src/model";
import type { AppRoute } from "../src/route";

/**
 * S530: structural parity for the router/control family. The host readbacks are seeded with one
 * representative row per source (the same shapes the live host returns) so each page renders its
 * reference section titles, labels and card/table structure; the live textLen gate is measured
 * against audit/ref/<key>.json with the real host readbacks.
 */
const readback = (rows: readonly { readonly id: string; readonly label: string; readonly value: string; readonly meta: string }[]) =>
  ({ rows, status: "ok" as const, token: 1 });

const routerConfigRows = [
  { id: "strategy", label: "Routing strategy", value: "hybrid", meta: "persisted" },
  { id: "executionMode", label: "Execution mode", value: "decision_only", meta: "persisted" },
  { id: "routing.mode", label: "Routing posture: mode", value: "hybrid", meta: "routing" },
  { id: "workload.batch", label: "Workload: batch", value: "baseline / cost", meta: "posture" },
  { id: "agentStrategy.coder", label: "Agent strategy: coder", value: "difficulty / difficulty", meta: "posture" },
];

const candidateRow = { id: "cand-1", label: "gpt-6.1-sol", value: "0.82", meta: JSON.stringify({ endpointId: "openai.personal.global.gpt-6.1-sol", healthStatus: "healthy", providerId: "openai", toolCallingSupported: true }) };
const decisionRow = { id: "req-1", label: "gpt-6.1-sol", value: "0.9", meta: "openai.personal.global.gpt-6.1-sol" };
const endpointRow = { id: "endpoint-1", label: "gpt-6.1-sol", value: "active", meta: JSON.stringify({ healthStatus: "healthy", roleIds: "researcher,coder", servingSource: "remote", toolCallingSupported: true }) };

type Overrides = { readonly readbacks?: Partial<Model["readbacks"]>; readonly controls?: Model["controls"] };
const renderText = async (tag: AppRoute["_tag"], overrides: Overrides = {}): Promise<string> => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: tag } as AppRoute,
    readbacks: { ...base.readbacks, ...(overrides.readbacks ?? {}) },
    controls: overrides.controls ?? base.controls,
  });
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model, commands: [] }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container.textContent ?? "";
};

const expectTitles = async (tag: AppRoute["_tag"], titles: readonly string[], overrides: Overrides = {}) => {
  const text = await renderText(tag, overrides);
  for (const title of titles) {
    expect(text).toContain(title);
  }
};

describe("S530 router/control family structural parity", () => {
  it("/router renders the alias inventory and routing candidates tables", async () => {
    await expectTitles("Router", ["Routing overview", "Alias inventory", "Routing candidates", "Current active alias", "Alias readiness", "Alias modes"], {
      readbacks: { routerConfig: readback(routerConfigRows), router: readback([{ id: "endpoints", label: "endpoints", value: "12", meta: "summary" }]), routerCandidates: readback([candidateRow]) },
    });
  });

  it("/router/candidates renders the candidate inventory cards", async () => {
    await expectTitles("RouterCandidates", ["Candidate inventory", "ENDPOINT", "CAP", "EFFORT", "LIVE P50", "LIVE FAIL", "LIVE SAMPLES", "ROLES", "TOOLING"], {
      readbacks: { routerCandidates: readback([candidateRow]) },
    });
  });

  it("/router/decisions renders the decision ledger", async () => {
    await expectTitles("RouterDecisions", ["Routing decisions", "Decision ledger", "MODEL", "ENDPOINT", "EFFORT", "STRATEGY", "SOURCE", "DECIDED", "Router · Open detail", "Observe · Open detail"], {
      readbacks: { routerDecisions: readback([decisionRow]) },
    });
  });

  it("/router/strategy renders the routing strategy posture editors", async () => {
    await expectTitles("RouterStrategy", ["Routing strategy", "Preview only", "Routing mode", "Scoring strategy", "Execution scope"], {
      readbacks: { routerConfig: readback(routerConfigRows) },
    });
  });

  it("/router/config renders the canonical routing strategy surface", async () => {
    await expectTitles("RouterConfig", ["Routing strategy", "Preview only", "Routing mode", "Scoring strategy"], {
      readbacks: { routerConfig: readback(routerConfigRows) },
    });
  });

  it("/router/workloads renders workload templates and entries", async () => {
    await expectTitles("RouterWorkloads", ["Workloads", "Preview only", "Posture diagnostics", "Workload templates", "Entries", "Use batch template", "Use embedding template", "Add workload", "Save Workloads"], {
      readbacks: { routerConfig: readback(routerConfigRows) },
    });
  });

  it("/router/agent-strategy renders the role-bound posture editor", async () => {
    await expectTitles("RouterAgentStrategy", ["Agent strategy", "Preview only", "Posture diagnostics", "Entries", "Name", "Role (required)"], {
      readbacks: { routerConfig: readback(routerConfigRows) },
    });
  });

  it("/control/controller renders candidate cards and promotion", async () => {
    const controls = {
      controlController: { actionStatus: "idle" as const, rows: [{ id: "endpoint-other", label: "other", value: "endpoint-other", meta: "" }], status: "ok" as const, token: 1, selectedEndpointId: "endpoint-other" },
      endpoints: { actionStatus: "idle" as const, rows: [endpointRow], status: "ok" as const, token: 1 },
      providers: { actionStatus: "idle" as const, rows: [], status: "ok" as const, token: 1 },
    };
    await expectTitles("ControlController", ["Routing controller", "Controller assignment", "Use as controller", "ROLE COUNT", "SERVING"], { controls });
  });
});
