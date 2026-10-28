import { Option } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { Url } from "@role-model-router/foldkit";

import { mountShell } from "../src/mount";
import { Message } from "../src/message";
import { createReadbackClients } from "../src/readback";
import { routeFromUrl } from "../src/route";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S379c (R11/R13): the Learning family. Each of the five child URLs reads the SAME real operator
 * Learning endpoint the original React page used for that panel: policy (configuration), records
 * kind=pack (packs), decisions, measurement (evidence), history. No fabricated projections.
 */

const urlOf = (href: string) => Option.getOrThrow(Url.fromString(`http://localhost${href}`));
const legacy = () => import("../src/legacy-redirects");
const commandNames = (result: ReturnType<typeof shellUpdate>): readonly string[] =>
  (result.commands ?? []).map((command) => command.name);
const replaceCommand = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).find((command) => command.name === "ReplaceLegacyUrl");

const pageMounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (path: string, id: string, fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }) });
  pageMounted.push({ container, handle });
};
const waitForRouteState = async (routeName: string, expected: string, label: string): Promise<string> => {
  const end = Date.now() + 3000;
  let last: string | null = null;
  while (Date.now() < end) {
    last = document.querySelector("[data-route='" + routeName + "'][data-learning-family-state='" + expected + "']")?.getAttribute("data-learning-family-state") ?? null;
    if (last === expected) return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + " | path: " + window.location.pathname + ")");
};
afterEach(() => {
  for (const entry of pageMounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

describe("S379c Learning family canonical URLs", () => {
  it("parses the five canonical Learning child routes as typed routes", () => {
    expect(routeFromUrl(urlOf("/learning/configuration"))._tag).toBe("LearningConfiguration");
    expect(routeFromUrl(urlOf("/learning/packs"))._tag).toBe("LearningPacks");
    expect(routeFromUrl(urlOf("/learning/decisions"))._tag).toBe("LearningDecisions");
    expect(routeFromUrl(urlOf("/learning/evidence"))._tag).toBe("LearningEvidence");
    expect(routeFromUrl(urlOf("/learning/history"))._tag).toBe("LearningHistory");
  });

  it("canonicalises the original /app/learning/* URLs with query/hash and one replace Command", async () => {
    const module = await legacy();
    const expectations: ReadonlyArray<readonly [string, string, string]> = [
      ["/app/learning/configuration", "/learning/configuration", "LearningConfiguration"],
      ["/app/learning/packs", "/learning/packs", "LearningPacks"],
      ["/app/learning/decisions", "/learning/decisions", "LearningDecisions"],
      ["/app/learning/evidence", "/learning/evidence", "LearningEvidence"],
      ["/app/learning/history", "/learning/history", "LearningHistory"],
    ];
    for (const [original, href, tag] of expectations) {
      expect(module.legacyRedirectForUrl(urlOf(original))?.href).toBe(href);
      expect(routeFromUrl(urlOf(original))._tag).toBe(tag);
    }
    expect(module.legacyRedirectForUrl(urlOf("/app/learning/decisions?limit=50#top"))?.href).toBe(
      "/learning/decisions?limit=50#top",
    );
    const result = shellUpdate(shellModel(), Message.ChangedUrl({ url: urlOf("/app/learning/history") }));
    expect(result.model.route._tag).toBe("LearningHistory");
    expect(result.model.pendingRedirectHref).toBe("/learning/history");
    expect(commandNames(result).filter((name) => name === "ReplaceLegacyUrl")).toHaveLength(1);
  });

  it("keeps every current missing family explicit NotFound and never claims a landed learning family as missing", async () => {
    const module = await legacy();
    const paths = module.MISSING_ORIGINAL_TARGETS.map((entry) => entry.path);
    for (const landed of [
      "/app/learning/configuration",
      "/app/learning/packs",
      "/app/learning/decisions",
      "/app/learning/evidence",
      "/app/learning/history",
    ]) {
      expect(paths).not.toContain(landed);
    }
    for (const entry of module.MISSING_ORIGINAL_TARGETS) {
      expect(routeFromUrl(urlOf(entry.path)), entry.path).toMatchObject({ _tag: "NotFound" });
    }
  });

  it("leaves the requestId families unchanged", () => {
    expect(routeFromUrl(urlOf("/requests/req-5"))).toMatchObject({ _tag: "RequestDetail", requestId: "req-5" });
    expect(routeFromUrl(urlOf("/router/decisions/req-5"))).toMatchObject({ _tag: "RouterDecisionDetail", requestId: "req-5" });
  });
});

describe("S379c Learning family pages (real per-panel readbacks)", () => {
  const body = { items: [{ id: "row-1", label: "First row", value: "ready" }] };
  const json = () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });

  it("renders loading then ok on the decisions panel", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    mountAt("/learning/decisions", "s386-decisions", async () => { await gate; return json(); });
    expect(await waitForRouteState("learning-decisions", "loading", "decisions loading")).toBe("loading");
    release?.();
    expect(await waitForRouteState("learning-decisions", "ok", "decisions ok")).toBe("ok");
    expect(document.querySelector("[data-route='learning-decisions']")?.textContent).toContain("First row");
  });

  it("renders error honestly when a panel readback fails", async () => {
    mountAt("/learning/decisions", "s386-error", async () => new Response("null", { headers: { "content-type": "application/json" }, status: 200 }));
    expect(await waitForRouteState("learning-decisions", "error", "decisions error")).toBe("error");
    expect(document.querySelector("[data-route='learning-decisions']")?.textContent).toMatch(/read failed/i);
  });

  it("renders the history panel from its own readback", async () => {
    mountAt("/learning/history", "s386-history", async () => json());
    expect(await waitForRouteState("learning-history", "ok", "history ok")).toBe("ok");
    expect(document.querySelector("[data-route='learning-history']")?.textContent).toContain("First row");
  });
});
