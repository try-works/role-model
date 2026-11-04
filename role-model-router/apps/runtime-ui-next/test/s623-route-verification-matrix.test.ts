import { existsSync, readFileSync } from "node:fs";
import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import { Url } from "@role-model-router/foldkit";
import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { AppRoute } from "../src/route";
import { createInit } from "../src/init";
import type { Model } from "../src/model";
import { view } from "../src/view";
import { scanRouteTag } from "./support/handler-presence";
import { shellModel } from "./support/runtime-shell";

/**
 * S623: committed per-route verification matrix.
 *
 * Every AppRoute.cases tag is rendered, structurally scanned for interactive wiring, checked for the
 * readbacks its init plan fetches, and tied to a behavioural family test that exercises a real
 * dispatch/request. The zero-wired guard below is the regression alarm: a route that renders controls
 * with none of them wired fails this suite.
 *
 * Every route, including Requests, is scanned with no recorder error: the Requests ranking selectors are
 * real wired <select> controls (task-108), so this matrix asserts zero unwired controls route-wide.
 */
interface MatrixEntry {
  readonly behavior: string;
  readonly readbacks: ReadonlyArray<string>;
  readonly tag: string;
  readonly url: string;
}

const MATRIX: ReadonlyArray<MatrixEntry> = [
  { behavior: "s527-root-overview.test.ts", readbacks: ["overviewMetrics"], tag: "Index", url: "/" },
  { behavior: "diagnostics-client.test.ts", readbacks: [], tag: "Diagnostics", url: "/diagnostics/42" },
  { behavior: "s26d-observability.test.ts", readbacks: [], tag: "Observability", url: "/observe/observability-snapshot" },
  { behavior: "s26e-readback-routes.test.ts", readbacks: ["storeReceipts"], tag: "StoreReceipts", url: "/observe/store-degradation-receipts" },
  { behavior: "s26k-control.test.ts", readbacks: ["queues"], tag: "Queues", url: "/observe/queues" },
  { behavior: "s26b-wave1.test.ts", readbacks: ["localLogs"], tag: "LocalLogs", url: "/local/logs" },
  { behavior: "s530-router-family.test.ts", readbacks: ["routerCandidates"], tag: "RouterCandidates", url: "/router/candidates" },
  { behavior: "s619-requests-observe-wiring.test.ts", readbacks: ["requests", "overviewMetrics"], tag: "Requests", url: "/requests" },
  { behavior: "s25d-request-parity.test.ts", readbacks: ["requestDetail"], tag: "RequestDetail", url: "/requests/req-1" },
  { behavior: "s530-router-family.test.ts", readbacks: ["routerDecisions"], tag: "RouterDecisions", url: "/router/decisions" },
  { behavior: "s530-router-family.test.ts", readbacks: ["routerDecisionDetail"], tag: "RouterDecisionDetail", url: "/router/decisions/req-1" },
  { behavior: "s534-families.test.ts", readbacks: ["localPeers"], tag: "LocalPeers", url: "/local/peers" },
  { behavior: "s534-families.test.ts", readbacks: ["systemPeers"], tag: "SystemPeers", url: "/system/peers" },
  { behavior: "s534-families.test.ts", readbacks: ["localPeerModels"], tag: "LocalPeerModels", url: "/local/peer-models" },
  { behavior: "s26k-control.test.ts", readbacks: ["queueConfig"], tag: "QueuesConfiguration", url: "/control/queues-config" },
  { behavior: "s26k-control.test.ts", readbacks: ["downstreamOpenAI"], tag: "IntegrationsDownstream", url: "/integrations/downstream" },
  { behavior: "s26k-control.test.ts", readbacks: ["integrationProviders"], tag: "IntegrationsUpstream", url: "/integrations/upstream" },
  { behavior: "s534-families.test.ts", readbacks: [], tag: "LocalChoose", url: "/local/choose" },
  { behavior: "s46a-studio.test.ts", readbacks: ["configuredModels"], tag: "Studio", url: "/studio" },
  { behavior: "s619-learning-controls.test.ts", readbacks: ["learning","learningPacks","replayJobs","evaluationJobs"], tag: "Learning", url: "/learning" },
  { behavior: "s619-learning-controls.test.ts", readbacks: ["learningConfiguration"], tag: "LearningConfiguration", url: "/learning/configuration" },
  { behavior: "s619-learning-controls.test.ts", readbacks: ["learningPacks"], tag: "LearningPacks", url: "/learning/packs" },
  { behavior: "s619-learning-controls.test.ts", readbacks: ["learningDecisions"], tag: "LearningDecisions", url: "/learning/decisions" },
  { behavior: "s619-learning-controls.test.ts", readbacks: ["learningEvidence"], tag: "LearningEvidence", url: "/learning/evidence" },
  { behavior: "s619-learning-controls.test.ts", readbacks: ["learningHistory"], tag: "LearningHistory", url: "/learning/history" },
  { behavior: "s534-families.test.ts", readbacks: ["localLlamaSwapModels"], tag: "LocalLlamaSwapModels", url: "/local/llama-swap/models" },
  { behavior: "s589-local-policy-wired.test.ts", readbacks: ["localPolicy"], tag: "LocalPolicy", url: "/local/llama-swap/policy" },
  { behavior: "s534-families.test.ts", readbacks: ["operatorStatus","operatorTraceRoots","replayJobs","evaluationJobs","learningProfile","learningAdvisory"], tag: "SystemOperator", url: "/system/operator" },
  { behavior: "s534-families.test.ts", readbacks: ["extensions","contribution","recommendations","replayAutomation"], tag: "SystemExtensions", url: "/system/extensions" },
  { behavior: "s618-models-wiring.test.ts", readbacks: ["configuredModels","modelEndpoints","rolePolicy"], tag: "Models", url: "/models" },
  { behavior: "s620-roles-parity.test.ts", readbacks: ["configuredModels","modelEndpoints","rolePolicy"], tag: "ModelsRoles", url: "/models/roles" },
  { behavior: "s622-benchmark-parity.test.ts", readbacks: ["benchmarkSuite","benchmarkSummary","benchmarkRuns","benchmarkPreferences","benchmarkActiveRun","modelEndpoints"], tag: "Benchmark", url: "/system/benchmark" },
  { behavior: "s595-storage-retention.test.ts", readbacks: ["storageRetention"], tag: "StorageRetention", url: "/system/storage-retention" },
  { behavior: "s533-learning-models.test.ts", readbacks: ["runtime"], tag: "Runtime", url: "/runtime" },
  { behavior: "s76a-runtime-config.test.ts", readbacks: ["runtimeConfig"], tag: "RuntimeConfig", url: "/runtime/config" },
  { behavior: "s590-session-readiness.test.ts", readbacks: ["sessionReadiness"], tag: "SessionReadiness", url: "/session-readiness" },
  { behavior: "s527-root-overview.test.ts", readbacks: ["dashboard"], tag: "Dashboard", url: "/dashboard" },
  { behavior: "s534-families.test.ts", readbacks: ["localSwap"], tag: "LocalSwap", url: "/local/swap" },
  { behavior: "s584-router-posture-wiring.test.ts", readbacks: ["routerConfig","runtimeConfig"], tag: "RouterStrategy", url: "/router/strategy" },
  { behavior: "s530-router-family.test.ts", readbacks: ["routerConfig","runtimeConfig"], tag: "RouterWorkloads", url: "/router/workloads" },
  { behavior: "s530-router-family.test.ts", readbacks: ["routerConfig","runtimeConfig"], tag: "RouterConfig", url: "/router/config" },
  { behavior: "s530-router-family.test.ts", readbacks: ["routerConfig","runtimeConfig"], tag: "RouterAgentStrategy", url: "/router/agent-strategy" },
  { behavior: "s529-observe-family.test.ts", readbacks: ["observeActivity"], tag: "ObserveActivity", url: "/observe/activity" },
  { behavior: "s529-observe-family.test.ts", readbacks: ["observeLogs"], tag: "ObserveLogs", url: "/observe/logs" },
  { behavior: "s529-observe-family.test.ts", readbacks: ["observeRouting", "overviewMetrics"], tag: "ObserveRouting", url: "/observe/routing" },
  { behavior: "s530-router-family.test.ts", readbacks: ["router","routerConfig","routerCandidates","runtimeConfig","health"], tag: "Router", url: "/router" },
  { behavior: "s401-provider-account-form.test.ts", readbacks: ["configuredModels","modelEndpoints","integrationProviders","providerCatalog","providerAccounts","roles"], tag: "Providers", url: "/control/providers" },
  { behavior: "s439-endpoint-completion.test.ts", readbacks: ["configuredModels","modelEndpoints","integrationProviders","providerCatalog","providerAccounts","roles"], tag: "Endpoints", url: "/control/endpoints" },
  { behavior: "s73a-controller.test.ts", readbacks: [], tag: "ControlController", url: "/control/controller" },
  { behavior: "s110-nav-links.test.ts", readbacks: [], tag: "NotFound", url: "/missing" },
];

