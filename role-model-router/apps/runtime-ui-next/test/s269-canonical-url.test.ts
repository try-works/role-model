import { Option } from "effect";
import { describe, expect, it } from "vitest";

import { Url } from "@role-model-router/foldkit";

import { createShellApp } from "../src/app";
import { Message } from "../src/message";
import { createReadbackClients } from "../src/readback";
import { routeFromUrl } from "../src/route";
import { studioIdle } from "../src/studio";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S269 (R11/R13): the original runtime-ui `/app/*` URLs for already-implemented families resolve
 * to the same real typed route as the new bare URLs, and a Navigation.replaceUrl Command
 * canonicalises the address bar. Missing original feature families stay explicit NotFound.
 *
 * The historical S269 RED failed to resolve `../src/legacy-redirects`; that is a setup failure,
 * not behavioural RED. Only the 6 mounted supported-redirect failures were actual RED there. The
 * S272 RED in `evidence/other/s272-red-tests.log` is behavioural: the module exists, and the
 * same-route echo/Studio-alias assertions below fail on the pre-repair source.
 */

const MISSING_PATHS: readonly string[] = [];

const REDIRECT_ROUTE_ENTRIES: readonly string[] = [
  "/app/local/swap",
  "/app/local/policy",
  "/app/local/logs",
  "/app/local/matrix",
  "/app/local/peers",
  "/app/control/providers",
  "/app/control/routing-strategy",
  "/app/control/runtime-config",
  "/app/control/controller",
  "/app/endpoints",
  "/app/control/endpoints",
  "/app/control/roles",
  "/app/control/benchmark",
  "/app/control/models",
  "/app/observe",
  "/app/endpoints/downstream",
  "/app/integrations/downstream",
  "/app/endpoints/upstream",
  "/app/integrations/upstream",
  "/app/control/session-readiness",
];

const urlOf = (href: string) =>
  Option.getOrThrow(Url.fromString(`http://localhost${href}`));

const commandNames = (result: ReturnType<typeof shellUpdate>): readonly string[] =>
  (result.commands ?? []).map((command) => command.name);

const replaceCommand = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).find((command) => command.name === "ReplaceLegacyUrl");

const readCommands = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).filter((command) => command.name === "ReadReadback");

const diagnosticsReadCommands = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).filter((command) => command.name === "ReadDiagnostics");

const legacy = () => import("../src/legacy-redirects");

const shellApp = () =>
  createShellApp({
    readbackReaders: createReadbackClients({
      fetchImpl: async () => new Response("{}", { status: 200 }),
    }),
  });

