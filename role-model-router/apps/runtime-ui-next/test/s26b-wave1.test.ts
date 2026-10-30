import { afterEach, describe, expect, it, vi } from "vitest";

import { mountShell } from "../src/mount";

/**
 * S26b (R13 wave 1): the four scaffolded shell entries are ports with maintained states:
 * layout/shell success, index success, not-found error and the shell's title/theme/focus/scroll
 * facts. Index/not-found are static routes, so empty/loading/error or empty/loading/success states
 * cannot exist; the tests below justify that by asserting the only real state each route has.
 */

const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 4000,
): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) return last;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last: ${String(last)}) | body: ${document.body.textContent?.slice(0, 600) ?? ""}`,
  );
};

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> =
  [];

const mountAt = (id: string, pathname: string, readbackFetchImpl?: typeof fetch) => {
  window.history.replaceState({}, "", pathname);
  localStorage.clear();
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, readbackFetchImpl === undefined ? {} : { readbackFetchImpl });
  mounted.push({ container, handle });
  return { container, handle };
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("S26b wave 1 shell entries", () => {
  it("layout is a persistent primary navigation and carries the active route", async () => {
    mountAt("s26b-layout", "/");
    await waitFor(
      () => document.querySelector("aside[data-shell-sidebar]") ?? undefined,
      "sidebar",
    );
    expect(document.querySelectorAll("aside[data-shell-sidebar]")).toHaveLength(1);
    expect(document.querySelectorAll('nav[aria-label="Primary navigation"]')).toHaveLength(1);
    expect(document.querySelector("a[data-nav='index']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    const sections = [...document.querySelectorAll("aside[data-shell-sidebar] a[data-nav]")];
    expect(sections.map((link) => link.textContent)).toEqual([
      "Overview", "Studio", "Local", "Remote", "Models", "Router", "Observe", "Connect", "System", "Learning",
    ]);

    const models = document.querySelector<HTMLAnchorElement>("a[data-nav='models']");
    expect(models).toBeDefined();
    models?.focus();
    models?.click();

    await waitFor(
      () => (document.querySelector("[data-shell-route='Models']") ? true : undefined),
      "the models route",
    );
    expect(document.querySelector("[data-shell-route='Models']")?.textContent).toBe("Configured models");
    expect(document.querySelectorAll("aside[data-shell-sidebar]")).toHaveLength(1);
    expect(document.querySelector("a[data-nav='models']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(document.querySelector("a[data-nav='index']")?.getAttribute("aria-current")).toBeNull();
    // No forced focus restoration: the activated navigation link keeps focus.
    expect(document.activeElement).toBe(models);
    expect(document.title).toBe("Models | RM3 Foldkit shell");
  });

  it("index is a real success landing with working onward navigation", async () => {
    mountAt("s26b-index", "/", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") {
        return new Response(JSON.stringify({ items: [{ id: 1, timestamp: "2026-01-01T00:00:00.000Z", duration_ms: 10, resp_status_code: 200, modelId: "model-a" }], window: { startAtMs: Date.parse("2026-01-01T00:00:00.000Z"), endAtMs: Date.parse("2026-01-02T00:00:00.000Z"), asOfMs: 0 } }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });
    const page = await waitFor(
      () => document.querySelector("[data-route='index'][data-overview-state='success']") ?? undefined,
      "index route",
    );
    expect(page.getAttribute("data-overview-state")).toBe("success");
    expect(document.querySelector("h1")?.textContent).toBe("Runtime overview");
    expect(document.body.textContent).toContain("Runtime overview");
    expect(page.textContent).toContain("Latency trend");
    expect(page.textContent).toContain("Success vs failure volume");
    await waitFor(() => document.querySelector("[data-window]") ?? undefined, "filter chips");
    expect(document.querySelectorAll("[data-window]")).toHaveLength(4);
    expect(document.title).toBe("Overview | RM3 Foldkit shell");
    expect(page.querySelector("[data-overview-state='empty']")).toBeNull();
    expect(page.querySelector("[data-overview-state='loading']")).toBeNull();
  });

  it("not-found is a terminal error state with recovery navigation", async () => {
    mountAt("s26b-not-found", "/does/not/exist");
    const page = await waitFor(
      () => document.querySelector("[data-route='not-found']") ?? undefined,
      "not-found route",
    );
    expect(page.getAttribute("data-state")).toBe("error");
    expect(page.getAttribute("role")).toBe("alert");
    expect(page.textContent).toContain("Not found: /does/not/exist");
    expect(page.querySelector<HTMLAnchorElement>("a[href='/']")?.textContent).toBe(
      "Back to overview",
    );
    expect(document.title).toBe("Not found: /does/not/exist | RM3 Foldkit shell");
    // Static error page: it has no loading or empty variant.
    expect(page.querySelector("[data-state='loading']")).toBeNull();
    expect(page.querySelector("[data-state='empty']")).toBeNull();
  });

  it("shell preserves theme, title, focus and scroll facts across navigation", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    try {
      mountAt("s26b-facts", "/");
      await waitFor(
        () => document.querySelector("aside[data-shell-sidebar]") ?? undefined,
        "shell",
      );
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      const toggle = await waitFor(
        () => document.querySelector<HTMLButtonElement>("[data-slot='role-model-theme-toggle']") ?? undefined,
        "theme toggle",
      );
      toggle.click();
      await waitFor(
        () => (document.documentElement.dataset.theme === "light" ? true : undefined),
        "theme applied",
      );
      expect(localStorage.getItem("role-model-runtime-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(toggle.getAttribute("aria-label")).toBe("Switch to dark mode");

      const models = document.querySelector<HTMLAnchorElement>("a[data-nav='models']");
      models?.focus();
      models?.click();
      await waitFor(
        () => (document.title.includes("Models") ? true : undefined),
        "title after navigation",
      );
      await waitFor(
        () => (scrollTo.mock.calls.length > 0 ? true : undefined),
        "scroll-to-top command",
      );
      expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
      expect(document.activeElement).toBe(models);
      expect(document.documentElement.dataset.theme).toBe("light");
    } finally {
      scrollTo.mockRestore();
    }
  });
});