const routeFor = (tag: string): Model["route"] => {
  switch (tag) {
    case "Diagnostics":
      return { _tag: "Diagnostics", id: "42" };
    case "RequestDetail":
      return { _tag: "RequestDetail", requestId: "req-1" };
    case "RouterDecisionDetail":
      return { _tag: "RouterDecisionDetail", requestId: "req-1" };
    case "NotFound":
      return { _tag: "NotFound", path: "/missing" };
    default:
      return { _tag: tag } as Model["route"];
  }
};

const renderRoute = async (entry: MatrixEntry): Promise<string> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel({ route: routeFor(entry.tag) }), commands: [] }),
    view,
  }, { isHydratable: false }));
  return rendered.html;
};

const readbackKeysFor = (entry: MatrixEntry): ReadonlyArray<string> => {
  const cmd = (name: string) => (args: unknown) => ({ name, args });
  const init = createInit(
    cmd("ReadDiagnostics") as never,
    cmd("ReadObservability") as never,
    cmd("ReadReadback") as never,
    cmd("ReadControl") as never,
    false,
  );
  const url = Option.getOrThrow(Url.fromString("http://localhost" + entry.url));
  const result = init(url);
  return (result.commands ?? [])
    .filter((command) => command.name === "ReadReadback")
    .map((command) => String((command.args as { readonly key?: unknown } | undefined)?.key));
};

