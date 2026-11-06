import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/session-readiness");
  const container = document.createElement("div");
  container.id = "s590-session-readiness";
  document.body.append(container);
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }) });
  mounted.push({ container, handle });
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

const waitFor = async (read: () => string | null, label: string): Promise<string> => {
  const end = Date.now() + 8000;
  let last: string | null = null;
  while (Date.now() < end) {
    last = read();
    if (last !== null && last !== "loading" && last !== "idle") return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last: ${String(last)}) | body: ${(document.body.textContent ?? "").slice(0, 900)}`,
  );
};

const health = (): string | null =>
  document.querySelector("[data-session-host-health]")?.textContent ?? null;
const bootstrap = (): string | null =>
  document.querySelector("[data-session-bootstrap]")?.textContent ?? null;

describe("S590 honest SessionReadiness", () => {
  it("derives honest unavailable states from an empty operator status", async () => {
    mountAt(
      async () =>
        new Response(JSON.stringify({ items: [] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='session-readiness']")
            ?.getAttribute("data-readback-state") ?? null,
        "readiness state",
      ),
    ).toBe("empty");
    expect(bootstrap()).toBe("unavailable");
    expect(health()).toBe("unavailable");
    expect(document.querySelector("[data-session-authority]")?.textContent).toBe("unavailable");
  });

  it("reports failed health honestly on a read error", async () => {
    mountAt(
      async () =>
        new Response(JSON.stringify({ error: "down" }), {
          headers: { "content-type": "application/json" },
          status: 503,
        }),
    );
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='session-readiness']")
            ?.getAttribute("data-readback-state") ?? null,
        "readiness error",
      ),
    ).toBe("error");
    expect(health()).toBe("unavailable");
    expect(bootstrap()).toBe("failed");
    expect(document.body.textContent).toContain(
      "Operator intent manifest is unavailable for the current session state.",
    );
    expect(document.body.textContent).toContain(
      "Alias drift warnings are unavailable for the current session state.",
    );
  });

  it("reports unknown health when status is ok but no overall row exists", async () => {
    mountAt(
      async () =>
        new Response(JSON.stringify({ observedAt: "2026-10-31T00:00:00.000Z", overall: "" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='session-readiness']")
            ?.getAttribute("data-readback-state") ?? null,
        "readiness ok-no-overall",
      ),
    ).toBe("ok");
    expect(bootstrap()).toBe("complete");
    expect(health()).toBe("unknown");
  });

  it("derives values from ok operator status rows instead of hardcoding them", async () => {
    mountAt(
      async () =>
        new Response(
          JSON.stringify({
            observedAt: "2026-10-31T00:00:00.000Z",
            overall: "healthy",
            context: { channel: "development", scope: "standalone-runtime-dev" },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
    );
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='session-readiness']")
            ?.getAttribute("data-readback-state") ?? null,
        "readiness ok",
      ),
    ).toBe("ok");
    expect(bootstrap()).toBe("complete");
    expect(health()).toBe("healthy");
    expect(document.querySelector("[data-session-credentials]")?.textContent).toBe("unavailable");
  });
});
