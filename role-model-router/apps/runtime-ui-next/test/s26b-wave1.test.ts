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

const mountAt = (id: string, pathname: string) => {
  window.history.replaceState({}, "", pathname);
  localStorage.clear();
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container);
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
    expect(document.querySelectorAll('[data-nav-state="pending"]').length).toBeGreaterThanOrEqual(
      9,
    );

    const diagnostics = document.querySelector<HTMLAnchorElement>("a[data-nav='diagnostics']");
    expect(diagnostics).toBeDefined();
    diagnostics?.focus();
    diagnostics?.click();

    await waitFor(
      () => (document.querySelector("[data-shell-route='Diagnostics']") ? true : undefined),
      "the diagnostics route",
    );
    expect(document.querySelectorAll("aside[data-shell-sidebar]")).toHaveLength(1);
    expect(document.querySelector("a[data-nav='diagnostics']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(document.querySelector("a[data-nav='index']")?.getAttribute("aria-current")).toBeNull();
    // No forced focus restoration: the activated navigation link keeps focus.
    expect(document.activeElement).toBe(diagnostics);
    expect(document.title).toBe("Diagnostics 42 | RM3 Foldkit shell");
  });

  it("index is a real success landing with working onward navigation", async () => {
    mountAt("s26b-index", "/");
    const page = await waitFor(
      () => document.querySelector("[data-route='index']") ?? undefined,
      "index route",
    );
    expect(page.getAttribute("data-state")).toBe("success");
    expect(page.querySelector("h1")?.textContent).toBe("Index page");
    expect(page.textContent).toContain("Runtime overview");
    expect(page.querySelector<HTMLAnchorElement>("a[href='/diagnostics/42']")?.textContent).toBe(
      "Open diagnostics",
    );
    expect(document.title).toBe("Overview | RM3 Foldkit shell");
    // Static route: no data source exists, so no empty/loading/error state is rendered.
    expect(page.querySelector("[data-state='empty']")).toBeNull();
    expect(page.querySelector("[data-state='loading']")).toBeNull();
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
        () => document.querySelector<HTMLButtonElement>("button.rm3-theme-toggle") ?? undefined,
        "theme toggle",
      );
      toggle.click();
      await waitFor(
        () => (document.documentElement.dataset.theme === "light" ? true : undefined),
        "theme applied",
      );
      expect(localStorage.getItem("role-model-runtime-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.body.textContent).toContain("Light shell");

      const diagnostics = document.querySelector<HTMLAnchorElement>("a[data-nav='diagnostics']");
      diagnostics?.focus();
      diagnostics?.click();
      await waitFor(
        () => (document.title.includes("Diagnostics 42") ? true : undefined),
        "title after navigation",
      );
      await waitFor(
        () => (scrollTo.mock.calls.length > 0 ? true : undefined),
        "scroll-to-top command",
      );
      expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
      expect(document.activeElement).toBe(diagnostics);
      expect(document.documentElement.dataset.theme).toBe("light");
    } finally {
      scrollTo.mockRestore();
    }
  });
});