describe("S623 per-route verification matrix", () => {
  it("covers every AppRoute.cases tag exactly once", () => {
    const cases = Object.keys((AppRoute as unknown as { readonly cases: Readonly<Record<string, unknown>> }).cases).sort();
    expect(MATRIX.map((entry) => entry.tag).sort()).toEqual(cases);
    expect(new Set(MATRIX.map((entry) => entry.tag)).size).toBe(MATRIX.length);
  });

  it("renders every route through the real view", async () => {
    for (const entry of MATRIX) {
      const html = await renderRoute(entry);
      expect(html.length, entry.tag + " rendered empty").toBeGreaterThan(0);
    }
  });

  it("records the readback fetches each route's init plan requires", () => {
    for (const entry of MATRIX) {
      expect(readbackKeysFor(entry), entry.tag + " readback plan").toEqual(entry.readbacks);
    }
  });

  it("scans every route with no recorder gaps", () => {
    const errors: string[] = [];
    for (const entry of MATRIX) {
      const scan = scanRouteTag(entry.tag);
      // task-108 closed the Requests listbox recorder gap: its selectors are real wired <select> controls.
      expect(scan.error, entry.tag + " scan error").toBeUndefined();
      expect(scan.elements.length, entry.tag + " has no interactive elements").toBeGreaterThan(0);
      expect(scan.wired.length, entry.tag + " has zero wired controls").toBeGreaterThan(0);
      if (scan.unwired.length > 0) errors.push(entry.tag + ": " + scan.unwired.map((element) => element.label).join(", "));
    }
    // The known dead controls are reported in evidence/logs/route-verification-matrix.md, not fixed here.
    expect(errors).toEqual([]);
  });

  it("fails any route that regresses to zero wired controls", () => {
    const zeroWired = MATRIX.flatMap((entry) => {
      const scan = scanRouteTag(entry.tag);
      return scan.error === undefined && scan.elements.length > 0 && scan.wired.length === 0 ? [entry.tag] : [];
    });
    expect(zeroWired).toEqual([]);
    const wiredTotal = MATRIX.reduce((sum, entry) => sum + scanRouteTag(entry.tag).wired.length, 0);
    expect(wiredTotal).toBeGreaterThan(MATRIX.length * 20);
  });

  it("ties every route to a committed behavioural family test", () => {
    for (const entry of MATRIX) {
      const path = new URL("./" + entry.behavior, import.meta.url);
      expect(existsSync(path), "missing behaviour test " + entry.behavior).toBe(true);
      const source = readFileSync(path, "utf8");
      expect(source.includes("describe("), entry.behavior + " has no describe block").toBe(true);
    }
  });
});