describe("S269 typed resolution of original /app URLs", () => {
  it("resolves the original request list to the real Requests route, not NotFound", () => {
    expect(routeFromUrl(urlOf("/app/observe/requests"))).toMatchObject({ _tag: "Requests" });
  });

  it("resolves original detail URLs with their real ID", () => {
    expect(routeFromUrl(urlOf("/app/observe/requests/req-1"))).toMatchObject({
      _tag: "RequestDetail",
      requestId: "req-1",
    });
    expect(routeFromUrl(urlOf("/app/router/decisions/dec-1"))).toMatchObject({
      _tag: "RouterDecisionDetail",
      requestId: "dec-1",
    });
  });

  it("keeps existing bare URLs as the canonical compatible aliases", () => {
    expect(routeFromUrl(urlOf("/requests"))).toMatchObject({ _tag: "Requests" });
    expect(routeFromUrl(urlOf("/models"))).toMatchObject({ _tag: "Models" });
    expect(routeFromUrl(urlOf("/studio"))).toMatchObject({ _tag: "Studio" });
  });

  const supported: ReadonlyArray<{
    readonly original: string;
    readonly tag: string;
    readonly canonical: string;
  }> = [
    { canonical: "/", original: "/app", tag: "Index" },
    {
      canonical: "/control/providers",
      original: "/app/remote/providers",
      tag: "Providers",
    },
    {
      canonical: "/control/controller",
      original: "/app/router/controller",
      tag: "ControlController",
    },
    {
      canonical: "/integrations/downstream",
      original: "/app/connect/downstream",
      tag: "IntegrationsDownstream",
    },
    {
      canonical: "/integrations/upstream",
      original: "/app/connect/upstream",
      tag: "IntegrationsUpstream",
    },
    { canonical: "/local/logs", original: "/app/local/llama-swap/logs", tag: "LocalLogs" },
    { canonical: "/local/swap", original: "/app/local/llama-swap/swap", tag: "LocalSwap" },
    { canonical: "/models", original: "/app/models", tag: "Models" },
    { canonical: "/learning", original: "/app/learning", tag: "Learning" },
    { canonical: "/runtime", original: "/app/system/runtime", tag: "Runtime" },
    {
      canonical: "/runtime",
      original: "/app/system/runtime-config",
      tag: "Runtime",
    },
    {
      canonical: "/session-readiness",
      original: "/app/system/session-readiness",
      tag: "SessionReadiness",
    },
    {
      canonical: "/system/peers",
      original: "/app/system/peers",
      tag: "SystemPeers",
    },
    {
      canonical: "/system/storage-retention",
      original: "/app/system/storage-retention",
      tag: "StorageRetention",
    },
    {
      canonical: "/observe/activity",
      original: "/app/observe/activity",
      tag: "ObserveActivity",
    },
    {
      canonical: "/observe/logs",
      original: "/app/observe/logs",
      tag: "ObserveLogs",
    },
    {
      canonical: "/observe/queues",
      original: "/app/observe/queues",
      tag: "Queues",
    },
    {
      canonical: "/observe/routing",
      original: "/app/observe/routing",
      tag: "ObserveRouting",
    },
    {
      canonical: "/observe/store-degradation-receipts",
      original: "/app/observe/store-degradation-receipts",
      tag: "StoreReceipts",
    },
    {
      canonical: "/observe/observability-snapshot",
      original: "/app/observe/observability-snapshot",
      tag: "Observability",
    },
    { canonical: "/router", original: "/app/router", tag: "Router" },
    {
      canonical: "/router/candidates",
      original: "/app/router/candidates",
      tag: "RouterCandidates",
    },
    {
      canonical: "/router/decisions",
      original: "/app/router/decisions",
      tag: "RouterDecisions",
    },
    { canonical: "/local/choose", original: "/app/local/choose", tag: "LocalChoose" },
    { canonical: "/local/choose", original: "/app/local/models", tag: "LocalChoose" },
    {
      canonical: "/local/peer-models",
      original: "/app/local/peer-models",
      tag: "LocalPeerModels",
    },
    { canonical: "/local/peers", original: "/app/local/endpoints", tag: "LocalPeers" },
    { canonical: "/requests", original: "/app/observe/requests", tag: "Requests" },
    { canonical: "/requests/req-1", original: "/app/observe/requests/req-1", tag: "RequestDetail" },
    {
      canonical: "/router/decisions/dec-1",
      original: "/app/router/decisions/dec-1",
      tag: "RouterDecisionDetail",
    },
    {
      canonical: "/system/benchmark",
      original: "/app/models/benchmark",
      tag: "Benchmark",
    },
    { canonical: "/control/endpoints", original: "/app/connect", tag: "Endpoints" },
    { canonical: "/studio?tab=chat", original: "/app/studio/chat", tag: "Studio" },
    { canonical: "/studio?tab=images", original: "/app/studio/images", tag: "Studio" },
    { canonical: "/studio?tab=audio", original: "/app/studio/audio", tag: "Studio" },
    { canonical: "/studio?tab=rerank", original: "/app/studio/rerank", tag: "Studio" },
    { canonical: "/studio?tab=advanced", original: "/app/studio/advanced", tag: "Studio" },
  ];

  for (const entry of supported) {
    it(`resolves ${entry.original} to ${entry.tag} at ${entry.canonical}`, async () => {
      const module = await legacy();
      expect(module.legacyRedirectForUrl(urlOf(entry.original))?.href).toBe(entry.canonical);
      expect(routeFromUrl(urlOf(entry.original))._tag).toBe(entry.tag);
    });
  }

  it("preserves an original query string across the redirect", async () => {
    const module = await legacy();
    expect(
      module.legacyRedirectForUrl(urlOf("/app/observe/requests?status=error"))?.href,
    ).toBe("/requests?status=error");
    expect(
      module.legacyRedirectForUrl(urlOf("/app/observe/requests/req-7?window=3600000"))?.href,
    ).toBe("/requests/req-7?window=3600000");
  });

  it("sends both original runtime surfaces through the one implemented Runtime route", async () => {
    const module = await legacy();
    expect(module.legacyRedirectForUrl(urlOf("/app/system/runtime"))?.href).toBe("/runtime");
    expect(module.legacyRedirectForUrl(urlOf("/app/system/runtime-config"))?.href).toBe("/runtime");
  });
});

