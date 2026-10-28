import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

/**
 * S269 (R11): real mounted browser-history proof for the original `/app/*` URLs.
 *
 * Every mount goes through makeApplication/embed with its real popstate/link-click/
 * `foldkit:urlchange` listeners. The redirect itself is the production Navigation.replaceUrl
 * Command, so happy-dom receives the same history.replaceState + urlchange path a browser does.
 * The fetch stub is a typed readback client, not a route stub.
 */

const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 5000,
): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) return last;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last: ${String(last)}) | url: ${window.location.pathname}${window.location.search} | body: ${document.body.textContent?.slice(0, 600) ?? ""}`,
  );
};

interface FetchCall {
  readonly path: string;
  readonly search: string;
}

type JsonValue =
  | boolean
  | number
  | string
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const calls: FetchCall[] = [];

const json = (body: JsonValue, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const bodyFor = (pathname: string): Response => {
  if (pathname === "/api/role-model/telemetry/requests") {
    return json({
      requests: [
        { endpointId: "e-legacy", modelId: "m-legacy", requestId: "r-legacy", status: 200 },
      ],
    });
  }
  if (pathname === "/api/role-model/requests/req-9") {
    return json({
      endpointId: "e-detail",
      requestId: "req-9",
      routingDecisionId: "dec-9",
      statusFamily: "success",
    });
  }
  if (pathname === "/api/role-model/runtime/config") return json({ config: { sample: true } });
  return json({});
};

const fetchImpl: typeof fetch = async (input) => {
  const url = new URL(String(input), "http://localhost");
  calls.push({ path: url.pathname, search: url.search });
  return bodyFor(url.pathname);
};

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> =
  [];

const mountHere = () => {
  const container = document.createElement("div");
  container.id = "s269-redirect-scene";
  document.body.append(container);
  const handle = mountShell(container, { readbackFetchImpl: fetchImpl });
  mounted.push({ container, handle });
};

const mountAt = (path: string) => {
  window.history.replaceState({}, "", path);
  mountHere();
};

const countPath = (pathname: string): number =>
  calls.filter((call) => call.path === pathname).length;

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  calls.splice(0);
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("S269 mounted legacy redirects", () => {
  it("replaces a legacy request-list URL with /requests and reads it exactly once", async () => {
    const historyLength = window.history.length;
    mountAt("/app/observe/requests");

    const page = await waitFor(
      () =>
        document.querySelector(
          "[data-readback-route='requests'][data-readback-state='ok']",
        ) ?? undefined,
      "the canonical requests readback",
    );

    expect(page.textContent).toContain("m-legacy");
    expect(window.location.pathname).toBe("/requests");
    expect(window.location.search).toBe("");
    expect(window.history.length).toBe(historyLength);
    expect(document.title).toBe("Requests | RM3 Foldkit shell");
    expect(
      document.querySelector("[data-shell-route]")?.getAttribute("data-shell-route"),
    ).toBe("Requests");
    expect(countPath("/api/role-model/telemetry/requests")).toBe(1);
  });

  it("replaces a legacy redirect-map entry through history and reads it exactly once", async () => {
    const historyLength = window.history.length;
    mountAt("/app/observe");

    const page = await waitFor(
      () =>
        document.querySelector(
          "[data-readback-route='requests'][data-readback-state='ok']",
        ) ?? undefined,
      "the canonical requests readback from the legacy map entry",
    );

    expect(page.textContent).toContain("m-legacy");
    expect(window.location.pathname).toBe("/requests");
    expect(window.history.length).toBe(historyLength);
    expect(countPath("/api/role-model/telemetry/requests")).toBe(1);
  });

  it("keeps a legacy detail ID and query through the canonical detail route", async () => {
    mountAt("/app/observe/requests/req-9?window=3600000");

    const page = await waitFor(
      () =>
        document.querySelector(
          "[data-readback-route='requestDetail'][data-readback-state='ok']",
        ) ?? undefined,
      "the canonical request-detail readback",
    );

    expect(page.textContent).toContain("req-9");
    expect(window.location.pathname).toBe("/requests/req-9");
    expect(window.location.search).toBe("?window=3600000");
    expect(document.title).toBe("Request req-9 | RM3 Foldkit shell");
    expect(countPath("/api/role-model/requests/req-9")).toBe(1);
  });

  it("selects the original Studio tab from the URL and canonicalises it as a query alias", async () => {
    mountAt("/app/studio/images");

    await waitFor(
      () => document.querySelector("[data-route='studio']") ?? undefined,
      "the studio route",
    );
    await waitFor(
      () => (window.location.pathname === "/studio" ? true : undefined),
      "the canonical studio URL",
    );

    expect(window.location.search).toBe("?tab=images");
    expect(
      document.querySelector("[role='tab'][aria-selected='true']")?.getAttribute(
        "data-studio-tab",
      ),
    ).toBe("images");
    expect(document.querySelector("[role='tabpanel']")?.getAttribute("aria-label")).toBe(
      "images",
    );
    expect(document.title).toBe("Studio | RM3 Foldkit shell");
  });

  it("routes the legacy runtime surfaces to the implemented /runtime page", async () => {
    mountAt("/app/system/runtime-config");

    const page = await waitFor(
      () => document.querySelector("[data-route='runtime-config']") ?? undefined,
      "the runtime config route",
    );

    expect(page).toBeDefined();
    expect(window.location.pathname).toBe("/runtime");
    expect(document.title).toBe("Runtime | RM3 Foldkit shell");
    expect(countPath("/api/role-model/runtime/config")).toBe(1);
  });

  it("preserves browser back/forward across the replace without a NotFound flash", async () => {
    window.history.replaceState({}, "", "/");
    window.history.pushState({}, "", "/app/observe/requests");
    mountHere();

    await waitFor(
      () => (window.location.pathname === "/requests" ? true : undefined),
      "the canonical requests URL",
    );

    history.back();
    await waitFor(
      () =>
        window.location.pathname === "/" &&
        document.querySelector("h1")?.textContent === "Runtime overview"
          ? true
          : undefined,
      "the index entry after back",
    );
    expect(document.querySelector("[data-route='not-found']")).toBeNull();

    history.forward();
    await waitFor(
      () =>
        window.location.pathname === "/requests" &&
        document.title === "Requests | RM3 Foldkit shell"
          ? true
          : undefined,
      "the replaced requests entry after forward",
    );
    expect(document.querySelector("[data-route='not-found']")).toBeNull();
  });

  it("redirects an in-app URL change, not only the initial load", async () => {
    mountAt("/models");
    await waitFor(
      () => document.querySelector("[data-route='models']") ?? undefined,
      "the models route",
    );
    expect(window.location.pathname).toBe("/models");

    window.history.pushState({}, "", "/app/observe/requests");
    window.dispatchEvent(new CustomEvent("foldkit:urlchange"));

    await waitFor(
      () => (window.location.pathname === "/requests" ? true : undefined),
      "the canonical requests URL after an in-app change",
    );
    await waitFor(
      () =>
        document.querySelector(
          "[data-readback-route='requests'][data-readback-state='ok']",
        ) ?? undefined,
      "the requests readback after an in-app change",
    );
    expect(countPath("/api/role-model/telemetry/requests")).toBe(1);
  });

  it("leaves a missing original feature target NotFound instead of redirecting to a generic page", async () => {
    mountAt("/app/local/llama-swap/models");

    const page = await waitFor(
      () => document.querySelector("[data-route='not-found']") ?? undefined,
      "the explicit not-found state",
    );

    expect(window.location.pathname).toBe("/app/local/llama-swap/models");
    expect(page.textContent).toContain("Not found: /app/local/llama-swap/models");
    expect(document.querySelector("[data-route='learning']")).toBeNull();
    expect(countPath("/api/role-model/operator/learning")).toBe(0);
  });

  it("keeps a bare canonical URL untouched and reads it once", async () => {
    mountAt("/requests");

    await waitFor(
      () =>
        document.querySelector(
          "[data-readback-route='requests'][data-readback-state='ok']",
        ) ?? undefined,
      "the bare requests readback",
    );

    expect(window.location.pathname).toBe("/requests");
    expect(countPath("/api/role-model/telemetry/requests")).toBe(1);
  });

  it("reads again for a genuine same-route navigation after the initial read", async () => {
    mountAt("/requests");

    await waitFor(
      () =>
        document.querySelector(
          "[data-readback-route='requests'][data-readback-state='ok']",
        ) ?? undefined,
      "the initial requests readback",
    );
    expect(countPath("/api/role-model/telemetry/requests")).toBe(1);

    window.history.pushState({}, "", "/requests");
    window.dispatchEvent(new CustomEvent("foldkit:urlchange"));

    await waitFor(
      () => (countPath("/api/role-model/telemetry/requests") >= 2 ? true : undefined),
      "the second requests read for a genuine same-route navigation",
    );
  });
});
