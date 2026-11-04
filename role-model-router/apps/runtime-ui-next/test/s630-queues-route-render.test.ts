import { Option } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Url } from "@role-model-router/foldkit";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";
import { routeFromUrl } from "../src/route";

/**
 * S630: /observe/queues must render the Queues page in place, not redirect to Overview.
 * Regression for the observed "location '/', title Overview" redirect.
 */

const waitFor = async (read: () => boolean, label: string, timeoutMs = 8000): Promise<void> => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " at " + window.location.pathname + " | title " + document.title + " | body " + (document.body.textContent ?? "").slice(0, 500));
};

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> = [];
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

const urlOf = (href: string) => Option.getOrThrow(Url.fromString("http://localhost" + href));

describe("S630 /observe/queues route", () => {
  it("parses the canonical and variant URLs as the Queues route", () => {
    for (const href of ["/observe/queues", "/observe/queues/", "/observe/queues?windowMs=3600000", "/observe/queues#top"]) {
      expect(routeFromUrl(urlOf(href))._tag).toBe("Queues");
    }
  });

  it("mounts at /observe/queues and renders the Queues page without redirecting to Overview", async () => {
    window.history.replaceState({}, "", "/observe/queues");
    const container = document.createElement("div");
    container.id = "s630-queues";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackReaders: createReadbackClients({
        fetchImpl: async (input) => {
          const url = String(input);
          return json(url.includes("/api/role-model/operator/queues")
            ? { available: true, queues: [{ active: 0, failed: 0, name: "replay", waiting: 0 }] }
            : {});
        },
      }),
    });
    mounted.push({ container, handle });
    await waitFor(() => document.body.textContent?.includes("Queue truth from the shared store") === true, "Queues page copy");
    expect(window.location.pathname).toBe("/observe/queues");
    expect(document.title).toBe("Queues | RM3 Foldkit shell");
    expect(document.body.textContent).toContain("Queue truth from the shared store");
    expect(document.body.textContent).toContain("Queues");
    expect(document.body.textContent).not.toContain("Runtime overview");
  });
});