describe("S269 explicit missing original targets", () => {
  it("lists every unimplemented original feature target explicitly", async () => {
    const module = await legacy();
    expect([...module.MISSING_ORIGINAL_TARGETS].map((entry) => entry.path).sort()).toEqual(
      [...MISSING_PATHS].sort(),
    );
  });

  it("leaves each missing target NotFound with no redirect to a generic success page", async () => {
    const module = await legacy();
    for (const path of MISSING_PATHS) {
      expect(routeFromUrl(urlOf(path)), path).toMatchObject({ _tag: "NotFound", path });
      expect(module.legacyRedirectForUrl(urlOf(path)), path).toBeUndefined();
    }
  });
});

describe("S269 redirect/route inventory", () => {
  it("reconciles the 20 redirect route entries with the 22 legacy map strings", async () => {
    const module = await legacy();
    expect([...module.LEGACY_REDIRECT_ROUTE_ENTRIES]).toEqual([...REDIRECT_ROUTE_ENTRIES]);
    const mapKeys = Object.keys(module.LEGACY_REDIRECT_MAP);
    expect(mapKeys).toHaveLength(22);
    const mapOnly = mapKeys.filter((path) => !REDIRECT_ROUTE_ENTRIES.includes(path));
    expect(mapOnly).toEqual(["/app/local/models", "/app/router/config"]);
    const mapKeySet = new Set(mapKeys);
    expect(REDIRECT_ROUTE_ENTRIES.filter((path) => !mapKeySet.has(path))).toEqual([]);
  });

  it("classifies every redirect entry against an actual implemented target", async () => {
    const module = await legacy();
    const unresolvable = REDIRECT_ROUTE_ENTRIES.filter(
      (path) => module.legacyRedirectForUrl(urlOf(path)) === undefined,
    );
    expect(unresolvable).toEqual([]);
  });
});

describe("S269 original redirect entries: 20 resolvable targets", () => {
  const resolvable = [
    { href: "/local/llama-swap/policy", original: "/app/local/policy", tag: "LocalPolicy" },
    { href: "/local/llama-swap/models?view=grid", original: "/app/local/matrix", tag: "LocalLlamaSwapModels" },
    { href: "/local/swap", original: "/app/local/swap", tag: "LocalSwap" },
    { href: "/local/logs", original: "/app/local/logs", tag: "LocalLogs" },
    { href: "/local/peers", original: "/app/local/peers", tag: "LocalPeers" },
    { href: "/control/providers", original: "/app/control/providers", tag: "Providers" },
    { href: "/runtime", original: "/app/control/runtime-config", tag: "Runtime" },
    {
      href: "/control/controller",
      original: "/app/control/controller",
      tag: "ControlController",
    },
    { href: "/control/endpoints", original: "/app/endpoints", tag: "Endpoints" },
    { href: "/control/endpoints", original: "/app/control/endpoints", tag: "Endpoints" },
    { href: "/system/benchmark", original: "/app/control/benchmark", tag: "Benchmark" },
    { href: "/models", original: "/app/control/models", tag: "Models" },
    { href: "/models/roles", original: "/app/control/roles", tag: "ModelsRoles" },
    { href: "/router/strategy", original: "/app/control/routing-strategy", tag: "RouterStrategy" },
    { href: "/requests", original: "/app/observe", tag: "Requests" },
    {
      href: "/integrations/downstream",
      original: "/app/endpoints/downstream",
      tag: "IntegrationsDownstream",
    },
    {
      href: "/integrations/downstream",
      original: "/app/integrations/downstream",
      tag: "IntegrationsDownstream",
    },
    {
      href: "/integrations/upstream",
      original: "/app/endpoints/upstream",
      tag: "IntegrationsUpstream",
    },
    {
      href: "/integrations/upstream",
      original: "/app/integrations/upstream",
      tag: "IntegrationsUpstream",
    },
    {
      href: "/session-readiness",
      original: "/app/control/session-readiness",
      tag: "SessionReadiness",
    },
  ] as const;

  const unresolvable: readonly string[] = [];

  it("pins exactly the 20 resolvable redirect route entries", () => {
    expect(resolvable).toHaveLength(20);
    expect(unresolvable).toHaveLength(0);
    expect([...resolvable.map((entry) => entry.original), ...unresolvable].sort()).toEqual(
      [...REDIRECT_ROUTE_ENTRIES].sort(),
    );
  });

  for (const entry of resolvable) {
    it(`redirects ${entry.original} to ${entry.href} as ${entry.tag} with a replace Command`, async () => {
      const module = await legacy();
      expect(module.legacyRedirectForUrl(urlOf(entry.original))?.href).toBe(entry.href);
      const result = shellUpdate(
        shellModel(),
        Message.ChangedUrl({ url: urlOf(entry.original) }),
      );
      expect(result.model.route._tag).toBe(entry.tag);
      expect(replaceCommand(result)?.args?.href).toBe(entry.href);
      expect(commandNames(result).filter((name) => name === "ReplaceLegacyUrl")).toHaveLength(1);
    });
  }

  for (const path of unresolvable) {
    it(`keeps the missing redirect entry ${path} NotFound without a replace Command`, async () => {
      const module = await legacy();
      expect(module.legacyRedirectForUrl(urlOf(path))).toBeUndefined();
      const result = shellUpdate(shellModel(), Message.ChangedUrl({ url: urlOf(path) }));
      expect(result.model.route).toMatchObject({ _tag: "NotFound", path });
      expect(commandNames(result)).not.toContain("ReplaceLegacyUrl");
      expect(readCommands(result)).toHaveLength(0);
    });
  }
});

describe("S269 53-pattern partition", () => {
  it("partitions 52 supported original paths + / into the 53 original patterns", async () => {
    const module = await legacy();
    const supported = module.SUPPORTED_ORIGINAL_PATHS;
    expect(supported).toHaveLength(52);
    expect(supported.filter((path) => !path.includes(":requestId"))).toHaveLength(50);
    expect(supported.filter((path) => path.includes(":requestId"))).toEqual([
      "/app/observe/requests/:requestId",
      "/app/router/decisions/:requestId",
    ]);
    expect(module.MISSING_ORIGINAL_TARGETS).toHaveLength(0);
    const partition = new Set([
      ...supported,
      "/",
      ...module.MISSING_ORIGINAL_TARGETS.map((entry) => entry.path),
    ]);
    expect(partition.size).toBe(53);
    for (const entry of module.MISSING_ORIGINAL_TARGETS) {
      expect(supported).not.toContain(entry.path);
      expect(module.legacyRedirectForUrl(urlOf(entry.path))).toBeUndefined();
    }
  });
});

describe("S269 redirect Commands and exactly-once reads", () => {
  it("emits one route read and one replace Command for a legacy list URL", () => {
    const result = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests") }),
    );
    expect(result.model.route).toMatchObject({ _tag: "Requests" });
    expect(result.model.pendingRedirectHref).toBe("/requests");
    expect(readCommands(result)).toHaveLength(1);
    expect(commandNames(result).filter((name) => name === "ReplaceLegacyUrl")).toHaveLength(1);
    expect(replaceCommand(result)?.args?.href).toBe("/requests");
  });

  it("consumes exactly one pending replace echo, then reads a genuine same-route navigation", () => {
    const first = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests") }),
    );
    const echo = shellUpdate(
      first.model,
      Message.ChangedUrl({ url: urlOf("/requests") }),
    );
    // The command's own urlchange echo is consumed without a second read.
    expect(first.model.pendingRedirectHref).toBe("/requests");
    expect(echo.commands ?? []).toHaveLength(0);
    expect(echo.model.pendingRedirectHref).toBeUndefined();
    expect(echo.model.refresh.resyncToken).toBe(first.model.refresh.resyncToken);

    // A genuine navigation to the same canonical URL after the echo is baseline behaviour:
    // one read, refresh reset, resync token bump and a scroll.
    const genuine = shellUpdate(
      echo.model,
      Message.ChangedUrl({ url: urlOf("/requests") }),
    );
    expect(readCommands(genuine)).toHaveLength(1);
    expect(commandNames(genuine)).toContain("ScrollShellToTop");
    expect(genuine.model.refresh.message).toBeUndefined();
    expect(genuine.model.refresh.status).toBe("idle");
    expect(genuine.model.refresh.resyncToken).toBe(echo.model.refresh.resyncToken + 1);
  });

  it("does not suppress a same-route navigation whose query changed", () => {
    const first = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests?status=error") }),
    );
    const echo = shellUpdate(
      first.model,
      Message.ChangedUrl({ url: urlOf("/requests?status=error") }),
    );
    expect(echo.commands ?? []).toHaveLength(0);

    const changed = shellUpdate(
      echo.model,
      Message.ChangedUrl({ url: urlOf("/requests?status=ok") }),
    );
    expect(readCommands(changed)).toHaveLength(1);

    const repeated = shellUpdate(
      changed.model,
      Message.ChangedUrl({ url: urlOf("/requests?status=error") }),
    );
    expect(readCommands(repeated)).toHaveLength(1);
  });

  it("does not let a stale detail redirect echo suppress a different detail instance", () => {
    const first = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests/req-1") }),
    );
    const echo = shellUpdate(
      first.model,
      Message.ChangedUrl({ url: urlOf("/requests/req-1") }),
    );
    expect(echo.commands ?? []).toHaveLength(0);

    const other = shellUpdate(
      echo.model,
      Message.ChangedUrl({ url: urlOf("/requests/req-2") }),
    );
    expect(readCommands(other)[0]?.args?.id).toBe("req-2");

    const original = shellUpdate(
      other.model,
      Message.ChangedUrl({ url: urlOf("/requests/req-1") }),
    );
    expect(readCommands(original)[0]?.args?.id).toBe("req-1");
  });

  it("reads repeated diagnostics navigation for the same and a different id", () => {
    const first = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/diagnostics/42") }),
    );
    expect(diagnosticsReadCommands(first)).toHaveLength(1);

    const other = shellUpdate(
      first.model,
      Message.ChangedUrl({ url: urlOf("/diagnostics/7") }),
    );
    expect(diagnosticsReadCommands(other)).toHaveLength(1);

    const repeated = shellUpdate(
      other.model,
      Message.ChangedUrl({ url: urlOf("/diagnostics/7") }),
    );
    expect(diagnosticsReadCommands(repeated)).toHaveLength(1);
  });

  it("clears a pending echo when a real navigation intervenes, then reads the late echo", () => {
    const first = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests") }),
    );
    const interleaved = shellUpdate(
      first.model,
      Message.ChangedUrl({ url: urlOf("/models") }),
    );
    expect(interleaved.model.route).toMatchObject({ _tag: "Models" });
    expect(interleaved.model.pendingRedirectHref).toBeUndefined();
    expect(readCommands(interleaved)).toHaveLength(1);

    const lateEcho = shellUpdate(
      interleaved.model,
      Message.ChangedUrl({ url: urlOf("/requests") }),
    );
    expect(lateEcho.model.route).toMatchObject({ _tag: "Requests" });
    expect(readCommands(lateEcho)).toHaveLength(1);
  });

  it("does not silently drop a genuine navigation that matches the pending echo", () => {
    const first = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests") }),
    );
    // Only one URL change can be distinguished as the echo; the first exact match is consumed.
    const ambiguous = shellUpdate(
      first.model,
      Message.ChangedUrl({ url: urlOf("/requests") }),
    );
    expect(ambiguous.commands ?? []).toHaveLength(0);
    // The real echo therefore becomes a genuine navigation: the read is delayed, not dropped.
    const realEcho = shellUpdate(
      ambiguous.model,
      Message.ChangedUrl({ url: urlOf("/requests") }),
    );
    expect(readCommands(realEcho)).toHaveLength(1);
  });

  it("resets the Studio tab to chat when navigating from a tabbed URL to the bare /studio alias", () => {
    const initial = shellModel({ route: { _tag: "Studio" }, studio: studioIdle("images") });
    const result = shellUpdate(initial, Message.ChangedUrl({ url: urlOf("/studio") }));
    expect(result.model.studio?.tab).toBe("chat");
    expect(readCommands(result)).toHaveLength(1);
    expect(result.model.refresh.resyncToken).toBe(initial.refresh.resyncToken + 1);
  });

  it("reads and reselects the tab for a genuine same-route Studio tab change", () => {
    const initial = shellModel({ route: { _tag: "Studio" }, studio: studioIdle("images") });
    const result = shellUpdate(initial, Message.ChangedUrl({ url: urlOf("/studio?tab=audio") }));
    expect(result.model.studio?.tab).toBe("audio");
    expect(readCommands(result)).toHaveLength(1);
  });

  it("does not emit a replace Command for an already-canonical bare URL", () => {
    const result = shellUpdate(shellModel(), Message.ChangedUrl({ url: urlOf("/requests") }));
    expect(commandNames(result)).not.toContain("ReplaceLegacyUrl");
    expect(readCommands(result)).toHaveLength(1);
  });

  it("preserves the detail ID in both the read and the replace target", () => {
    const result = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/observe/requests/req-7?window=3600000") }),
    );
    expect(result.model.route).toMatchObject({ _tag: "RequestDetail", requestId: "req-7" });
    expect(replaceCommand(result)?.args?.href).toBe("/requests/req-7?window=3600000");
    expect(readCommands(result)[0]?.args?.id).toBe("req-7");
  });
});

describe("S269 initial load", () => {
  it("sets the Studio tab from the original URL and emits the replace Command", () => {
    const result = shellApp().init(urlOf("/app/studio/audio"));
    expect(result.model.route).toMatchObject({ _tag: "Studio" });
    expect(result.model.studio?.tab).toBe("audio");
    expect(commandNames(result)).toContain("ReplaceLegacyUrl");
    expect(readCommands(result)).toHaveLength(1);
    expect(replaceCommand(result)?.args?.href).toBe("/studio?tab=audio");
  });

  it("emits no replace Command when the initial URL is already canonical", () => {
    const result = shellApp().init(urlOf("/studio?tab=images"));
    expect(result.model.route).toMatchObject({ _tag: "Studio" });
    expect(result.model.studio?.tab).toBe("images");
    expect(commandNames(result)).not.toContain("ReplaceLegacyUrl");
  });
});
